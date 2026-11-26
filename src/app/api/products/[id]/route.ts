import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { actionRecommendations, adInsights, adDrafts, creatives, dailySalesReconciliation, insightBreakdowns, products } from "@/db/schema";
import { authorizeApi } from "@/lib/auth/server";
import { parseProductEdit } from "@/lib/product-edit";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await authorizeApi("operator", true);
  if (denied) return denied;
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "ID sản phẩm không hợp lệ." }, { status: 400 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const input = parseProductEdit(body);
  if (!input) return NextResponse.json({ error: "Mã chỉ gồm chữ không dấu, số hoặc dấu gạch ngang (tối đa 40 ký tự); tên và danh mục là bắt buộc (tối đa 200 ký tự)." }, { status: 400 });
  try {
    const result = await db.transaction(async tx => {
      const [current] = await tx.select().from(products).where(eq(products.id, id)).for("update");
      if (!current) return { status: 404, error: "Không tìm thấy sản phẩm." };
      if (current.code !== input.expectedCode) return { status: 409, error: "Mã sản phẩm đã thay đổi. Hãy tải lại trang và thử lại." };
      const [duplicate] = await tx.select({ id: products.id }).from(products).where(and(ne(products.id, id), sql`upper(trim(${products.code})) = ${input.code}`)).limit(1);
      if (duplicate) return { status: 409, error: "Mã sản phẩm đã tồn tại." };
      if (current.code !== input.code) {
        // Code-based historical data cannot be safely renamed automatically. Also block
        // existing ID-linked records until a migration/reconciliation flow is available.
        const codes = [current.code.trim().toUpperCase(), input.code];
        const [linkedCreative, linkedDraft, linkedSales, insights, breakdowns, actions] = await Promise.all([
          tx.select({ id: creatives.id }).from(creatives).where(eq(creatives.productId, id)).limit(1),
          tx.select({ id: adDrafts.id }).from(adDrafts).where(eq(adDrafts.productId, id)).limit(1),
          tx.select({ id: dailySalesReconciliation.id }).from(dailySalesReconciliation).where(eq(dailySalesReconciliation.productId, id)).limit(1),
          tx.select({ id: adInsights.id }).from(adInsights).where(sql`upper(trim(${adInsights.productCode})) in (${codes[0]}, ${codes[1]})`).limit(1),
          tx.select({ id: insightBreakdowns.id }).from(insightBreakdowns).where(sql`upper(trim(${insightBreakdowns.productCode})) in (${codes[0]}, ${codes[1]})`).limit(1),
          tx.select({ id: actionRecommendations.id }).from(actionRecommendations).where(sql`upper(trim(${actionRecommendations.productCode})) in (${codes[0]}, ${codes[1]})`).limit(1),
        ]);
        if ([linkedCreative, linkedDraft, linkedSales, insights, breakdowns, actions].some(rows => rows.length)) return { status: 409, error: "Không thể đổi mã: đã có dữ liệu liên quan đến sản phẩm hoặc mã này. Cần đối soát và chuyển dữ liệu trước; tên và danh mục vẫn có thể sửa." };
      }
      const [product] = await tx.update(products).set({ code: input.code, name: input.name, category: input.category, updatedAt: new Date() }).where(eq(products.id, id)).returning();
      return { status: 200, product };
    }, { isolationLevel: "serializable" });
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ product: result.product }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    const error = err as { code?: string; cause?: { code?: string } };
    if (error.code === "23505" || error.cause?.code === "23505") return NextResponse.json({ error: "Mã sản phẩm đã tồn tại." }, { status: 409 });
    if (error.code === "40001" || error.cause?.code === "40001") return NextResponse.json({ error: "Dữ liệu vừa thay đổi. Hãy tải lại và thử lại." }, { status: 409 });
    console.error("PATCH /api/products/[id] failed", err);
    return NextResponse.json({ error: "Không thể cập nhật sản phẩm." }, { status: 500 });
  }
}
