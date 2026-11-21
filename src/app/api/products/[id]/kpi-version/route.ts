import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productKpiVersions, products } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { computeProductKpis } from "@/lib/kpi";
import { getTodayIso } from "@/lib/format";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSeeded();
    const { id } = await context.params;
    const productId = Number(id);
    if (!Number.isFinite(productId)) {
      return NextResponse.json({ error: "ID sản phẩm không hợp lệ." }, { status: 400 });
    }

    const body = await req.json();
    const existingVersions = await db
      .select()
      .from(productKpiVersions)
      .where(eq(productKpiVersions.productId, productId))
      .orderBy(desc(productKpiVersions.versionNumber));

    const nextVersionNumber = (existingVersions[0]?.versionNumber ?? 0) + 1;
    const effectiveFrom = String(body.effectiveFrom || getTodayIso());

    const input = {
      avgSellingPrice: Number(body.avgSellingPrice),
      cogs: Number(body.cogs),
      shippingPackingFee: Number(body.shippingPackingFee),
      expectedReturnRatePct: Number(body.expectedReturnRatePct),
      otherCost: Number(body.otherCost ?? 0),
      targetNetMarginPct: Number(body.targetNetMarginPct),
      targetCloseRatePct: Number(body.targetCloseRatePct),
    };
    const computed = computeProductKpis(input);

    const [created] = await db
      .insert(productKpiVersions)
      .values({
        productId,
        versionNumber: nextVersionNumber,
        effectiveFrom,
        ...input,
        breakevenCpo: computed.breakevenCpo,
        targetCpo: computed.targetCpo,
        ceilingMessageCost: computed.ceilingMessageCost,
        note: String(
          body.note || `Cập nhật cấu trúc KPI phiên bản v${nextVersionNumber}`
        ),
      })
      .returning();

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
