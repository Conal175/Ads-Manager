import { NextResponse } from "next/server";

/**
 * Standardized API error handler so route files stay concise and consistent.
 */
export function jsonError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Resolves effective runtime secrets by checking DB settings first,
 * then falling back to server-side environment variables (.env).
 * This allows seamless deployment on Cloud Run / Vercel / Gemini IDX via .env
 * OR interactive configuration via the Settings UI.
 */
export function resolveEffectiveSecrets(dbSettings?: {
  metaSystemUserToken?: string | null;
  metaBusinessManagerId?: string | null;
  googleDriveRootFolderId?: string | null;
  googleSheetsUrl?: string | null;
  googleServiceAccountJson?: string | null;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
  aiApiKey?: string | null;
  aiProvider?: string | null;
}) {
  const aiProvider = dbSettings?.aiProvider?.trim() || "gemini-2.5-flash";
  const dbAiKey = dbSettings?.aiApiKey?.trim() || "";
  const envGeminiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    "";
  const envOpenAiKey = process.env.OPENAI_API_KEY?.trim() || "";

  const effectiveAiKey =
    dbAiKey || (aiProvider.startsWith("openai") ? envOpenAiKey : envGeminiKey);

  return {
    aiProvider,
    aiApiKey: effectiveAiKey,
    metaSystemUserToken:
      dbSettings?.metaSystemUserToken?.trim() ||
      process.env.META_SYSTEM_USER_TOKEN?.trim() ||
      "",
    metaBusinessManagerId:
      dbSettings?.metaBusinessManagerId?.trim() ||
      process.env.META_BUSINESS_MANAGER_ID?.trim() ||
      "",
    googleDriveRootFolderId:
      dbSettings?.googleDriveRootFolderId?.trim() ||
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() ||
      "",
    googleSheetsUrl:
      dbSettings?.googleSheetsUrl?.trim() ||
      process.env.GOOGLE_SHEETS_URL?.trim() ||
      "",
    googleServiceAccountJson:
      dbSettings?.googleServiceAccountJson?.trim() ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ||
      "",
    telegramBotToken:
      dbSettings?.telegramBotToken?.trim() ||
      process.env.TELEGRAM_BOT_TOKEN?.trim() ||
      "",
    telegramChatId:
      dbSettings?.telegramChatId?.trim() ||
      process.env.TELEGRAM_CHAT_ID?.trim() ||
      "",
    envKeyDetected: {
      gemini: Boolean(envGeminiKey),
      meta: Boolean(process.env.META_SYSTEM_USER_TOKEN?.trim()),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
    },
  };
}
