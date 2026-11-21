import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  actionRecommendations,
  adInsights,
  aiBriefings,
  dailySalesReconciliation,
  metaAssets,
  productKpiVersions,
  products,
  systemSettings,
  telegramAlerts,
} from "@/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { getDaysAgoIso, getTodayIso } from "@/lib/format";
import { evaluateBudgetPacing, resolveKpiForDate } from "@/lib/kpi";

export async function GET() {
  try {
    await ensureSeeded();

    const today = getTodayIso();
    const sevenDaysAgo = getDaysAgoIso(6);

    const [
      settingsRows,
      latestBriefings,
      allProducts,
      allKpiVersions,
      recentInsights,
      recentSales,
      openActions,
      allAssets,
      recentAlerts,
    ] = await Promise.all([
      db.select().from(systemSettings).limit(1),
      db.select().from(aiBriefings).orderBy(desc(aiBriefings.createdAt)).limit(1),
      db.select().from(products),
      db.select().from(productKpiVersions),
      db.select().from(adInsights).where(gte(adInsights.reportDate, sevenDaysAgo)),
      db
        .select()
        .from(dailySalesReconciliation)
        .where(gte(dailySalesReconciliation.reportDate, sevenDaysAgo)),
      db
        .select()
        .from(actionRecommendations)
        .where(eq(actionRecommendations.status, "open"))
        .orderBy(desc(actionRecommendations.createdAt)),
      db.select().from(metaAssets),
      db.select().from(telegramAlerts).orderBy(desc(telegramAlerts.createdAt)).limit(5),
    ]);

    const settings = settingsRows[0] ?? null;
    const productById = new Map(allProducts.map((p) => [p.id, p]));

    // 7-day totals & real profit calculation using historical KPI versioning
    let totalSpend7d = 0;
    let totalMessages7d = 0;
    let todaySpendTotal = 0;
    const todaySpendByProduct = new Map<string, number>();

    for (const row of recentInsights) {
      totalSpend7d += row.spend;
      totalMessages7d += row.messages;
      if (row.reportDate === today) {
        todaySpendTotal += row.spend;
        todaySpendByProduct.set(
          row.productCode,
          (todaySpendByProduct.get(row.productCode) ?? 0) + row.spend
        );
      }
    }

    let totalRevenue7d = 0;
    let totalOrders7d = 0;
    let totalNetProfit7d = 0;

    for (const s of recentSales) {
      totalRevenue7d += s.actualRevenue;
      totalOrders7d += s.ordersClosed;
      const prod = productById.get(s.productId);
      if (!prod) continue;
      const versions = allKpiVersions.filter((v) => v.productId === prod.id);
      const kpi = resolveKpiForDate(versions, s.reportDate);
      if (!kpi) continue;
      const deliveredOrders = Math.max(0, s.ordersClosed - s.returnedOrders);
      const grossMarginBeforeAds = deliveredOrders * kpi.breakevenCpo;
      totalNetProfit7d += grossMarginBeforeAds;
    }
    totalNetProfit7d -= totalSpend7d;

    const actualCpo7d = totalOrders7d > 0 ? Math.round(totalSpend7d / totalOrders7d) : 0;
    const cirPct7d =
      totalRevenue7d > 0 ? Number(((totalSpend7d / totalRevenue7d) * 100).toFixed(1)) : 0;

    // Budget Pacing per product
    const pacingByProduct = allProducts.map((p) => {
      const spendToday = todaySpendByProduct.get(p.code) ?? 0;
      const pacing = evaluateBudgetPacing(spendToday, p.dailyBudgetTarget);
      return {
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        dailyBudgetTarget: p.dailyBudgetTarget,
        ...pacing,
      };
    });

    const adAccounts = allAssets.filter((a) => a.assetType === "ad_account");
    const unhealthyAccounts = adAccounts.filter((a) => a.accountStatus !== 1);

    const actionCounts = {
      total: openActions.length,
      kill: openActions.filter((a) => a.category === "kill").length,
      scale: openActions.filter((a) => a.category === "scale").length,
      fatigue: openActions.filter((a) => a.category === "fatigue").length,
      leakage: openActions.filter((a) => a.category === "leakage").length,
    };

    return NextResponse.json({
      briefing: latestBriefings[0] ?? null,
      summary: {
        totalSpend7d,
        todaySpendTotal,
        totalRevenue7d,
        totalOrders7d,
        totalMessages7d,
        totalNetProfit7d,
        actualCpo7d,
        cirPct7d,
      },
      pacingByProduct,
      actionCounts,
      topActions: openActions.slice(0, 4),
      unhealthyAccounts,
      monitoredAccountsCount: adAccounts.filter((a) => a.isMonitored).length,
      totalAccountsCount: adAccounts.length,
      systemHealth: {
        metaRateLimitPct: settings?.metaRateLimitPct ?? 0,
        throttleMode: settings?.throttleMode ?? false,
      },
      recentAlerts,
    });
  } catch (err) {
    console.error("GET /api/dashboard error:", err);
    return NextResponse.json(
      { error: "Không thể tải dữ liệu tổng quan." },
      { status: 500 }
    );
  }
}
