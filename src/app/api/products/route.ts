import { authorizeApi } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adInsights, productKpiVersions, products } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { parseKpiInput, isValidDate } from "@/lib/kpi-validation";
import { getTodayIso } from "@/lib/format";
import { computeProductKpis, evaluateBudgetPacing, resolveKpiForDate } from "@/lib/kpi";

export async function GET() {
  const denied = await authorizeApi("operator");
  if (denied) return denied;
  try {
    await ensureSeeded();
    const today = getTodayIso();

    const [allProducts, allVersions, todayInsights] = await Promise.all([
      db.select().from(products).orderBy(asc(products.code)),
      db
        .select()
        .from(productKpiVersions)
        .orderBy(desc(productKpiVersions.effectiveFrom), desc(productKpiVersions.versionNumber)),
      db.select().from(adInsights).where(eq(adInsights.reportDate, today)),
    ]);

    const spendTodayByCode = new Map<string, number>();
    for (const row of todayInsights) {
      spendTodayByCode.set(
        row.productCode,
        (spendTodayByCode.get(row.productCode) ?? 0) + row.spend
      );
    }

    const enriched = allProducts.map((p) => {
      const versions = allVersions.filter((v) => v.productId === p.id);
      const currentKpi = resolveKpiForDate(versions, today);
      const todaySpend = spendTodayByCode.get(p.code) ?? 0;
      const pacing = evaluateBudgetPacing(todaySpend, p.dailyBudgetTarget);

      return {
        ...p,
        currentKpi,
        kpiVersions: versions,
        pacing,
      };
    });

    return NextResponse.json({ products: enriched });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: "Lỗi tải danh mục sản phẩm." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await authorizeApi("operator", true);
  if (denied) return denied;
  try {
    await ensureSeeded();
    const body = await req.json();

    const code = String(body.code || "").trim().toUpperCase();
    const name = String(body.name || "").trim();
    if (!code || !name) {
      return NextResponse.json(
        { error: "Mã sản phẩm và Tên sản phẩm là bắt buộc." },
        { status: 400 }
      );
    }

    const effectiveFrom = String(body.effectiveFrom || getTodayIso());
    const input = parseKpiInput(body);
    if (!input || !isValidDate(effectiveFrom)) return NextResponse.json({ error: "Thông số KPI hoặc ngày hiệu lực không hợp lệ." }, { status: 400 });
    const computed = computeProductKpis(input);
    const budget = (value: unknown, fallback: number) => value == null ? fallback : Number(value);
    const dailyBudgetTarget = budget(body.dailyBudgetTarget, 3000000);
    const weeklyBudgetTarget = budget(body.weeklyBudgetTarget, dailyBudgetTarget * 7);
    const monthlyBudgetTarget = budget(body.monthlyBudgetTarget, dailyBudgetTarget * 30);
    if ([dailyBudgetTarget, weeklyBudgetTarget, monthlyBudgetTarget].some(n => !Number.isSafeInteger(n) || n < 0 || n > 1_000_000_000_000)) return NextResponse.json({ error: "Ngân sách không hợp lệ." }, { status: 400 });

    // Create the product and its initial KPI version atomically.
    const { createdProduct, createdVersion } = await db.transaction(async (tx) => {
      const [createdProduct] = await tx
        .insert(products)
        .values({
          code,
          name,
          category: String(body.category || "Sản phẩm mới"),
          status: "active",
          dailyBudgetTarget,
          weeklyBudgetTarget,
          monthlyBudgetTarget,
        })
        .returning();

      const [createdVersion] = await tx
        .insert(productKpiVersions)
        .values({
          productId: createdProduct.id,
          versionNumber: 1,
          effectiveFrom,
          ...input,
          breakevenCpo: computed.breakevenCpo,
          targetCpo: computed.targetCpo,
          ceilingMessageCost: computed.ceilingMessageCost,
          note: String(body.note || "Khởi tạo hồ sơ KPI v1"),
        })
        .returning();

      return { createdProduct, createdVersion };
    });

    return NextResponse.json({
      product: createdProduct,
      kpiVersion: createdVersion,
    });
  } catch (err) {
    console.error("POST /api/products error:", err);
    return NextResponse.json(
      { error: "Không thể tạo sản phẩm (kiểm tra trùng Mã sản phẩm)." },
      { status: 500 }
    );
  }
}
