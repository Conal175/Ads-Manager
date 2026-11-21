CREATE TABLE "action_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'high' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"product_code" text NOT NULL,
	"ad_account_meta_id" text DEFAULT '' NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_name" text NOT NULL,
	"wasted_spend" bigint DEFAULT 0 NOT NULL,
	"metrics_snapshot_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"suggested_action_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"decision_note" text DEFAULT '' NOT NULL,
	"decided_at" timestamp,
	"cooldown_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"flow_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"product_id" integer,
	"ad_account_meta_id" text DEFAULT '' NOT NULL,
	"page_meta_id" text DEFAULT '' NOT NULL,
	"generated_campaign_name" text DEFAULT '' NOT NULL,
	"generated_adset_name" text DEFAULT '' NOT NULL,
	"generated_ad_name" text DEFAULT '' NOT NULL,
	"payload_json" jsonb NOT NULL,
	"meta_result_json" jsonb,
	"error_code" text,
	"error_message_vi" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"ad_account_meta_id" text NOT NULL,
	"product_code" text NOT NULL,
	"campaign_meta_id" text NOT NULL,
	"campaign_name" text NOT NULL,
	"adset_meta_id" text NOT NULL,
	"adset_name" text NOT NULL,
	"ad_meta_id" text NOT NULL,
	"ad_name" text NOT NULL,
	"effective_object_story_id" text DEFAULT '' NOT NULL,
	"creative_code" text DEFAULT '' NOT NULL,
	"entity_status" text DEFAULT 'ACTIVE' NOT NULL,
	"daily_budget" bigint DEFAULT 0 NOT NULL,
	"spend" bigint DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"reach" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"video_3s_views" integer DEFAULT 0 NOT NULL,
	"thruplay_views" integer DEFAULT 0 NOT NULL,
	"frequency" real DEFAULT 1 NOT NULL,
	"cpm" real DEFAULT 0 NOT NULL,
	"ctr" real DEFAULT 0 NOT NULL,
	"cost_per_message" real DEFAULT 0 NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"preset_type" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"config_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ad_presets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ai_briefings" (
	"id" serial PRIMARY KEY NOT NULL,
	"briefing_date" text NOT NULL,
	"summary_headline" text NOT NULL,
	"wins_json" jsonb NOT NULL,
	"losses_json" jsonb NOT NULL,
	"budget_plan_json" jsonb NOT NULL,
	"compact_input_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_used" text DEFAULT 'AdsPulse AI Engine' NOT NULL,
	"sent_to_telegram" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"creative_code" text NOT NULL,
	"product_id" integer NOT NULL,
	"drive_file_id" text NOT NULL,
	"drive_folder_path" text NOT NULL,
	"file_name" text NOT NULL,
	"media_type" text DEFAULT 'video' NOT NULL,
	"file_size_mb" real DEFAULT 0 NOT NULL,
	"duration_sec" integer DEFAULT 0 NOT NULL,
	"thumbnail_url" text DEFAULT '' NOT NULL,
	"hook_angle" text DEFAULT '' NOT NULL,
	"lifecycle_status" text DEFAULT 'cho_test' NOT NULL,
	"size_warning" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "creatives_creative_code_unique" UNIQUE("creative_code")
);
--> statement-breakpoint
CREATE TABLE "daily_sales_reconciliation" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"product_id" integer NOT NULL,
	"orders_closed" integer DEFAULT 0 NOT NULL,
	"actual_revenue" bigint DEFAULT 0 NOT NULL,
	"returned_orders" integer DEFAULT 0 NOT NULL,
	"actual_return_rate_pct" real DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'google_sheets' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insight_breakdowns" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" text NOT NULL,
	"product_code" text NOT NULL,
	"dimension_type" text NOT NULL,
	"dimension_value" text NOT NULL,
	"spend" bigint DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"cost_per_message" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_type" text NOT NULL,
	"meta_id" text NOT NULL,
	"name" text NOT NULL,
	"ownership_type" text DEFAULT 'owned' NOT NULL,
	"account_status" integer DEFAULT 1 NOT NULL,
	"disable_reason" text DEFAULT 'NONE' NOT NULL,
	"amount_spent" bigint DEFAULT 0 NOT NULL,
	"spend_cap" bigint DEFAULT 0 NOT NULL,
	"daily_spend_limit" bigint DEFAULT 0 NOT NULL,
	"funding_source_details" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"is_monitored" boolean DEFAULT true NOT NULL,
	"last_alert_sent_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meta_assets_meta_id_unique" UNIQUE("meta_id")
);
--> statement-breakpoint
CREATE TABLE "meta_media_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"creative_id" integer NOT NULL,
	"ad_account_meta_id" text NOT NULL,
	"meta_video_id" text NOT NULL,
	"encoding_status" text DEFAULT 'ready' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"creative_id" integer,
	"page_meta_id" text NOT NULL,
	"page_name" text NOT NULL,
	"effective_object_story_id" text NOT NULL,
	"copy_version" text DEFAULT 'Bản chữ A' NOT NULL,
	"primary_text" text DEFAULT '' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"cta_type" text DEFAULT 'SEND_MESSAGE' NOT NULL,
	"source" text DEFAULT 'launcher_flow1' NOT NULL,
	"advantage_plus_disabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meta_posts_effective_object_story_id_unique" UNIQUE("effective_object_story_id")
);
--> statement-breakpoint
CREATE TABLE "product_kpi_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"effective_from" text NOT NULL,
	"avg_selling_price" bigint NOT NULL,
	"cogs" bigint NOT NULL,
	"shipping_packing_fee" bigint NOT NULL,
	"expected_return_rate_pct" real NOT NULL,
	"other_cost" bigint DEFAULT 0 NOT NULL,
	"target_net_margin_pct" real NOT NULL,
	"target_close_rate_pct" real NOT NULL,
	"breakeven_cpo" bigint NOT NULL,
	"target_cpo" bigint NOT NULL,
	"ceiling_message_cost" bigint NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'Thời trang / Gia dụng' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"daily_budget_target" bigint DEFAULT 5000000 NOT NULL,
	"weekly_budget_target" bigint DEFAULT 35000000 NOT NULL,
	"monthly_budget_target" bigint DEFAULT 150000000 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"status" text NOT NULL,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"rate_limit_pct" integer DEFAULT 0 NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"meta_system_user_token" text DEFAULT '',
	"meta_business_manager_id" text DEFAULT '',
	"google_drive_root_folder_id" text DEFAULT '',
	"google_sheets_url" text DEFAULT '',
	"google_service_account_json" text DEFAULT '',
	"telegram_bot_token" text DEFAULT '',
	"telegram_chat_id" text DEFAULT '',
	"ai_api_key" text DEFAULT '',
	"ai_provider" text DEFAULT 'gemini-2.5-flash' NOT NULL,
	"daily_budget_safety_cap" bigint DEFAULT 10000000 NOT NULL,
	"rule_config_json" jsonb NOT NULL,
	"meta_rate_limit_pct" integer DEFAULT 24 NOT NULL,
	"meta_cpu_usage_pct" integer DEFAULT 18 NOT NULL,
	"meta_time_usage_pct" integer DEFAULT 21 NOT NULL,
	"throttle_mode" boolean DEFAULT false NOT NULL,
	"connection_statuses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"stream_type" text NOT NULL,
	"alert_category" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"deep_link_path" text DEFAULT '/' NOT NULL,
	"dedup_key" text DEFAULT '' NOT NULL,
	"delivery_status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_drafts" ADD CONSTRAINT "ad_drafts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sales_reconciliation" ADD CONSTRAINT "daily_sales_reconciliation_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_media_cache" ADD CONSTRAINT "meta_media_cache_creative_id_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_posts" ADD CONSTRAINT "meta_posts_creative_id_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_kpi_versions" ADD CONSTRAINT "product_kpi_versions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The application connects directly as a trusted server role. Block Supabase's
-- public Data API roles by default; no anon/authenticated policies are created.
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_kpi_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_media_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_alerts ENABLE ROW LEVEL SECURITY;
