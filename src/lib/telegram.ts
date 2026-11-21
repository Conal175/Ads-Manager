import { db } from "@/db";
import { systemSettings, telegramAlerts } from "@/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { resolveEffectiveSecrets } from "./api-utils";

export interface SendTelegramAlertInput {
  streamType: "realtime" | "scheduled";
  alertCategory:
    | "account_disabled"
    | "payment_error"
    | "spend_spike"
    | "ai_briefing"
    | "action_digest"
    | "daily_summary"
    | "test";
  title: string;
  body: string;
  deepLinkPath: string;
  dedupKey?: string;
  dedupWindowMinutes?: number;
}

export async function dispatchTelegramAlert(input: SendTelegramAlertInput) {
  const dedupWindow = input.dedupWindowMinutes ?? 120;

  // Anti-spam deduplication for realtime alerts within the time window
  if (input.dedupKey && input.streamType === "realtime") {
    const cutoff = new Date(Date.now() - dedupWindow * 60 * 1000);
    const recent = await db
      .select()
      .from(telegramAlerts)
      .where(
        and(
          eq(telegramAlerts.dedupKey, input.dedupKey),
          gte(telegramAlerts.createdAt, cutoff)
        )
      )
      .orderBy(desc(telegramAlerts.createdAt))
      .limit(1);

    if (recent.length > 0) {
      return {
        skipped: true,
        reason: "Chống spam: Cảnh báo trùng lặp đã được gửi trong khung giờ này.",
        alert: recent[0],
      };
    }
  }

  const [settings] = await db.select().from(systemSettings).limit(1);
  const secrets = resolveEffectiveSecrets(settings);
  const botToken = secrets.telegramBotToken;
  const chatId = secrets.telegramChatId;

  let deliveryStatus: "sent" | "simulated" | "failed" = "simulated";

  if (botToken && chatId && !botToken.startsWith("demo_")) {
    try {
      const text = `🔔 <b>${input.title}</b>\n\n${input.body}\n\n🔗 Mở xử lý: ${input.deepLinkPath}`;
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
          }),
          signal: AbortSignal.timeout(8000),
        }
      );
      deliveryStatus = res.ok ? "sent" : "failed";
    } catch {
      deliveryStatus = "failed";
    }
  }

  const [inserted] = await db
    .insert(telegramAlerts)
    .values({
      streamType: input.streamType,
      alertCategory: input.alertCategory,
      title: input.title,
      body: input.body,
      deepLinkPath: input.deepLinkPath,
      dedupKey: input.dedupKey ?? "",
      deliveryStatus,
    })
    .returning();

  return { skipped: false, alert: inserted };
}
