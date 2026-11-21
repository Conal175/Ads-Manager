import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { jsonError, resolveEffectiveSecrets } from "@/lib/api-utils";
import { verifyMetaConnection } from "@/services/meta-graph";
import { verifyGoogleWorkspaceConfig } from "@/services/google-workspace";
import { verifyAiConnection } from "@/services/gemini-ai";
import type { ConnectionStatusResult } from "@/types/domain";

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const { service } = (await req.json()) as {
      service: "meta" | "drive" | "sheets" | "telegram" | "ai";
    };

    const [settings] = await db.select().from(systemSettings).limit(1);
    if (!settings) {
      return jsonError("Chưa có cấu hình.", 404);
    }

    const secrets = resolveEffectiveSecrets(settings);
    const checkedAt = new Date().toISOString();
    let result: ConnectionStatusResult;

    if (service === "meta") {
      result = await verifyMetaConnection(
        secrets.metaSystemUserToken,
        secrets.metaBusinessManagerId
      );
    } else if (service === "drive" || service === "sheets") {
      const targetRef =
        service === "drive"
          ? secrets.googleDriveRootFolderId
          : secrets.googleSheetsUrl;
      result = await verifyGoogleWorkspaceConfig(
        service,
        secrets.googleServiceAccountJson,
        targetRef
      );
    } else if (service === "telegram") {
      const botToken = secrets.telegramBotToken;
      const chatId = secrets.telegramChatId;
      if (!botToken || !chatId) {
        result = {
          ok: false,
          mode: "sandbox",
          checkedAt,
          message: "Thiếu Telegram Bot Token hoặc Chat ID.",
        };
      } else if (botToken.startsWith("demo_")) {
        result = {
          ok: true,
          mode: "sandbox",
          checkedAt,
          message: `Bot Telegram (Sandbox) kết nối thành công tới Chat ID ${chatId}.`,
          details: { botUsername: "@AdsPulseAlertBot", chatId },
        };
      } else {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${botToken}/getMe`,
            { signal: AbortSignal.timeout(7000) }
          );
          const data = await res.json();
          result = data.ok
            ? {
                ok: true,
                mode: "live",
                checkedAt,
                message: `Kết nối Live Telegram Bot @${data.result?.username} thành công!`,
                details: { botUsername: data.result?.username, chatId },
              }
            : {
                ok: false,
                mode: "live",
                checkedAt,
                message: `Telegram từ chối Token: ${
                  data.description || "Không hợp lệ"
                }`,
              };
        } catch {
          result = {
            ok: false,
            mode: "live",
            checkedAt,
            message: "Không thể kết nối máy chủ Telegram API.",
          };
        }
      }
    } else {
      result = await verifyAiConnection(secrets.aiProvider, secrets.aiApiKey);
    }

    const updatedStatuses = {
      ...(settings.connectionStatuses || {}),
      [service]: result,
    };

    await db
      .update(systemSettings)
      .set({ connectionStatuses: updatedStatuses, updatedAt: new Date() })
      .where(eq(systemSettings.id, settings.id));

    return NextResponse.json({
      service,
      result,
      connectionStatuses: updatedStatuses,
    });
  } catch (err) {
    console.error("POST /api/settings/test-connection error:", err);
    return jsonError("Lỗi kiểm tra kết nối dịch vụ.");
  }
}
