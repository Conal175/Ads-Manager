import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  adDrafts,
  creatives,
  metaAssets,
  metaMediaCache,
  systemSettings,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { runPreflightChecks, translateMetaError } from "@/lib/meta-errors";
import { jsonError } from "@/lib/api-utils";
import { executePausedCampaignLaunch } from "@/services/launcher-service";
import type { LauncherFlowType } from "@/types/domain";

export async function GET() {
  try {
    await ensureSeeded();
    const drafts = await db
      .select()
      .from(adDrafts)
      .orderBy(desc(adDrafts.updatedAt))
      .limit(20);
    return NextResponse.json({ drafts });
  } catch (err) {
    console.error("GET /api/launcher error:", err);
    return jsonError("Lỗi tải lịch sử lên Ads.");
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action as "preflight" | "save_draft" | "launch";
    const flowType = (body.flowType as LauncherFlowType) || "flow1_drive";

    const [settings] = await db.select().from(systemSettings).limit(1);
    const safetyCap = settings?.dailyBudgetSafetyCap ?? 10000000;

    const adAccountId = String(body.adAccountMetaId || "");
    const targetAccountIds: string[] = Array.isArray(body.adAccountIds)
      ? (body.adAccountIds as string[])
      : adAccountId
      ? [adAccountId]
      : [];

    const allAccounts = await db
      .select()
      .from(metaAssets)
      .where(eq(metaAssets.assetType, "ad_account"));
    const primaryAccount = allAccounts.find(
      (a) => a.metaId === (targetAccountIds[0] || adAccountId)
    );

    let creativeRecord = null;
    let cachedVideo = null;
    if (body.creativeId) {
      const [cr] = await db
        .select()
        .from(creatives)
        .where(eq(creatives.id, Number(body.creativeId)));
      creativeRecord = cr ?? null;

      if (creativeRecord && primaryAccount) {
        const [cacheHit] = await db
          .select()
          .from(metaMediaCache)
          .where(
            and(
              eq(metaMediaCache.creativeId, creativeRecord.id),
              eq(metaMediaCache.adAccountMetaId, primaryAccount.metaId)
            )
          );
        cachedVideo = cacheHit ?? null;
      }
    }

    const preflight = runPreflightChecks({
      flowType,
      objective:
        (body.objective as "MESSAGES" | "CONVERSIONS" | "TRAFFIC") || "MESSAGES",
      dailyBudget: Number(body.dailyBudget || 0),
      dailyBudgetSafetyCap: safetyCap,
      adAccountMetaId: primaryAccount?.metaId || adAccountId,
      adAccountStatus: primaryAccount?.accountStatus,
      pageMetaId: String(body.pageMetaId || ""),
      ctaType: String(body.ctaType || "SEND_MESSAGE"),
      effectiveObjectStoryId: String(body.effectiveObjectStoryId || ""),
      creativeFileSizeMb: creativeRecord?.fileSizeMb,
      adAccountIds: targetAccountIds,
      hasCachedVideo: Boolean(cachedVideo),
    });

    if (action === "preflight") {
      return NextResponse.json({ preflight, cachedVideo });
    }

    if (action === "save_draft") {
      const [draft] = await db
        .insert(adDrafts)
        .values({
          flowType,
          status: "draft",
          productId: body.productId ? Number(body.productId) : null,
          adAccountMetaId: primaryAccount?.metaId || adAccountId,
          pageMetaId: String(body.pageMetaId || ""),
          generatedCampaignName: String(body.generatedCampaignName || ""),
          generatedAdsetName: String(body.generatedAdsetName || ""),
          generatedAdName: String(body.generatedAdName || ""),
          payloadJson: body,
        })
        .returning();

      return NextResponse.json({
        draft,
        message: "Đã lưu bản nháp thành công.",
      });
    }

    if (!preflight.canLaunch) {
      const firstErr = preflight.checks.find((c) => c.level === "error");
      let code = "100";
      let subcode: string | undefined;
      if (firstErr?.id === "cta_mismatch") subcode = "1885183";
      else if (
        firstErr?.id === "post_id_page_mismatch" ||
        firstErr?.id === "post_id_invalid"
      )
        subcode = "1487390";
      else if (firstErr?.id === "budget_min") subcode = "2446391";
      else if (firstErr?.id === "ad_account_unhealthy") code = "2635";

      const translated = translateMetaError(code, subcode, firstErr?.detail);
      return NextResponse.json(
        { ok: false, preflight, translatedError: translated },
        { status: 400 }
      );
    }

    const result = await executePausedCampaignLaunch({
      flowType,
      body,
      targetAccountIds,
      primaryAccount,
      creativeRecord,
      cachedVideo,
    });

    return NextResponse.json({
      ok: true,
      launch: result.savedLaunch,
      steps: result.steps,
      createdAdsSummary: result.createdAdsSummary,
      effectiveObjectStoryId: result.effectiveObjectStoryId,
      message:
        "Đẩy chiến dịch thành công ở chế độ an toàn PAUSED! Kiểm tra lại trên Meta Ads Manager rồi bấm bật.",
    });
  } catch (err) {
    console.error("POST /api/launcher error:", err);
    return jsonError("Lỗi xử lý Trình Lên Ads.");
  }
}
