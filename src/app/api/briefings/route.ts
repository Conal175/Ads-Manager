import { authorizeApi } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiBriefings } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { jsonError } from "@/lib/api-utils";
import { createDailyAiBriefing } from "@/services/briefing-service";

export async function GET() {
  const denied = await authorizeApi("viewer");
  if (denied) return denied;
  try {
    await ensureSeeded();
    const list = await db
      .select()
      .from(aiBriefings)
      .orderBy(desc(aiBriefings.createdAt))
      .limit(10);
    return NextResponse.json({ briefings: list });
  } catch (err) {
    console.error("GET /api/briefings error:", err);
    return jsonError("Lỗi tải bản tin AI Briefing.");
  }
}

export async function POST() {
  const denied = await authorizeApi("admin", true);
  if (denied) return denied;
  try {
    await ensureSeeded();
    const created = await createDailyAiBriefing();
    return NextResponse.json({
      briefing: created,
      message: `Đã tạo Bản tin AI Briefing (${created.providerUsed}). Telegram: ${created.sentToTelegram ? "đã gửi" : "chưa gửi"}.`,
    });
  } catch (err) {
    console.error("POST /api/briefings error:", err);
    return jsonError("Không thể tạo bản tin AI Briefing.");
  }
}
