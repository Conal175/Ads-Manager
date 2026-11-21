import { authorizeApi } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { actionRecommendations, systemSettings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { runRuleEngineScan } from "@/lib/rule-engine";

export async function GET() {
  const denied = await authorizeApi("operator");
  if (denied) return denied;
  try {
    await ensureSeeded();
    const [recommendations, settingsRows] = await Promise.all([
      db
        .select()
        .from(actionRecommendations)
        .orderBy(desc(actionRecommendations.createdAt)),
      db.select().from(systemSettings).limit(1),
    ]);

    return NextResponse.json({
      recommendations,
      ruleConfig: settingsRows[0]?.ruleConfigJson ?? null,
    });
  } catch (err) {
    console.error("GET /api/actions error:", err);
    return NextResponse.json({ error: "Lỗi tải danh sách đề xuất." }, { status: 500 });
  }
}

export async function POST() {
  const denied = await authorizeApi("admin", true);
  if (denied) return denied;
  try {
    await ensureSeeded();
    const scanResult = await runRuleEngineScan();
    const recommendations = await db
      .select()
      .from(actionRecommendations)
      .orderBy(desc(actionRecommendations.createdAt));

    return NextResponse.json({
      ...scanResult,
      recommendations,
      message: `Quét quy tắc xong trong ${scanResult.durationMs}ms — phát hiện ${scanResult.createdCount} đề xuất mới.`,
    });
  } catch (err) {
    console.error("POST /api/actions error:", err);
    return NextResponse.json({ error: "Lỗi chạy bộ máy quét quy tắc." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await authorizeApi("admin", true);
  if (denied) return denied;
  try {
    await ensureSeeded();
    const body = await req.json();

    if (body.action === "update_rules") {
      const [settings] = await db.select().from(systemSettings).limit(1);
      if (!settings) {
        return NextResponse.json({ error: "Chưa có cấu hình." }, { status: 404 });
      }
      const nextRules = {
        ...settings.ruleConfigJson,
        ...body.ruleConfigJson,
      };
      await db
        .update(systemSettings)
        .set({ ruleConfigJson: nextRules, updatedAt: new Date() })
        .where(eq(systemSettings.id, settings.id));

      return NextResponse.json({
        ok: true,
        ruleConfig: nextRules,
        message: "Đã lưu ngưỡng kích hoạt quy tắc mới.",
      });
    }

    const { id, decision, note } = body as {
      id: number;
      decision: "resolved" | "dismissed" | "open";
      note?: string;
    };

    if (!id || !decision) {
      return NextResponse.json({ error: "Thiếu ID hoặc trạng thái xử lý." }, { status: 400 });
    }

    const now = new Date();
    const cooldownUntil =
      decision === "dismissed"
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
        : null;

    const [updated] = await db
      .update(actionRecommendations)
      .set({
        status: decision,
        decisionNote: String(note || ""),
        decidedAt: decision === "open" ? null : now,
        cooldownUntil,
      })
      .where(eq(actionRecommendations.id, Number(id)))
      .returning();

    return NextResponse.json({
      ok: true,
      recommendation: updated,
      message:
        decision === "resolved"
          ? "Đã đánh dấu Đã xử lý kèm ảnh chụp chỉ số."
          : decision === "dismissed"
          ? "Đã bỏ qua & kích hoạt chế độ Tạm ẩn 24h (Cooldown) chống lặp cảnh báo."
          : "Đã mở lại đề xuất.",
    });
  } catch (err) {
    console.error("PATCH /api/actions error:", err);
    return NextResponse.json({ error: "Không thể cập nhật trạng thái đề xuất." }, { status: 500 });
  }
}
