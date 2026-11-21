import { isDemoMode, demoOnlyError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metaAssets, syncLogs, systemSettings } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { dispatchTelegramAlert } from "@/lib/telegram";
import { getMetaAccountStatusInfo } from "@/lib/format";

export async function GET() {
  try {
    await ensureSeeded();
    const assets = await db
      .select()
      .from(metaAssets)
      .orderBy(asc(metaAssets.assetType), asc(metaAssets.id));
    return NextResponse.json({ assets });
  } catch (err) {
    console.error("GET /api/assets error:", err);
    return NextResponse.json({ error: "Lỗi tải danh sách tài sản Meta." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const { id, isMonitored, accountStatus, disableReason } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID tài sản." }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(metaAssets)
      .where(eq(metaAssets.id, Number(id)));

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy tài sản." }, { status: 404 });
    }

    const updatePayload: Partial<typeof metaAssets.$inferInsert> = {
      syncedAt: new Date(),
    };

    if (typeof isMonitored === "boolean") {
      updatePayload.isMonitored = isMonitored;
    }
    if (typeof accountStatus === "number" && !isDemoMode()) return demoOnlyError();
    if (typeof accountStatus === "number") {
      updatePayload.accountStatus = accountStatus;
      updatePayload.disableReason =
        disableReason ?? (accountStatus === 1 ? "NONE" : "ACCOUNT_STATUS_CHANGED");
    }

    const [updated] = await db
      .update(metaAssets)
      .set(updatePayload)
      .where(eq(metaAssets.id, existing.id))
      .returning();

    let alertDispatched = null;
    if (
      updated.assetType === "ad_account" &&
      typeof accountStatus === "number" &&
      accountStatus !== 1 &&
      existing.accountStatus === 1
    ) {
      const info = getMetaAccountStatusInfo(accountStatus);
      alertDispatched = await dispatchTelegramAlert({
        streamType: "realtime",
        alertCategory: accountStatus === 2 ? "account_disabled" : "payment_error",
        title: `🚨 CẢNH BÁO ĐỎ: ${updated.name} (${updated.metaId}) — ${info.label}`,
        body: `Trạng thái tài khoản vừa chuyển từ Đang chạy (1) sang ${info.label} (${accountStatus}). Lý do: ${updated.disableReason}. Thẻ: ${updated.fundingSourceDetails}.`,
        deepLinkPath: "/assets",
        dedupKey: `account_status_${updated.metaId}_${accountStatus}`,
      });

      await db
        .update(metaAssets)
        .set({ lastAlertSentAt: new Date() })
        .where(eq(metaAssets.id, updated.id));
    }

    return NextResponse.json({ asset: updated, alertDispatched });
  } catch (err) {
    console.error("PATCH /api/assets error:", err);
    return NextResponse.json({ error: "Không thể cập nhật tài sản." }, { status: 500 });
  }
}

export async function POST() {
    if (!isDemoMode()) return demoOnlyError();
  try {
    await ensureSeeded();
    const started = Date.now();
    const [settings] = await db.select().from(systemSettings).limit(1);
    const assets = await db.select().from(metaAssets);

    // Update sync timestamp & slightly vary amount_spent on active monitored accounts
    const now = new Date();
    let alertsTriggered = 0;

    for (const a of assets) {
      if (a.assetType === "ad_account" && a.isMonitored) {
        const delta = a.accountStatus === 1 ? Math.round(Math.random() * 250000 + 80000) : 0;
        await db
          .update(metaAssets)
          .set({
            amountSpent: a.amountSpent + delta,
            syncedAt: now,
          })
          .where(eq(metaAssets.id, a.id));

        if (a.accountStatus !== 1) {
          const info = getMetaAccountStatusInfo(a.accountStatus);
          const res = await dispatchTelegramAlert({
            streamType: "realtime",
            alertCategory: a.accountStatus === 2 ? "account_disabled" : "payment_error",
            title: `🚨 CẢNH BÁO ĐỎ: ${a.name} (${a.metaId}) — ${info.label}`,
            body: `Phát hiện tài khoản đang bật Theo dõi có account_status = ${a.accountStatus} (${info.label}). Lý do: ${a.disableReason}.`,
            deepLinkPath: "/assets",
            dedupKey: `account_status_${a.metaId}_${a.accountStatus}`,
          });
          if (!res.skipped) alertsTriggered += 1;
        }
      }
    }

    const durationMs = Date.now() - started;
    await db.insert(syncLogs).values({
      jobName: "meta_assets",
      status: "success",
      itemsProcessed: assets.length,
      durationMs,
      rateLimitPct: settings?.metaRateLimitPct ?? 28,
      message: `Đồng bộ owned_ad_accounts, client_ad_accounts, Fanpages & Pixels (${assets.length} tài sản). Cảnh báo đỏ gửi mới: ${alertsTriggered}.`,
    });

    const refreshed = await db
      .select()
      .from(metaAssets)
      .orderBy(asc(metaAssets.assetType), asc(metaAssets.id));

    return NextResponse.json({
      assets: refreshed,
      alertsTriggered,
      message: `Đã đồng bộ ${refreshed.length} tài sản từ Business Manager.`,
    });
  } catch (err) {
    console.error("POST /api/assets error:", err);
    return NextResponse.json({ error: "Đồng bộ tài sản thất bại." }, { status: 500 });
  }
}
