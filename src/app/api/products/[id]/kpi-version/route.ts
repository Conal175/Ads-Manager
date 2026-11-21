import { authorizeApi } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productKpiVersions, products } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { computeProductKpis } from "@/lib/kpi";
import { parseKpiInput, isValidDate } from "@/lib/kpi-validation";
import { getTodayIso } from "@/lib/format";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await authorizeApi("operator", true);
  if (denied) return denied;
  try {
    await ensureSeeded();
    const { id } = await context.params;
    const productId = Number(id);
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      return NextResponse.json({ error: "ID sản phẩm không hợp lệ." }, { status: 400 });
    }

    const body = await req.json();
    const effectiveFrom = String(body.effectiveFrom || getTodayIso());
    const input = parseKpiInput(body);
    if (!input || !isValidDate(effectiveFrom)) return NextResponse.json({ error: "Thông số KPI hoặc ngày hiệu lực không hợp lệ." }, { status: 400 });
    const computed = computeProductKpis(input);
    // Serialize version allocation per product without locking unrelated products.
    const result = await db.transaction(async (tx) => {
      const found = await tx.select({ id: products.id }).from(products).where(eq(products.id, productId)).for("update");
      if (!found.length) return null;
      const existingVersions = await tx.select({ versionNumber: productKpiVersions.versionNumber }).from(productKpiVersions).where(eq(productKpiVersions.productId, productId)).orderBy(desc(productKpiVersions.versionNumber)).limit(1);
      const nextVersionNumber = (existingVersions[0]?.versionNumber ?? 0) + 1;
      const [created] = await tx.insert(productKpiVersions).values({
        productId, versionNumber: nextVersionNumber, effectiveFrom, ...input,
        breakevenCpo: computed.breakevenCpo, targetCpo: computed.targetCpo,
        ceilingMessageCost: computed.ceilingMessageCost,
        note: String(body.note || `Cập nhật cấu trúc KPI phiên bản v${nextVersionNumber}`),
      }).returning();
      return { created, nextVersionNumber };
    });
    if (!result) return NextResponse.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });
    const { created, nextVersionNumber } = result;
    return NextResponse.json({
      kpiVersion: created,
      message: `Đã lưu phiên bản KPI v${nextVersionNumber} có hiệu lực từ ${effectiveFrom} (không ghi đè lịch sử cũ).`,
    });
  } catch (err) {
    console.error("POST /api/products/[id]/kpi-version error:", err);
    return NextResponse.json(
      { error: "Không thể lưu phiên bản KPI mới." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await authorizeApi("operator", true);
  if (denied) return denied;
  try {
    await ensureSeeded();
    const { id } = await context.params;
    const productId = Number(id);
    const body = await req.json();

    const updateData: Partial<typeof products.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof body.dailyBudgetTarget === "number")
      updateData.dailyBudgetTarget = Math.max(0, body.dailyBudgetTarget);
    if (typeof body.weeklyBudgetTarget === "number")
      updateData.weeklyBudgetTarget = Math.max(0, body.weeklyBudgetTarget);
    if (typeof body.monthlyBudgetTarget === "number")
      updateData.monthlyBudgetTarget = Math.max(0, body.monthlyBudgetTarget);
    if (typeof body.name === "string" && body.name.trim())
      updateData.name = body.name.trim();

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, productId))
      .returning();

    return NextResponse.json({ product: updated });
  } catch (err) {
    console.error("PATCH /api/products/[id]/kpi-version error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật định mức ngân sách." },
      { status: 500 }
    );
  }
}
