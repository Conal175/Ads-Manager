/**
 * Centralized Domain Types & Constants
 * Tất cả kiểu dữ liệu dùng chung giữa Database, Services, API Routes và UI Components
 * được định nghĩa tại đây để dễ dàng tra cứu và chỉnh sửa trên Gemini.
 */

export interface RuleConfig {
  killMsgCeilingPct: number;
  killMinSpend: number;
  scaleTargetDiscountPct: number;
  scaleMinMessages: number;
  scaleMinDays: number;
  fatigueFrequencyThreshold: number;
  fatigueCtrDropDays: number;
  leakageSpendSharePct: number;
  leakageCostMultiplier: number;
}

export const DEFAULT_RULE_CONFIG: RuleConfig = {
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

export const REQUIRED_META_PERMISSIONS = [
  "ads_read",
  "ads_management",
  "pages_read_engagement",
  "pages_show_list",
] as const;

export const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "Google Gemini 2.5 Flash (Khuyên dùng - Nhanh & Rẻ)" },
  { id: "gemini-2.5-pro", label: "Google Gemini 2.5 Pro (Phân tích chuyên sâu)" },
  { id: "openai-gpt-4o-mini", label: "OpenAI GPT-4o Mini (Dự phòng)" },
] as const;

export const CRON_JOB_METADATA: Record<
  string,
  { name: string; schedule: string; defaultMessage: string }
> = {
  meta_insights: {
    name: "Meta Insights 3 cấp",
    schedule: "Mỗi 30–60 phút",
    defaultMessage:
      "Đồng bộ định kỳ Insights 3 cấp cho các tài khoản đang bật Theo dõi thành công.",
  },
  meta_backfill_3d: {
    name: "Backfill 3 ngày (Khớp trễ)",
    schedule: "02:00 sáng hàng ngày",
    defaultMessage:
      "Chạy tác vụ 02:00 sáng quét lại số liệu 3 ngày gần nhất khớp chuyển đổi ghi nhận trễ thành công.",
  },
  meta_assets: {
    name: "Đồng bộ Tài sản BM",
    schedule: "Mỗi 30 phút",
    defaultMessage: "Đồng bộ danh sách TKQC, Fanpage và Pixel thuộc Business Manager.",
  },
  google_drive: {
    name: "Quét Kho Creative Drive",
    schedule: "Mỗi 60 phút",
    defaultMessage:
      "Quét siêu dữ liệu thư mục Kho_Ads/[Mã_SP]/[Tháng] trên Google Drive thành công.",
  },
  google_sheets: {
    name: "Đối soát Google Sheets",
    schedule: "Mỗi 60 phút",
    defaultMessage:
      "Đối soát đơn chốt, doanh thu thực và tỷ lệ hoàn từ Google Sheets thành công.",
  },
  rule_engine: {
    name: "Quét quy tắc Action Center",
    schedule: "11:00 / 16:00 / 22:00",
    defaultMessage: "Đối chiếu chỉ số thực tế với KPI sản phẩm phát hiện đề xuất hành động.",
  },
  ai_briefing: {
    name: "Bản tin AI Briefing (Gemini)",
    schedule: "07:30 sáng hàng ngày",
    defaultMessage: "Tổng hợp JSON tinh gọn gửi Gemini API tạo bản tin sáng.",
  },
};

