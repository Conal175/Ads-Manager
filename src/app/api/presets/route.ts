import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adPresets } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";

export async function GET() {
  try {
    await ensureSeeded();
    const presets = await db
      .select()
      .from(adPresets)
      .orderBy(asc(adPresets.presetType), asc(adPresets.code));
    return NextResponse.json({ presets });
  } catch (err) {
    console.error("GET /api/presets error:", err);
    return NextResponse.json({ error: "Lỗi tải danh sách mẫu cấu hình." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    const name = String(body.name || "").trim();
    const presetType = body.presetType === "message" ? "message" : "target";

    if (!code || !name) {
      return NextResponse.json(
        { error: "Mã mẫu và Tên mẫu là bắt buộc." },
        { status: 400 }
      );
    }

    const configJson =
      typeof body.configJson === "string"
        ? JSON.parse(body.configJson)
        : body.configJson ?? {};

    const [created] = await db
      .insert(adPresets)
      .values({
        presetType,
        code,
        name,
        configJson,
      })
      .returning();

    return NextResponse.json({ preset: created });
  } catch (err) {
    console.error("POST /api/presets error:", err);
    return NextResponse.json(
      { error: "Không thể tạo mẫu cấu hình (kiểm tra cú pháp JSON hoặc trùng mã)." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID mẫu." }, { status: 400 });
    }
    await db.delete(adPresets).where(eq(adPresets.id, id));
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/presets error:", err);
    return NextResponse.json({ error: "Không thể xóa mẫu." }, { status: 500 });
  }
}
