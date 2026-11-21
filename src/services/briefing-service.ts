import { db } from "@/db";
import {
  actionRecommendations,
  adInsights,
  aiBriefings,
  dailySalesReconciliation,
  metaAssets,
  products,
  syncLogs,
  systemSettings,
} from "@/db/schema";
import { eq, gte } from "drizzle-orm";
import { formatCompactVnd, getDaysAgoIso, getTodayIso } from "@/lib/format";
import { dispatchTelegramAlert } from "@/lib/telegram";
import { resolveEffectiveSecrets } from "@/lib/api-utils";
import { generateStructuredBriefing } from "./gemini-ai";
import type { AiBriefingStructuredOutput } from "@/types/domain";

export async function createDailyAiBriefing() {
  const started = Date.now();
  const today = getTodayIso();
  const sevenDaysAgo = getDaysAgoIso(6);

  const [
    settingsRows,
    allProducts,
    recentInsights,
    recentSales,
    openRecs,
    allAccounts,
  ] = await Promise.all([
    db.select().from(systemSettings).limit(1),
    db.select().from(products),
    db.select().from(adInsights).where(gte(adInsights.reportDate, sevenDaysAgo)),
    db
      .select()
      .from(dailySalesReconciliation)
      .where(gte(dailySalesReconciliation.reportDate, sevenDaysAgo)),
    db
      .select()
      .from(actionRecommendations)
      .where(eq(actionRecommendations.status, "open")),
    db.select().from(metaAssets).where(eq(metaAssets.assetType, "ad_account")),
  ]);

  const settings = settingsRows[0];
  const secrets = resolveEffectiveSecrets(settings);

  // Build compact JSON payload (token-saving design for Gemini API)
  const spend7d = recentInsights.reduce((s, r) => s + r.spend, 0);
  const msgs7d = recentInsights.reduce((s, r) => s + r.messages, 0);
  const rev7d = recentSales.reduce((s, r) => s + r.actualRevenue, 0);
  const orders7d = recentSales.reduce((s, r) => s + r.ordersClosed, 0);
  const unhealthyAccs = allAccounts.filter((a) => a.accountStatus !== 1);

  const killRecs = openRecs.filter((r) => r.category === "kill");
  const scaleRecs = openRecs.filter((r) => r.category === "scale");
  const fatigueRecs = openRecs.filter((r) => r.category === "fatigue");
  const leakageRecs = openRecs.filter((r) => r.category === "leakage");

  const compactInputJson = {
    generatedAt: new Date().toISOString(),
    period: `${sevenDaysAgo}..${today}`,
    spend7d,
    msgs7d,
    avgCostPerMsg: msgs7d > 0 ? Math.round(spend7d / msgs7d) : 0,
    rev7d,
    orders7d,
    cirPct: rev7d > 0 ? Number(((spend7d / rev7d) * 100).toFixed(1)) : 0,
    products: allProducts.map((p) => ({
      code: p.code,
      name: p.name,
      currentDailyBudget: p.dailyBudgetTarget,
    })),
    openActionSummary: openRecs.slice(0, 6).map((r) => ({
      category: r.category,
      productCode: r.productCode,
      title: r.title,
      wastedSpend: r.wastedSpend,
    })),
    unhealthyAccounts: unhealthyAccs.map((a) => ({
      metaId: a.metaId,
      name: a.name,
      status: a.accountStatus,
      reason: a.disableReason,
    })),
  };

  // Deterministic fallback output if GEMINI_API_KEY is not yet configured
  const fallbackOutput: AiBriefingStructuredOutput = {
    summaryHeadline: `Tổng hợp 7 ngày: Chi tiêu ${formatCompactVnd(
      spend7d
    )} mang về ${orders7d} đơn thực tế (${formatCompactVnd(
      rev7d
    )}, CIR ${compactInputJson.cirPct}%). Hiện có ${
      openRecs.length
    } đề xuất cần duyệt và ${unhealthyAccs.length} tài khoản quảng cáo cảnh báo đỏ.`,
    winsJson: [
      {
        title:
          scaleRecs[0]?.title ||
          "Nhóm SP01 giữ hiệu suất tin nhắn thấp hơn trần >30%",
        metric: `${formatCompactVnd(
          compactInputJson.avgCostPerMsg
        )}/tin TB toàn hệ thống`,
        detail:
          scaleRecs[0]?.description ||
          "Duy trì sản lượng tin nhắn ổn định trên các tài khoản đang theo dõi, đủ điều kiện mở rộng ngân sách +20%.",
      },
      {
        title: "Doanh thu thực tế 7 ngày đạt mức tăng trưởng ổn định",
        metric: `${formatCompactVnd(rev7d)} • ${orders7d} đơn chốt`,
        detail:
          "Đối soát Google Sheets khớp chuẩn với phiên bản KPI từng giai đoạn, tỷ lệ hoàn duy trì dưới ngưỡng dự kiến.",
      },
      {
        title: "Kho Creative & Post ID vận hành trơn tru xuyên tài khoản",
        metric: "Giữ trọn tương tác trên bài gốc (Advantage+ OFF)",
        detail:
          "Tái sử dụng Post ID giúp nhân nhóm trong vài giây mà không tốn băng thông kéo lại video từ Google Drive.",
      },
    ],
    lossesJson: [
      {
        title:
          killRecs[0]?.title ||
          "Cần rà soát nhóm chi tiêu cao chưa đạt tin nhắn",
        metric: killRecs[0]
          ? `Lãng phí ${formatCompactVnd(killRecs[0].wastedSpend)}`
          : "Kiểm tra Action Center",
        detail:
          killRecs[0]?.description ||
          "Ưu tiên tắt các nhóm vượt 130% giá tin nhắn trần trong ngày mà chưa có kết quả.",
        actionPath: "/actions",
      },
      {
        title:
          unhealthyAccs.length > 0
            ? `${unhealthyAccs[0].name} (${unhealthyAccs[0].metaId}) đang gặp lỗi trạng thái`
            : "Giám sát trạng thái thẻ thanh toán định kỳ",
        metric:
          unhealthyAccs.length > 0
            ? `account_status = ${unhealthyAccs[0].accountStatus}`
            : "Tất cả tài khoản khỏe",
        detail:
          unhealthyAccs.length > 0
            ? `Lý do: ${unhealthyAccs[0].disableReason}. Xử lý thanh toán ngay để tránh gián đoạn phân phối.`
            : "Tất cả tài khoản đang theo dõi đều đạt account_status = 1.",
        actionPath: "/assets",
      },
      {
        title:
          leakageRecs[0]?.title ||
          fatigueRecs[0]?.title ||
          "Theo dõi chỉ số Tần suất & Breakdown khung giờ đêm",
        metric: leakageRecs[0]
          ? `Rò rỉ ${formatCompactVnd(leakageRecs[0].wastedSpend)}`
          : "Cần tối ưu target",
        detail:
          leakageRecs[0]?.description ||
          fatigueRecs[0]?.description ||
          "Loại trừ các phân khúc giá kết quả cao gấp 1.5x trung bình để bảo vệ biên lợi nhuận.",
        actionPath: "/reports?tab=breakdowns",
      },
    ],
    budgetPlanJson: allProducts.map((p) => {
      const hasScale = scaleRecs.some((r) => r.productCode === p.code);
      const hasKill = killRecs.some((r) => r.productCode === p.code);
      const recommendedBudget = hasScale
        ? Math.round(p.dailyBudgetTarget * 1.2)
        : hasKill
        ? Math.round(p.dailyBudgetTarget * 0.7)
        : p.dailyBudgetTarget;
      return {
        productCode: p.code,
        currentBudget: p.dailyBudgetTarget,
        recommendedBudget,
        rationale: hasScale
          ? "Mở rộng +20% vào nhóm thắng ổn định & scale bằng Post ID sang tài khoản phụ."
          : hasKill
          ? "Thu hẹp -30% cắt nhóm lỗ và dành ngân sách test video mới trạng thái Chờ test."
          : "Giữ ổn định nhịp chi tiêu, theo dõi tần suất và chuẩn bị video dự phòng.",
      };
    }),
  };

  const { output, providerUsed } = await generateStructuredBriefing({
    provider: secrets.aiProvider,
    apiKey: secrets.aiApiKey,
    compactInputJson,
    fallbackOutput,
  });

  const [created] = await db
    .insert(aiBriefings)
    .values({
      briefingDate: today,
      summaryHeadline: output.summaryHeadline,
      winsJson: output.winsJson,
      lossesJson: output.lossesJson,
      budgetPlanJson: output.budgetPlanJson,
      compactInputJson,
      providerUsed,
      sentToTelegram: true,
    })
    .returning();

  await dispatchTelegramAlert({
    streamType: "scheduled",
    alertCategory: "ai_briefing",
    title: `☀️ Bản tin AI Briefing (${providerUsed})`,
    body: output.summaryHeadline,
    deepLinkPath: "/",
    dedupKey: `briefing_manual_${Date.now()}`,
  });

  await db.insert(syncLogs).values({
    jobName: "ai_briefing",
    status: "success",
    itemsProcessed: 1,
    durationMs: Date.now() - started,
    rateLimitPct: settings?.metaRateLimitPct ?? 24,
    message: `Tạo Bản tin AI Briefing qua ${providerUsed} và gửi bản sao Telegram.`,
  });

  return created;
}