export interface ConnectionStatusResult {
  ok: boolean;
  mode: "live" | "sandbox";
  checkedAt: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SettingsDTO {
  id?: number;
  metaSystemUserToken: string;
  metaBusinessManagerId: string;
  googleDriveRootFolderId: string;
  googleSheetsUrl: string;
  googleServiceAccountJson: string;
  telegramBotToken: string;
  telegramChatId: string;
  aiApiKey: string;
  aiProvider: string;
  dailyBudgetSafetyCap: number;
  ruleConfigJson: RuleConfig;
  metaRateLimitPct: number;
  metaCpuUsagePct: number;
  metaTimeUsagePct: number;
  throttleMode: boolean;
  connectionStatuses: Record<string, ConnectionStatusResult>;
  envKeyDetected?: {
    gemini: boolean;
    meta: boolean;
    telegram: boolean;
  };
}

export interface MetaAssetDTO {
  id: number;
  assetType: "ad_account" | "fanpage" | "pixel" | string;
  metaId: string;
  name: string;
  ownershipType: string;
  accountStatus: number;
  disableReason: string;
  amountSpent: number;
  spendCap: number;
  dailySpendLimit: number;
  fundingSourceDetails: string;
  currency: string;
  isMonitored: boolean;
  lastAlertSentAt: string | Date | null;
  syncedAt: string | Date;
}

export interface KpiVersionDTO {
  id: number;
  productId: number;
  versionNumber: number;
  effectiveFrom: string;
  avgSellingPrice: number;
  cogs: number;
  shippingPackingFee: number;
  expectedReturnRatePct: number;
  otherCost: number;
  targetNetMarginPct: number;
  targetCloseRatePct: number;
  breakevenCpo: number;
  targetCpo: number;
  ceilingMessageCost: number;
  note: string;
}

export interface ProductWithKpiDTO {
  id: number;
  code: string;
  name: string;
  category: string;
  status?: string;
  dailyBudgetTarget: number;
  weeklyBudgetTarget: number;
  monthlyBudgetTarget: number;
  currentKpi: KpiVersionDTO | null;
  kpiVersions: KpiVersionDTO[];
  pacing: {
    expectedSpendToNow: number;
    actualSpend: number;
    pacingRatioPct: number;
    status: "slow" | "on_track" | "overspending";
    label: string;
    hourOfDay: number;
  };
}

export interface MediaCacheDTO {
  id: number;
  creativeId: number;
  adAccountMetaId: string;
  metaVideoId: string;
  encodingStatus: string;
  uploadedAt: string | Date;
}

export interface MetaPostDTO {
  id: number;
  creativeId: number | null;
  pageMetaId: string;
  pageName: string;
  effectiveObjectStoryId: string;
  copyVersion: string;
  primaryText: string;
  headline: string;
  ctaType: string;
  source: string;
  advantagePlusDisabled: boolean;
}

export interface CreativeDTO {
  id: number;
  creativeCode: string;
  productId: number;
  driveFileId: string;
  driveFolderPath: string;
  fileName: string;
  mediaType: string;
  fileSizeMb: number;
  durationSec: number;
  thumbnailUrl?: string;
  hookAngle: string;
  lifecycleStatus: string;
  sizeWarning: boolean;
  product: { id: number; code: string; name: string } | null;
  mediaCache: MediaCacheDTO[];
  posts: MetaPostDTO[];
}

export interface AdPresetDTO {
  id: number;
  presetType: "target" | "message" | string;
  code: string;
  name: string;
  configJson: Record<string, unknown>;
}

export interface AdDraftDTO {
  id: number;
  flowType: string;
  status: string;
  productId: number | null;
  adAccountMetaId: string;
  pageMetaId: string;
  generatedCampaignName: string;
  generatedAdsetName: string;
  generatedAdName: string;
  payloadJson: Record<string, unknown>;
  metaResultJson: Record<string, unknown> | null;
  updatedAt: string | Date;
}

export type LauncherFlowType = "flow1_drive" | "flow2_post_id" | "flow3_video_id";

export interface DerivedMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  messages: number;
  video3sViews: number;
  thruplayViews: number;
  dailyBudget: number;
  ctr: number;
  cpm: number;
  frequency: number;
  costPerMessage: number;
  hookRate: number;
  holdRate: number;
}

export interface CampaignHierarchyNode {
  campaignMetaId: string;
  campaignName: string;
  adAccountMetaId: string;
  productCode: string;
  status: string;
  metrics: DerivedMetrics;
  adsets: Array<{
    adsetMetaId: string;
    adsetName: string;
    status: string;
    metrics: DerivedMetrics;
    ads: Array<{
      adMetaId: string;
      adName: string;
      creativeCode: string;
      effectiveObjectStoryId: string;
      status: string;
      metrics: DerivedMetrics;
    }>;
  }>;
}

export interface CreativeLeaderboardRow {
  creativeCode: string;
  fileName: string;
  hookAngle: string;
  lifecycleStatus: string;
  productCode: string;
  accountsCount: number;
  postIdsCount: number;
  metrics: DerivedMetrics;
}

export interface BreakdownItem {
  id: number;
  reportDate: string;
  productCode: string;
  dimensionType: string;
  dimensionValue: string;
  spend: number;
  impressions: number;
  messages: number;
  costPerMessage: number;
}

export interface RealProfitRow {
  id: number;
  reportDate: string;
  productId: number;
  productCode: string;
  productName: string;
  kpiVersionUsed: string;
  breakevenCpoAtDate: number;
  targetCpoAtDate: number;
  adSpend: number;
  messages: number;
  ordersClosed: number;
  returnedOrders: number;
  actualReturnRatePct: number;
  actualRevenue: number;
  actualCloseRatePct: number;
  actualCpo: number;
  cirPct: number;
  estNetProfit: number;
  source: string;
  note: string;
}

export interface ActionRecommendationDTO {
  id: number;
  category: "kill" | "scale" | "fatigue" | "leakage";
  priority: string;
  title: string;
  description: string;
  productCode: string;
  adAccountMetaId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  wastedSpend: number;
  metricsSnapshotJson: Record<string, unknown>;
  suggestedActionJson: {
    actionLabel?: string;
    recommendedBudgetIncreasePct?: number;
    recommendedNewBudget?: number;
    postId?: string;
    launcherUrl?: string;
    suggestedCreatives?: Array<{
      creativeCode: string;
      fileName: string;
      hookAngle: string;
    }>;
  };
  status: "open" | "resolved" | "dismissed";
  decisionNote: string;
  decidedAt: string | Date | null;
  cooldownUntil: string | Date | null;
  createdAt: string | Date;
}

export interface AiBriefingStructuredOutput {
  summaryHeadline: string;
  winsJson: Array<{ title: string; metric: string; detail: string }>;
  lossesJson: Array<{
    title: string;
    metric: string;
    detail: string;
    actionPath?: string;
  }>;
  budgetPlanJson: Array<{
    productCode: string;
    currentBudget: number;
    recommendedBudget: number;
    rationale: string;
  }>;
}
