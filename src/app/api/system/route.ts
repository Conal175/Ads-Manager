import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { syncLogs, systemSettings, telegramAlerts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { dispatchTelegramAlert } from "@/lib/telegram";
import { runRuleEngineScan } from "@/lib/rule-engine";
import { jsonError, publicSettings, isDemoMode, demoOnlyError } from "@/lib/api-utils";
import { CRON_JOB_METADATA } from "@/types/domain";

export async function GET() {
  try {
    await ensureSeeded();
    const [settingsRows, logs, alerts] = await Promise.all([
      db.select().from(systemSettings).limit(1),
      db.select().from(syncLogs).orderBy(desc(syncLogs.createdAt)).limit(30),
      db
        .select()
        .from(telegramAlerts)
        .orderBy(desc(telegramAlerts.createdAt))
        .limit(30),
    ]);

    return NextResponse.json({
      settings: settingsRows[0] ? publicSettings(settingsRows[0]) : null,
      logs,
      alerts,
    });
  } catch (err) {
    console.error("GET /api/system error:", err);
    return jsonError("Lỗi tải trạng thái hệ thống.");
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const [settings] = await db.select().from(systemSettings).limit(1);
    if (!settings) {
      return jsonError("Chưa có cấu hình.", 404);
    }

    if (body.action === "simulate_rate_limit") {
      if (!isDemoMode()) return demoOnlyError();
      const targetPct = Math.min(
        100,
        Math.max(5, Number(body.rateLimitPct) || 82)
      );
      const throttleMode = targetPct >= 75;
      const [updated] = await db
        .update(systemSettings)
        .set({
          metaRateLimitPct: targetPct,
          metaCpuUsagePct: Math.max(10, targetPct - 6),
          metaTimeUsagePct: Math.max(12, targetPct - 4),
          throttleMode,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.id, settings.id))
        .returning();

      await db.insert(syncLogs).values({
        jobName: "meta_insights",
        status: throttleMode ? "throttled" : "success",
        itemsProcessed: 0,
        durationMs: 190,
        rateLimitPct: targetPct,
        message: throttleMode
          ? `Header x-business-use-case-usage chạm ${targetPct}% (>75%) → Tự động kích hoạt chế độ Giãn chu kỳ đồng bộ từ 30 phút lên 90 phút để tránh khóa API.`
          : `Header x-business-use-case-usage ổn định ở mức ${targetPct}% (<75%) → Khôi phục chu kỳ đồng bộ tiêu chuẩn 30 phút.`,
      });

      return NextResponse.json({
        settings: publicSettings(updated),
        message: throttleMode
          ? `Tải API chạm ${targetPct}% (>75%) — Hệ thống đã tự động giãn chu kỳ đồng bộ!`
          : `Tải API ở mức an toàn (${targetPct}%) — Chu kỳ đồng bộ hoạt động bình thường.`,
      });
    }

    if (body.action === "test_telegram") {
      const result = await dispatchTelegramAlert({
        streamType: body.streamType === "scheduled" ? "scheduled" : "realtime",
        alertCategory: "test",
        title: "🧪 Tin nhắn kiểm tra từ AdsPulse OS",
        body: `Kết nối Telegram Bot hoạt động ổn định. Hạn mức API Meta hiện tại: ${settings.metaRateLimitPct}%. Nhấn liên kết bên dưới để mở trang giám sát hệ thống.`,
        deepLinkPath: "/system",
      });
      return NextResponse.json({
        ok: true,
        result,
        message: "Đã gửi tin nhắn kiểm tra qua Telegram Bot.",
      });
    }

    if (body.action === "run_job") {
      const jobName = String(body.jobName || "meta_insights");
      if (jobName === "rule_engine") {
        const res = await runRuleEngineScan();
        return NextResponse.json({
          ok: true,
          message: `Chạy tác vụ Quét quy tắc thành công (${res.createdCount} đề xuất mới).`,
        });
      }

      if (!isDemoMode()) return demoOnlyError();
      const isThrottled = settings.throttleMode && jobName.startsWith("meta_");
      await db.insert(syncLogs).values({
        jobName,
        status: isThrottled ? "throttled" : "success",
        itemsProcessed: isThrottled ? 0 : 28,
        durationMs: Math.floor(320 + Math.random() * 900),
        rateLimitPct: settings.metaRateLimitPct,
        message: isThrottled
          ? `Tác vụ ${jobName} tạm hoãn do tải API Meta đang ở ${settings.metaRateLimitPct}% (>75%).`
          : CRON_JOB_METADATA[jobName]?.defaultMessage ||
            `Chạy tác vụ ${jobName} thành công.`,
      });

      return NextResponse.json({
        ok: true,
        message: isThrottled
          ? "Tác vụ tạm giãn chu kỳ do hạn mức API Meta > 75%."
          : `Đã chạy xong tác vụ ${jobName}.`,
      });
    }

    return jsonError("Hành động không hợp lệ.", 400);
  } catch (err) {
    console.error("POST /api/system error:", err);
    return jsonError("Lỗi thao tác hệ thống.");
  }
}
