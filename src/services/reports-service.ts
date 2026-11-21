import { db } from "@/db";
import {
  adInsights,
  creatives,
  dailySalesReconciliation,
  insightBreakdowns,
  metaAssets,
  metaPosts,
  productKpiVersions,
  products,
} from "@/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { resolveKpiForDate } from "@/lib/kpi";
import type {
  CampaignHierarchyNode,
  CreativeLeaderboardRow,
  DerivedMetrics,
  RealProfitRow,
} from "@/types/domain";

interface RawMetricAccumulator {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  messages: number;
  video3sViews: number;
  thruplayViews: number;
  dailyBudget: number;
}

const emptyTotals = (): RawMetricAccumulator => ({
  spend: 0,
  impressions: 0,
  reach: 0,
  clicks: 0,
  messages: 0,
  video3sViews: 0,
  thruplayViews: 0,
  dailyBudget: 0,
});

function addInsightRow(
  acc: RawMetricAccumulator,
  r: typeof adInsights.$inferSelect
) {
  acc.spend += r.spend;
  acc.impressions += r.impressions;
  acc.reach += r.reach;
  acc.clicks += r.clicks;
  acc.messages += r.messages;
  acc.video3sViews += r.video3sViews;
  acc.thruplayViews += r.thruplayViews;
  acc.dailyBudget = Math.max(acc.dailyBudget, r.dailyBudget);
}

function deriveMetrics(m: RawMetricAccumulator): DerivedMetrics {
  return {
    ...m,
    ctr: m.impressions > 0 ? Number(((m.clicks / m.impressions) * 100).toFixed(2)) : 0,
    cpm: m.impressions > 0 ? Math.round((m.spend / m.impressions) * 1000) : 0,
    frequency: m.reach > 0 ? Number((m.impressions / m.reach).toFixed(2)) : 0,
    costPerMessage: m.messages > 0 ? Math.round(m.spend / m.messages) : 0,
    hookRate:
      m.impressions > 0 ? Number(((m.video3sViews / m.impressions) * 100).toFixed(1)) : 0,
    holdRate:
      m.video3sViews > 0
        ? Number(((m.thruplayViews / m.video3sViews) * 100).toFixed(1))
        : 0,
  };
}

