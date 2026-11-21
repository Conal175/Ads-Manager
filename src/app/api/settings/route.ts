import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { jsonError, resolveEffectiveSecrets, publicSettings } from "@/lib/api-utils";

export async function GET() {
  try {
    await ensureSeeded();
    const [settings] = await db.select().from(systemSettings).limit(1);
    const secrets = resolveEffectiveSecrets(settings);

    return NextResponse.json({
      settings: settings
        ? {
            ...publicSettings(settings),
            aiProvider:
              settings.aiProvider === "openai"
                ? "gemini-2.5-flash"
                : settings.aiProvider,
            envKeyDetected: secrets.envKeyDetected,
          }
        : null,
    });
  } catch (err) {
    console.error("GET /api/settings error:", err);
    return jsonError("Lỗi tải cấu hình.");
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const [existing] = await db.select().from(systemSettings).limit(1);
    if (!existing) {
      return jsonError("Chưa khởi tạo cấu hình.", 404);
    }

    const updateData: Partial<typeof systemSettings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof body.metaSystemUserToken === "string" && body.metaSystemUserToken.trim() !== "")
      updateData.metaSystemUserToken = body.metaSystemUserToken.trim();
    if (typeof body.metaBusinessManagerId === "string")
      updateData.metaBusinessManagerId = body.metaBusinessManagerId.trim();
    if (typeof body.googleDriveRootFolderId === "string")
      updateData.googleDriveRootFolderId = body.googleDriveRootFolderId.trim();
    if (typeof body.googleSheetsUrl === "string")
      updateData.googleSheetsUrl = body.googleSheetsUrl.trim();
    if (typeof body.googleServiceAccountJson === "string" && body.googleServiceAccountJson.trim() !== "")
      updateData.googleServiceAccountJson = body.googleServiceAccountJson;
    if (typeof body.telegramBotToken === "string" && body.telegramBotToken.trim() !== "")
      updateData.telegramBotToken = body.telegramBotToken.trim();
    if (typeof body.telegramChatId === "string")
      updateData.telegramChatId = body.telegramChatId.trim();
    if (typeof body.aiApiKey === "string" && body.aiApiKey.trim() !== "")
      updateData.aiApiKey = body.aiApiKey.trim();
    if (typeof body.aiProvider === "string")
      updateData.aiProvider = body.aiProvider;
    if (typeof body.dailyBudgetSafetyCap === "number")
      updateData.dailyBudgetSafetyCap = Math.max(
        100000,
        body.dailyBudgetSafetyCap
      );
    if (body.ruleConfigJson && typeof body.ruleConfigJson === "object") {
      updateData.ruleConfigJson = {
        ...existing.ruleConfigJson,
        ...body.ruleConfigJson,
      };
    }

    const [updated] = await db
      .update(systemSettings)
      .set(updateData)
      .where(eq(systemSettings.id, existing.id))
      .returning();

    const secrets = resolveEffectiveSecrets(updated);
    return NextResponse.json({
      settings: { ...publicSettings(updated), envKeyDetected: secrets.envKeyDetected },
    });
  } catch (err) {
    console.error("PUT /api/settings error:", err);
    return jsonError("Không thể lưu cấu hình.");
  }
}
