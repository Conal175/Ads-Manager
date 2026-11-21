import { isDemoMode, demoOnlyError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  adInsights,
  dailySalesReconciliation,
  syncLogs,
  systemSettings,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { getDaysAgoIso, getTodayIso } from "@/lib/format";
import { jsonError } from "@/lib/api-utils";
import { queryMultiLevelReports } from "@/services/reports-service";

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(req.url);
    const data = await queryMultiLevelReports({
      startDate: searchParams.get("startDate") || getDaysAgoIso(6),
      endDate: searchParams.get("endDate") || getTodayIso(),
      adAccount: searchParams.get("adAccount") || "ALL",
      productCode: searchParams.get("productCode") || "ALL",
      statusFilter: searchParams.get("status") || "ALL",
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/reports error:", err);
    return jsonError("Lỗi tải dữ liệu báo cáo.");
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const [settings] = await db.select().from(systemSettings).limit(1);

    if (body.action === "refresh_insights") {
    if (!isDemoMode()) return demoOnlyError();
      const started = Date.now();
      const today = getTodayIso();
      const todayRows = await db
        .select()
        .from(adInsights)
        .where(eq(adInsights.reportDate, today));

      for (const r of todayRows) {
        const extraSpend = Math.round(40000 + Math.random() * 110000);
        const extraMsgs = r.adsetMetaId.includes("bleed")
          ? 0
          : Math.max(1, Math.round(extraSpend / 24500));
        const newSpend = r.spend + extraSpend;
        const newMsgs = r.messages + extraMsgs;
        await db
          .update(adInsights)
          .set({
            spend: newSpend,
            messages: newMsgs,
            impressions: r.impressions + Math.round(extraSpend / 95),
            costPerMessage:
              newMsgs > 0 ? Math.round(newSpend / newMsgs) : newSpend,
            syncedAt: new Date(),
          })
          .where(eq(adInsights.id, r.id));
      }

      const durationMs = Date.now() - started;
      await db.insert(syncLogs).values({
        jobName: "meta_insights",
        status: "success",
        itemsProcessed: todayRows.length,
        durationMs,
        rateLimitPct: Math.min(95, (settings?.metaRateLimitPct ?? 24) + 3),
        message: `Làm mới thủ công Insights ngày ${today} cho ${todayRows.length} bản ghi đang theo dõi.`,
      });

      return NextResponse.json({
        ok: true,
        message: `Đã làm mới Insights ngay lập tức (${todayRows.length} dòng cập nhật vào PostgreSQL).`,
      });
    }

    if (body.action === "sync_sheets") {
    if (!isDemoMode()) return demoOnlyError();
      const started = Date.now();
      await db.insert(syncLogs).values({
        jobName: "google_sheets",
        status: "success",
        itemsProcessed: 21,
        durationMs: Date.now() - started + 280,
        rateLimitPct: settings?.metaRateLimitPct ?? 24,
        message:
          "Đồng bộ Google Sheets đối soát doanh thu & tỷ lệ hoàn thành công.",
      });
      return NextResponse.json({
        ok: true,
        message: "Đã đồng bộ dữ liệu bán hàng từ Google Sheets thành công.",
      });
    }

    if (body.action === "upsert_sales") {
      const reportDate = String(body.reportDate || getTodayIso());
      const productId = Number(body.productId);
      const ordersClosed = Math.max(0, Number(body.ordersClosed) || 0);
      const actualRevenue = Math.max(0, Number(body.actualRevenue) || 0);
      const returnedOrders = Math.max(0, Number(body.returnedOrders) || 0);
      const actualReturnRatePct =
        ordersClosed > 0
          ? Number(((returnedOrders / ordersClosed) * 100).toFixed(1))
          : 0;

      const existing = await db
        .select()
        .from(dailySalesReconciliation)
        .where(
          and(
            eq(dailySalesReconciliation.reportDate, reportDate),
            eq(dailySalesReconciliation.productId, productId)
          )
        );

      if (existing.length > 0) {
        const [updated] = await db
          .update(dailySalesReconciliation)
          .set({
            ordersClosed,
            actualRevenue,
            returnedOrders,
            actualReturnRatePct,
            source: "manual_override",
            note: String(body.note || "Ghi đè thủ công cuối ngày trên web"),
            updatedAt: new Date(),
          })
          .where(eq(dailySalesReconciliation.id, existing[0].id))
          .returning();
        return NextResponse.json({ ok: true, record: updated });
      }

      const [created] = await db
        .insert(dailySalesReconciliation)
        .values({
          reportDate,
          productId,
          ordersClosed,
          actualRevenue,
          returnedOrders,
          actualReturnRatePct,
          source: "manual_override",
          note: String(body.note || "Nhập nhanh cuối ngày trên web"),
        })
        .returning();
      return NextResponse.json({ ok: true, record: created });
    }

    return jsonError("Hành động không hợp lệ.", 400);
  } catch (err) {
    console.error("POST /api/reports error:", err);
    return jsonError("Lỗi xử lý báo cáo.");
  }
}