export async function queryMultiLevelReports(params: {
  startDate: string;
  endDate: string;
  adAccount: string;
  productCode: string;
  statusFilter: string;
}) {
  const { startDate, endDate, adAccount, productCode, statusFilter } = params;

  const [
    allInsights,
    allBreakdowns,
    allSales,
    allProducts,
    allKpiVersions,
    allCreatives,
    allPosts,
    allAccounts,
  ] = await Promise.all([
    db
      .select()
      .from(adInsights)
      .where(
        and(
          gte(adInsights.reportDate, startDate),
          lte(adInsights.reportDate, endDate)
        )
      ),
    db.select().from(insightBreakdowns),
    db
      .select()
      .from(dailySalesReconciliation)
      .where(
        and(
          gte(dailySalesReconciliation.reportDate, startDate),
          lte(dailySalesReconciliation.reportDate, endDate)
        )
      )
      .orderBy(desc(dailySalesReconciliation.reportDate)),
    db.select().from(products),
    db.select().from(productKpiVersions),
    db.select().from(creatives),
    db.select().from(metaPosts),
    db.select().from(metaAssets).where(eq(metaAssets.assetType, "ad_account")),
  ]);

  const filteredInsights = allInsights.filter((row) => {
    if (adAccount !== "ALL" && row.adAccountMetaId !== adAccount) return false;
    if (productCode !== "ALL" && row.productCode !== productCode) return false;
    if (statusFilter !== "ALL" && row.entityStatus !== statusFilter) return false;
    return true;
  });

  // 1. Build 3-level hierarchy: Campaign -> AdSet -> Ad
  const campaignMap = new Map<
    string,
    {
      campaignMetaId: string;
      campaignName: string;
      adAccountMetaId: string;
      productCode: string;
      status: string;
      totals: RawMetricAccumulator;
      adsets: Map<
        string,
        {
          adsetMetaId: string;
          adsetName: string;
          status: string;
          totals: RawMetricAccumulator;
          ads: Map<
            string,
            {
              adMetaId: string;
              adName: string;
              creativeCode: string;
              effectiveObjectStoryId: string;
              status: string;
              totals: RawMetricAccumulator;
            }
          >;
        }
      >;
    }
  >();

  for (const row of filteredInsights) {
    let cmp = campaignMap.get(row.campaignMetaId);
    if (!cmp) {
      cmp = {
        campaignMetaId: row.campaignMetaId,
        campaignName: row.campaignName,
        adAccountMetaId: row.adAccountMetaId,
        productCode: row.productCode,
        status: row.entityStatus,
        totals: emptyTotals(),
        adsets: new Map(),
      };
      campaignMap.set(row.campaignMetaId, cmp);
    }
    addInsightRow(cmp.totals, row);

    let adset = cmp.adsets.get(row.adsetMetaId);
    if (!adset) {
      adset = {
        adsetMetaId: row.adsetMetaId,
        adsetName: row.adsetName,
        status: row.entityStatus,
        totals: emptyTotals(),
        ads: new Map(),
      };
      cmp.adsets.set(row.adsetMetaId, adset);
    }
    addInsightRow(adset.totals, row);

    let ad = adset.ads.get(row.adMetaId);
    if (!ad) {
      ad = {
        adMetaId: row.adMetaId,
        adName: row.adName,
        creativeCode: row.creativeCode,
        effectiveObjectStoryId: row.effectiveObjectStoryId,
        status: row.entityStatus,
        totals: emptyTotals(),
      };
      adset.ads.set(row.adMetaId, ad);
    }
    addInsightRow(ad.totals, row);
  }

  const hierarchy: CampaignHierarchyNode[] = [...campaignMap.values()].map(
    (cmp) => ({
      campaignMetaId: cmp.campaignMetaId,
      campaignName: cmp.campaignName,
      adAccountMetaId: cmp.adAccountMetaId,
      productCode: cmp.productCode,
      status: cmp.status,
      metrics: deriveMetrics(cmp.totals),
      adsets: [...cmp.adsets.values()].map((adset) => ({
        adsetMetaId: adset.adsetMetaId,
        adsetName: adset.adsetName,
        status: adset.status,
        metrics: deriveMetrics(adset.totals),
        ads: [...adset.ads.values()].map((ad) => ({
          adMetaId: ad.adMetaId,
          adName: ad.adName,
          creativeCode: ad.creativeCode,
          effectiveObjectStoryId: ad.effectiveObjectStoryId,
          status: ad.status,
          metrics: deriveMetrics(ad.totals),
        })),
      })),
    })
  );

  // 2. Cross-account Creative Leaderboard (effective_object_story_id -> meta_posts -> creative_id, fallback Auto-Naming)
  const postToCreativeId = new Map<string, number>();
  for (const p of allPosts) {
    if (p.creativeId) postToCreativeId.set(p.effectiveObjectStoryId, p.creativeId);
  }
  const creativeById = new Map(allCreatives.map((c) => [c.id, c]));
  const creativeByCode = new Map(allCreatives.map((c) => [c.creativeCode, c]));

  const creativeLeaderboardMap = new Map<
    string,
    {
      creativeCode: string;
      fileName: string;
      hookAngle: string;
      lifecycleStatus: string;
      productCode: string;
      accountsUsed: Set<string>;
      postIdsUsed: Set<string>;
      totals: RawMetricAccumulator;
    }
  >();

  for (const row of filteredInsights) {
    const crId = postToCreativeId.get(row.effectiveObjectStoryId);
    const cr =
      (crId ? creativeById.get(crId) : undefined) ??
      creativeByCode.get(row.creativeCode);
    const code = cr?.creativeCode || row.creativeCode || "UNMAPPED";

    let entry = creativeLeaderboardMap.get(code);
    if (!entry) {
      entry = {
        creativeCode: code,
        fileName: cr?.fileName || code,
        hookAngle: cr?.hookAngle || "",
        lifecycleStatus: cr?.lifecycleStatus || "dang_chay",
        productCode: row.productCode,
        accountsUsed: new Set(),
        postIdsUsed: new Set(),
        totals: emptyTotals(),
      };
      creativeLeaderboardMap.set(code, entry);
    }
    entry.accountsUsed.add(row.adAccountMetaId);
    if (row.effectiveObjectStoryId)
      entry.postIdsUsed.add(row.effectiveObjectStoryId);
    addInsightRow(entry.totals, row);
  }

  const creativeLeaderboard: CreativeLeaderboardRow[] = [
    ...creativeLeaderboardMap.values(),
  ]
    .map((item) => ({
      creativeCode: item.creativeCode,
      fileName: item.fileName,
      hookAngle: item.hookAngle,
      lifecycleStatus: item.lifecycleStatus,
      productCode: item.productCode,
      accountsCount: item.accountsUsed.size,
      postIdsCount: item.postIdsUsed.size,
      metrics: deriveMetrics(item.totals),
    }))
    .sort((a, b) => b.metrics.spend - a.metrics.spend);

  // 3. Breakdowns
  const breakdowns = allBreakdowns.filter(
    (b) => productCode === "ALL" || b.productCode === productCode
  );

  // 4. Real-Profit Reconciliation joined by [Date + Product] + Historical KPI Versioning
  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const spendMsgByDateProd = new Map<string, { spend: number; messages: number }>();
  for (const row of allInsights) {
    const k = `${row.reportDate}::${row.productCode}`;
    const cur = spendMsgByDateProd.get(k) ?? { spend: 0, messages: 0 };
    cur.spend += row.spend;
    cur.messages += row.messages;
    spendMsgByDateProd.set(k, cur);
  }

  const profitRows: RealProfitRow[] = allSales
    .map((s) => {
      const prod = productById.get(s.productId);
      if (!prod) return null;
      if (productCode !== "ALL" && prod.code !== productCode) return null;

      const versions = allKpiVersions.filter((v) => v.productId === prod.id);
      const kpiAtDate = resolveKpiForDate(versions, s.reportDate);
      if (!kpiAtDate) throw new Error("Không có KPI hiệu lực cho dữ liệu doanh thu; không thể tính lợi nhuận an toàn.");
      const ads = spendMsgByDateProd.get(`${s.reportDate}::${prod.code}`) ?? {
        spend: 0,
        messages: 0,
      };

      const deliveredOrders = Math.max(0, s.ordersClosed - s.returnedOrders);
      const actualCloseRatePct =
        ads.messages > 0
          ? Number(((s.ordersClosed / ads.messages) * 100).toFixed(1))
          : 0;
      const actualCpo =
        s.ordersClosed > 0 ? Math.round(ads.spend / s.ordersClosed) : 0;
      const cirPct =
        s.actualRevenue > 0
          ? Number(((ads.spend / s.actualRevenue) * 100).toFixed(1))
          : 0;

      const variableCostPerOrder = kpiAtDate
        ? kpiAtDate.cogs + kpiAtDate.shippingPackingFee + kpiAtDate.otherCost
        : 0;
      const returnLoss = kpiAtDate
        ? s.returnedOrders * Math.round(kpiAtDate.shippingPackingFee * 1.5)
        : 0;
      const estNetProfit =
        s.actualRevenue -
        deliveredOrders * variableCostPerOrder -
        returnLoss -
        ads.spend;

      return {
        id: s.id,
        reportDate: s.reportDate,
        productId: prod.id,
        productCode: prod.code,
        productName: prod.name,
        kpiVersionUsed: kpiAtDate
          ? `v${kpiAtDate.versionNumber} (từ ${kpiAtDate.effectiveFrom})`
          : "—",
        breakevenCpoAtDate: kpiAtDate?.breakevenCpo ?? 0,
        targetCpoAtDate: kpiAtDate?.targetCpo ?? 0,
        adSpend: ads.spend,
        messages: ads.messages,
        ordersClosed: s.ordersClosed,
        returnedOrders: s.returnedOrders,
        actualReturnRatePct: s.actualReturnRatePct,
        actualRevenue: s.actualRevenue,
        actualCloseRatePct,
        actualCpo,
        cirPct,
        estNetProfit,
        source: s.source,
        note: s.note,
      };
    })
    .filter((x): x is RealProfitRow => Boolean(x));

  return {
    filters: { startDate, endDate, adAccount, productCode, statusFilter },
    products: allProducts,
    adAccounts: allAccounts,
    hierarchy,
    creativeLeaderboard,
    breakdowns,
    profitRows,
  };
}
