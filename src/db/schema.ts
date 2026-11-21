import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  real,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  metaSystemUserToken: text("meta_system_user_token").default(""),
  metaBusinessManagerId: text("meta_business_manager_id").default(""),
  googleDriveRootFolderId: text("google_drive_root_folder_id").default(""),
  googleSheetsUrl: text("google_sheets_url").default(""),
  googleServiceAccountJson: text("google_service_account_json").default(""),
  telegramBotToken: text("telegram_bot_token").default(""),
  telegramChatId: text("telegram_chat_id").default(""),
  aiApiKey: text("ai_api_key").default(""),
  aiProvider: text("ai_provider").default("gemini-2.5-flash").notNull(),
  dailyBudgetSafetyCap: bigint("daily_budget_safety_cap", { mode: "number" })
    .default(10000000)
    .notNull(),
  ruleConfigJson: jsonb("rule_config_json")
    .$type<{
      killMsgCeilingPct: number;
      killMinSpend: number;
      scaleTargetDiscountPct: number;
      scaleMinMessages: number;
      scaleMinDays: number;
      fatigueFrequencyThreshold: number;
      fatigueCtrDropDays: number;
      leakageSpendSharePct: number;
      leakageCostMultiplier: number;
    }>()
    .notNull(),
  metaRateLimitPct: integer("meta_rate_limit_pct").default(24).notNull(),
  metaCpuUsagePct: integer("meta_cpu_usage_pct").default(18).notNull(),
  metaTimeUsagePct: integer("meta_time_usage_pct").default(21).notNull(),
  throttleMode: boolean("throttle_mode").default(false).notNull(),
  connectionStatuses: jsonb("connection_statuses")
    .$type<
      Record<
        string,
        {
          ok: boolean;
          mode: "live" | "sandbox";
          checkedAt: string;
          message: string;
          details?: Record<string, unknown>;
        }
      >
    >()
    .default({})
    .notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const metaAssets = pgTable("meta_assets", {
  id: serial("id").primaryKey(),
  assetType: text("asset_type").notNull(), // 'ad_account' | 'fanpage' | 'pixel'
  metaId: text("meta_id").notNull().unique(),
  name: text("name").notNull(),
  ownershipType: text("ownership_type").default("owned").notNull(), // 'owned' | 'client'
  accountStatus: integer("account_status").default(1).notNull(), // 1=ACTIVE, 2=DISABLED, 3=UNSETTLED, 9=IN_GRACE_PERIOD
  disableReason: text("disable_reason").default("NONE").notNull(),
  amountSpent: bigint("amount_spent", { mode: "number" }).default(0).notNull(),
  spendCap: bigint("spend_cap", { mode: "number" }).default(0).notNull(),
  dailySpendLimit: bigint("daily_spend_limit", { mode: "number" })
    .default(0)
    .notNull(),
  fundingSourceDetails: text("funding_source_details").default("").notNull(),
  currency: text("currency").default("VND").notNull(),
  isMonitored: boolean("is_monitored").default(true).notNull(),
  lastAlertSentAt: timestamp("last_alert_sent_at"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").default("Thời trang / Gia dụng").notNull(),
  status: text("status").default("active").notNull(),
  dailyBudgetTarget: bigint("daily_budget_target", { mode: "number" })
    .default(5000000)
    .notNull(),
  weeklyBudgetTarget: bigint("weekly_budget_target", { mode: "number" })
    .default(35000000)
    .notNull(),
  monthlyBudgetTarget: bigint("monthly_budget_target", { mode: "number" })
    .default(150000000)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productKpiVersions = pgTable("product_kpi_versions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").default(1).notNull(),
  effectiveFrom: text("effective_from").notNull(), // YYYY-MM-DD
  avgSellingPrice: bigint("avg_selling_price", { mode: "number" }).notNull(),
  cogs: bigint("cogs", { mode: "number" }).notNull(),
  shippingPackingFee: bigint("shipping_packing_fee", { mode: "number" }).notNull(),
  expectedReturnRatePct: real("expected_return_rate_pct").notNull(),
  otherCost: bigint("other_cost", { mode: "number" }).default(0).notNull(),
  targetNetMarginPct: real("target_net_margin_pct").notNull(),
  targetCloseRatePct: real("target_close_rate_pct").notNull(),
  breakevenCpo: bigint("breakeven_cpo", { mode: "number" }).notNull(),
  targetCpo: bigint("target_cpo", { mode: "number" }).notNull(),
  ceilingMessageCost: bigint("ceiling_message_cost", { mode: "number" }).notNull(),
  note: text("note").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creatives = pgTable("creatives", {
  id: serial("id").primaryKey(),
  creativeCode: text("creative_code").notNull().unique(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  driveFileId: text("drive_file_id").notNull(),
  driveFolderPath: text("drive_folder_path").notNull(),
  fileName: text("file_name").notNull(),
  mediaType: text("media_type").default("video").notNull(), // 'video' | 'image'
  fileSizeMb: real("file_size_mb").default(0).notNull(),
  durationSec: integer("duration_sec").default(0).notNull(),
  thumbnailUrl: text("thumbnail_url").default("").notNull(),
  hookAngle: text("hook_angle").default("").notNull(),
  lifecycleStatus: text("lifecycle_status").default("cho_test").notNull(), // 'cho_test' | 'dang_chay' | 'winning' | 'bao_hoa'
  sizeWarning: boolean("size_warning").default(false).notNull(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const metaMediaCache = pgTable("meta_media_cache", {
  id: serial("id").primaryKey(),
  creativeId: integer("creative_id")
    .notNull()
    .references(() => creatives.id, { onDelete: "cascade" }),
  adAccountMetaId: text("ad_account_meta_id").notNull(),
  metaVideoId: text("meta_video_id").notNull(),
  encodingStatus: text("encoding_status").default("ready").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const metaPosts = pgTable("meta_posts", {
  id: serial("id").primaryKey(),
  creativeId: integer("creative_id").references(() => creatives.id, {
    onDelete: "set null",
  }),
  pageMetaId: text("page_meta_id").notNull(),
  pageName: text("page_name").notNull(),
  effectiveObjectStoryId: text("effective_object_story_id").notNull().unique(),
  copyVersion: text("copy_version").default("Bản chữ A").notNull(),
  primaryText: text("primary_text").default("").notNull(),
  headline: text("headline").default("").notNull(),
  ctaType: text("cta_type").default("SEND_MESSAGE").notNull(),
  source: text("source").default("launcher_flow1").notNull(),
  advantagePlusDisabled: boolean("advantage_plus_disabled")
    .default(true)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adPresets = pgTable("ad_presets", {
  id: serial("id").primaryKey(),
  presetType: text("preset_type").notNull(), // 'target' | 'message'
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  configJson: jsonb("config_json").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adDrafts = pgTable("ad_drafts", {
  id: serial("id").primaryKey(),
  flowType: text("flow_type").notNull(), // 'flow1_drive' | 'flow2_post_id' | 'flow3_video_id'
  status: text("status").default("draft").notNull(), // 'draft' | 'launched_paused' | 'failed'
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  adAccountMetaId: text("ad_account_meta_id").default("").notNull(),
  pageMetaId: text("page_meta_id").default("").notNull(),
  generatedCampaignName: text("generated_campaign_name").default("").notNull(),
  generatedAdsetName: text("generated_adset_name").default("").notNull(),
  generatedAdName: text("generated_ad_name").default("").notNull(),
  payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().notNull(),
  metaResultJson: jsonb("meta_result_json").$type<Record<string, unknown>>(),
  errorCode: text("error_code"),
  errorMessageVi: text("error_message_vi"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adInsights = pgTable("ad_insights", {
  id: serial("id").primaryKey(),
  reportDate: text("report_date").notNull(), // YYYY-MM-DD
  adAccountMetaId: text("ad_account_meta_id").notNull(),
  productCode: text("product_code").notNull(),
  campaignMetaId: text("campaign_meta_id").notNull(),
  campaignName: text("campaign_name").notNull(),
  adsetMetaId: text("adset_meta_id").notNull(),
  adsetName: text("adset_name").notNull(),
  adMetaId: text("ad_meta_id").notNull(),
  adName: text("ad_name").notNull(),
  effectiveObjectStoryId: text("effective_object_story_id").default("").notNull(),
  creativeCode: text("creative_code").default("").notNull(),
  entityStatus: text("entity_status").default("ACTIVE").notNull(),
  dailyBudget: bigint("daily_budget", { mode: "number" }).default(0).notNull(),
  spend: bigint("spend", { mode: "number" }).default(0).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  reach: integer("reach").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  messages: integer("messages").default(0).notNull(),
  video3sViews: integer("video_3s_views").default(0).notNull(),
  thruplayViews: integer("thruplay_views").default(0).notNull(),
  frequency: real("frequency").default(1).notNull(),
  cpm: real("cpm").default(0).notNull(),
  ctr: real("ctr").default(0).notNull(),
  costPerMessage: real("cost_per_message").default(0).notNull(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const insightBreakdowns = pgTable("insight_breakdowns", {
  id: serial("id").primaryKey(),
  reportDate: text("report_date").notNull(),
  productCode: text("product_code").notNull(),
  dimensionType: text("dimension_type").notNull(), // 'hour' | 'age_gender' | 'platform' | 'region'
  dimensionValue: text("dimension_value").notNull(),
  spend: bigint("spend", { mode: "number" }).default(0).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  messages: integer("messages").default(0).notNull(),
  costPerMessage: real("cost_per_message").default(0).notNull(),
});

export const dailySalesReconciliation = pgTable("daily_sales_reconciliation", {
  id: serial("id").primaryKey(),
  reportDate: text("report_date").notNull(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  ordersClosed: integer("orders_closed").default(0).notNull(),
  actualRevenue: bigint("actual_revenue", { mode: "number" }).default(0).notNull(),
  returnedOrders: integer("returned_orders").default(0).notNull(),
  actualReturnRatePct: real("actual_return_rate_pct").default(0).notNull(),
  source: text("source").default("google_sheets").notNull(), // 'google_sheets' | 'manual_override'
  note: text("note").default("").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const actionRecommendations = pgTable("action_recommendations", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // 'kill' | 'scale' | 'fatigue' | 'leakage'
  priority: text("priority").default("high").notNull(), // 'high' | 'medium' | 'low'
  title: text("title").notNull(),
  description: text("description").notNull(),
  productCode: text("product_code").notNull(),
  adAccountMetaId: text("ad_account_meta_id").default("").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  entityName: text("entity_name").notNull(),
  wastedSpend: bigint("wasted_spend", { mode: "number" }).default(0).notNull(),
  metricsSnapshotJson: jsonb("metrics_snapshot_json")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  suggestedActionJson: jsonb("suggested_action_json")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  status: text("status").default("open").notNull(), // 'open' | 'resolved' | 'dismissed'
  decisionNote: text("decision_note").default("").notNull(),
  decidedAt: timestamp("decided_at"),
  cooldownUntil: timestamp("cooldown_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiBriefings = pgTable("ai_briefings", {
  id: serial("id").primaryKey(),
  briefingDate: text("briefing_date").notNull(),
  summaryHeadline: text("summary_headline").notNull(),
  winsJson: jsonb("wins_json")
    .$type<Array<{ title: string; metric: string; detail: string }>>()
    .notNull(),
  lossesJson: jsonb("losses_json")
    .$type<Array<{ title: string; metric: string; detail: string; actionPath?: string }>>()
    .notNull(),
  budgetPlanJson: jsonb("budget_plan_json")
    .$type<Array<{ productCode: string; currentBudget: number; recommendedBudget: number; rationale: string }>>()
    .notNull(),
  compactInputJson: jsonb("compact_input_json")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  providerUsed: text("provider_used").default("AdsPulse AI Engine").notNull(),
  sentToTelegram: boolean("sent_to_telegram").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  jobName: text("job_name").notNull(),
  status: text("status").notNull(), // 'success' | 'error' | 'throttled'
  itemsProcessed: integer("items_processed").default(0).notNull(),
  durationMs: integer("duration_ms").default(0).notNull(),
  rateLimitPct: integer("rate_limit_pct").default(0).notNull(),
  message: text("message").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const telegramAlerts = pgTable("telegram_alerts", {
  id: serial("id").primaryKey(),
  streamType: text("stream_type").notNull(), // 'realtime' | 'scheduled'
  alertCategory: text("alert_category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  deepLinkPath: text("deep_link_path").default("/").notNull(),
  dedupKey: text("dedup_key").default("").notNull(),
  deliveryStatus: text("delivery_status").default("sent").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
