import { db } from "@/db";
import {
  actionRecommendations,
  adInsights,
  creatives,
  insightBreakdowns,
  metaPosts,
  productKpiVersions,
  products,
  syncLogs,
  systemSettings,
} from "@/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { getDaysAgoIso, getTodayIso } from "./format";
import { resolveKpiForDate } from "./kpi";

export async function runRuleEngineScan() {
  const startedAt = Date.now();
  const today = getTodayIso();
  const threeDaysAgo = getDaysAgoIso(2);
  const sevenDaysAgo = getDaysAgoIso(6);

  const [settings] = await db.select().from(systemSettings).limit(1);
  const rules = settings?.ruleConfigJson ?? {
    killMsgCeilingPct: 130,
    killMinSpend: 120000,
    scaleTargetDiscountPct: 20,
    scaleMinMessages: 12,
    scaleMinDays: 2,
    fatigueFrequencyThreshold: 2.5,
    fatigueCtrDropDays: 3,
    leakageSpendSharePct: 15,
    leakageCostMultiplier: 1.5,
  };

  const allProducts = await db.select().from(products);
  const allKpiVersions = await db.select().from(productKpiVersions);
  const allCreatives = await db.select().from(creatives);
  const allPosts = await db.select().from(metaPosts);
  const recentInsights = await db
    .select()
    .from(adInsights)
    .where(gte(adInsights.reportDate, sevenDaysAgo));
  const recentBreakdowns = await db
    .select()
    .from(insightBreakdowns)
    .where(gte(insightBreakdowns.reportDate, sevenDaysAgo));

  const existingRecs = await db
    .select()
    .from(actionRecommendations)
    .orderBy(desc(actionRecommendations.createdAt));

  const now = new Date();
  const isBlockedByOpenOrCooldown = (category: string, entityId: string) => {
    return existingRecs.some((r) => {
      if (r.category !== category || r.entityId !== entityId) return false;
      if (r.status === "open") return true;
      if (r.status === "dismissed" && r.cooldownUntil && new Date(r.cooldownUntil) > now) {
        return true;
      }
      return false;
    });
  };

  const productByCode = new Map(allProducts.map((p) => [p.code, p]));
  const kpiByProductCode = new Map<string, ReturnType<typeof resolveKpiForDate>>();
  for (const p of allProducts) {
    const versions = allKpiVersions.filter((v) => v.productId === p.id);
    kpiByProductCode.set(p.code, resolveKpiForDate(versions, today));
  }

  const createdItems: Array<typeof actionRecommendations.$inferInsert> = [];

  // Group insights by adsetMetaId
  const byAdset = new Map<string, typeof recentInsights>();
  for (const row of recentInsights) {
    const list = byAdset.get(row.adsetMetaId) ?? [];
    list.push(row);
    byAdset.set(row.adsetMetaId, list);
  }

  // 1. KILL & 2. SCALE
  for (const [adsetId, rows] of byAdset.entries()) {
    const sample = rows[0];
    if (!sample || sample.entityStatus !== "ACTIVE") continue;
    const kpi = kpiByProductCode.get(sample.productCode);
    if (!kpi) continue;

    const todayRows = rows.filter((r) => r.reportDate === today);
    const todaySpend = todayRows.reduce((s, r) => s + r.spend, 0);
    const todayMsgs = todayRows.reduce((s, r) => s + r.messages, 0);

    const last3dRows = rows.filter((r) => r.reportDate >= threeDaysAgo);
    const last3dSpend = last3dRows.reduce((s, r) => s + r.spend, 0);
    const last3dMsgs = last3dRows.reduce((s, r) => s + r.messages, 0);
    const activeDays = new Set(last3dRows.map((r) => r.reportDate)).size;

    const killSpendThreshold = Math.max(
      rules.killMinSpend,
      Math.round(kpi.ceilingMessageCost * (rules.killMsgCeilingPct / 100))
    );
    const est3dOrders = last3dMsgs * (kpi.targetCloseRatePct / 100);
    const est3dCpo = est3dOrders > 0 ? last3dSpend / est3dOrders : Infinity;

    // KILL rule: today spend > ceiling% with 0 messages OR 3-day est CPO > breakeven CPO
    if (
      !isBlockedByOpenOrCooldown("kill", adsetId) &&
      ((todaySpend >= killSpendThreshold && todayMsgs === 0) ||
        (activeDays >= 2 && last3dSpend >= rules.killMinSpend * 2 && est3dCpo > kpi.breakevenCpo))
    ) {
      const wastedSpend =
        todayMsgs === 0
          ? todaySpend
          : Math.max(0, Math.round(last3dSpend - est3dOrders * kpi.breakevenCpo));

      createdItems.push({
        category: "kill",
        priority: "high",
        title: `Cắt lỗ nhóm ${sample.adsetName}`,
        description:
          todayMsgs === 0
            ? `Đã tiêu ${todaySpend.toLocaleString("vi-VN")}đ hôm nay (vượt ${rules.killMsgCeilingPct}% giá tin nhắn trần ${kpi.ceilingMessageCost.toLocaleString("vi-VN")}đ) nhưng chưa ra tin nhắn nào.`
            : `CPO ước tính 3 ngày (${Math.round(est3dCpo).toLocaleString("vi-VN")}đ) vượt CPO hòa vốn (${kpi.breakevenCpo.toLocaleString("vi-VN")}đ). Cần tắt nhóm để chặn lỗ.`,
        productCode: sample.productCode,
        adAccountMetaId: sample.adAccountMetaId,
        entityType: "adset",
        entityId: adsetId,
        entityName: sample.adsetName,
        wastedSpend,
        metricsSnapshotJson: {
          todaySpend,
          todayMsgs,
          last3dSpend,
          last3dMsgs,
          ceilingMessageCost: kpi.ceilingMessageCost,
          breakevenCpo: kpi.breakevenCpo,
        },
        suggestedActionJson: {
          actionLabel: "Tắt nhóm trên Meta Ads Manager",
          type: "pause_adset",
        },
        status: "open",
      });
    }

    // SCALE rule: cost/msg <= target * (1 - discount%), stable >= minDays, sufficient msgs
    const avg3dCostPerMsg = last3dMsgs > 0 ? last3dSpend / last3dMsgs : Infinity;
    const scaleTargetCeiling = kpi.ceilingMessageCost * (1 - rules.scaleTargetDiscountPct / 100);

    if (
      !isBlockedByOpenOrCooldown("scale", adsetId) &&
      activeDays >= rules.scaleMinDays &&
      last3dMsgs >= rules.scaleMinMessages &&
      avg3dCostPerMsg <= scaleTargetCeiling
    ) {
      const matchedPost = allPosts.find(
        (p) => p.effectiveObjectStoryId === sample.effectiveObjectStoryId
      );
      createdItems.push({
        category: "scale",
        priority: "high",
        title: `Mở rộng nhóm thắng ${sample.adsetName}`,
        description: `Giá tin nhắn TB ${activeDays} ngày đạt ${Math.round(avg3dCostPerMsg).toLocaleString("vi-VN")}đ — thấp hơn ${Math.round((1 - avg3dCostPerMsg / kpi.ceilingMessageCost) * 100)}% so với giá trần (${kpi.ceilingMessageCost.toLocaleString("vi-VN")}đ) với ${last3dMsgs} tin nhắn ổn định.`,
        productCode: sample.productCode,
        adAccountMetaId: sample.adAccountMetaId,
        entityType: "adset",
        entityId: adsetId,
        entityName: sample.adsetName,
        wastedSpend: 0,
        metricsSnapshotJson: {
          avg3dCostPerMsg: Math.round(avg3dCostPerMsg),
          ceilingMessageCost: kpi.ceilingMessageCost,
          last3dMsgs,
          activeDays,
          currentBudget: sample.dailyBudget,
        },
        suggestedActionJson: {
          actionLabel: "Tăng ngân sách +20% hoặc Nhân nhóm Post ID",
          recommendedBudgetIncreasePct: 20,
          recommendedNewBudget: Math.round(sample.dailyBudget * 1.2),
          postId: matchedPost?.effectiveObjectStoryId || sample.effectiveObjectStoryId,
          launcherUrl: `/launcher?flow=flow2_post_id&postId=${encodeURIComponent(
            matchedPost?.effectiveObjectStoryId || sample.effectiveObjectStoryId || ""
          )}&product=${sample.productCode}`,
        },
        status: "open",
      });
    }
  }

  // 3. CREATIVE FATIGUE (group by creativeCode)
  const byCreative = new Map<string, typeof recentInsights>();
  for (const row of recentInsights) {
    if (!row.creativeCode) continue;
    const list = byCreative.get(row.creativeCode) ?? [];
    list.push(row);
    byCreative.set(row.creativeCode, list);
  }

  for (const [creativeCode, rows] of byCreative.entries()) {
    if (isBlockedByOpenOrCooldown("fatigue", creativeCode)) continue;
    const byDate = new Map<string, { freq: number; ctr: number; cpm: number; count: number; spend: number }>();
    for (const r of rows) {
      const cur = byDate.get(r.reportDate) ?? { freq: 0, ctr: 0, cpm: 0, count: 0, spend: 0 };
      cur.freq += r.frequency;
      cur.ctr += r.ctr;
      cur.cpm += r.cpm;
      cur.spend += r.spend;
      cur.count += 1;
      byDate.set(r.reportDate, cur);
    }
    const dates = [...byDate.keys()].sort();
    if (dates.length < 3) continue;
    const last3 = dates.slice(-3).map((d) => {
      const v = byDate.get(d)!;
      return {
        date: d,
        freq: v.freq / v.count,
        ctr: v.ctr / v.count,
        cpm: v.cpm / v.count,
        spend: v.spend,
      };
    });

    const latest = last3[2];
    const ctrDeclining = last3[0].ctr > last3[1].ctr && last3[1].ctr > last3[2].ctr;
    const cpmRising = last3[2].cpm > last3[0].cpm;

    if (latest.freq >= rules.fatigueFrequencyThreshold && (ctrDeclining || cpmRising)) {
      const productCode = rows[0].productCode;
      const prod = productByCode.get(productCode);
      const backupCreatives = allCreatives
        .filter((c) => c.productId === prod?.id && c.lifecycleStatus === "cho_test")
        .slice(0, 3)
        .map((c) => ({
          creativeCode: c.creativeCode,
          fileName: c.fileName,
          hookAngle: c.hookAngle,
        }));

      createdItems.push({
        category: "fatigue",
        priority: "medium",
        title: `Thay máu Creative ${creativeCode} (Bão hòa nội dung)`,
        description: `Tần suất đạt ${latest.freq.toFixed(2)} (vượt ngưỡng ${rules.fatigueFrequencyThreshold}), CTR giảm liên tiếp 3 ngày (${last3[0].ctr.toFixed(2)}% → ${latest.ctr.toFixed(2)}%) và CPM tăng lên ${Math.round(latest.cpm).toLocaleString("vi-VN")}đ.`,
        productCode,
        adAccountMetaId: rows[0].adAccountMetaId,
        entityType: "creative",
        entityId: creativeCode,
        entityName: creativeCode,
        wastedSpend: Math.round(latest.spend * 0.25),
        metricsSnapshotJson: {
          frequency: Number(latest.freq.toFixed(2)),
          ctrTrend: last3.map((x) => Number(x.ctr.toFixed(2))),
          cpmLatest: Math.round(latest.cpm),
        },
        suggestedActionJson: {
          actionLabel: "Lên video Chờ test thay thế",
          suggestedCreatives: backupCreatives,
          launcherUrl: `/launcher?flow=flow1_drive&product=${productCode}`,
        },
        status: "open",
      });
    }
  }

  // 4. BUDGET LEAKAGE (7-day Breakdowns)
  const byProductDim = new Map<string, Map<string, { spend: number; messages: number }>>();
  for (const b of recentBreakdowns) {
    const key = `${b.productCode}::${b.dimensionType}`;
    const dimMap = byProductDim.get(key) ?? new Map();
    const cur = dimMap.get(b.dimensionValue) ?? { spend: 0, messages: 0 };
    cur.spend += b.spend;
    cur.messages += b.messages;
    dimMap.set(b.dimensionValue, cur);
    byProductDim.set(key, dimMap);
  }

  for (const [key, dimMap] of byProductDim.entries()) {
    const [productCode, dimensionType] = key.split("::");
    let totalSpend = 0;
    let totalMsgs = 0;
    for (const v of dimMap.values()) {
      totalSpend += v.spend;
      totalMsgs += v.messages;
    }
    if (totalSpend < 500000 || totalMsgs === 0) continue;
    const avgCost = totalSpend / totalMsgs;

    for (const [dimValue, v] of dimMap.entries()) {
      const sharePct = (v.spend / totalSpend) * 100;
      const dimCost = v.messages > 0 ? v.spend / v.messages : v.spend;
      const entityId = `leak_${productCode}_${dimensionType}_${dimValue}`;
      if (
        !isBlockedByOpenOrCooldown("leakage", entityId) &&
        sharePct >= rules.leakageSpendSharePct &&
        dimCost >= avgCost * rules.leakageCostMultiplier
      ) {
        const dimLabelMap: Record<string, string> = {
          hour: "Khung giờ",
          age_gender: "Độ tuổi / Giới tính",
          platform: "Nền tảng hiển thị",
          region: "Khu vực",
        };
        createdItems.push({
          category: "leakage",
          priority: "medium",
          title: `Chặn rò rỉ ${dimLabelMap[dimensionType] ?? dimensionType}: ${dimValue} (${productCode})`,
          description: `Phân khúc "${dimValue}" chiếm ${sharePct.toFixed(1)}% ngân sách 7 ngày (${v.spend.toLocaleString("vi-VN")}đ) nhưng giá tin nhắn đạt ${Math.round(dimCost).toLocaleString("vi-VN")}đ — cao gấp ${(dimCost / avgCost).toFixed(1)}x trung bình (${Math.round(avgCost).toLocaleString("vi-VN")}đ).`,
          productCode,
          adAccountMetaId: "",
          entityType: "breakdown",
          entityId,
          entityName: `${dimLabelMap[dimensionType] ?? dimensionType}: ${dimValue}`,
          wastedSpend: Math.max(0, Math.round(v.spend - v.messages * avgCost)),
          metricsSnapshotJson: {
            sharePct: Number(sharePct.toFixed(1)),
            segmentCost: Math.round(dimCost),
            avgCost: Math.round(avgCost),
            multiplier: Number((dimCost / avgCost).toFixed(2)),
          },
          suggestedActionJson: {
            actionLabel: "Loại trừ phân khúc này trong Mẫu Target",
            dimensionType,
            dimensionValue: dimValue,
            launcherUrl: `/launcher?tab=presets`,
          },
          status: "open",
        });
      }
    }
  }

  if (createdItems.length > 0) {
    await db.insert(actionRecommendations).values(createdItems);
  }

  const durationMs = Date.now() - startedAt;
  await db.insert(syncLogs).values({
    jobName: "rule_engine",
    status: "success",
    itemsProcessed: createdItems.length,
    durationMs,
    rateLimitPct: settings?.metaRateLimitPct ?? 24,
    message: `Quét quy tắc hoàn tất: phát hiện ${createdItems.length} đề xuất hành động mới (áp dụng bộ lọc chống nhiễu & tạm ẩn 24h).`,
  });

  return {
    createdCount: createdItems.length,
    durationMs,
    createdItems,
  };
}
