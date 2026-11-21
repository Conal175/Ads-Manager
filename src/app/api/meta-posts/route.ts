import { authorizeApi } from "@/lib/auth/server";
import { isDemoMode, demoOnlyError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { creatives, metaAssets, metaPosts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";

export async function GET() {
  const denied = await authorizeApi("viewer");
  if (denied) return denied;
  try {
    await ensureSeeded();
    const posts = await db
      .select()
      .from(metaPosts)
      .orderBy(desc(metaPosts.createdAt));
    return NextResponse.json({ posts });
  } catch (err) {
    console.error("GET /api/meta-posts error:", err);
    return NextResponse.json({ error: "Lỗi tải kho Post ID." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await authorizeApi("operator", true);
  if (denied) return denied;
  try {
    await ensureSeeded();
    const body = await req.json();

    if (body.action === "pull_from_fanpage") {
    if (!isDemoMode()) return demoOnlyError();
      const pageMetaId = String(body.pageMetaId || "").trim();
      const creativeId = body.creativeId ? Number(body.creativeId) : null;
      const [page] = await db
        .select()
        .from(metaAssets)
        .where(eq(metaAssets.metaId, pageMetaId));

      const pageName = page?.name || "Fanpage Meta";
      const randomPostSuffix = String(Math.floor(7000000000 + Math.random() * 2999999999));
      const storyId = `${pageMetaId}_${randomPostSuffix}`;

      let creativeCode = "BÀI PAGE";
      if (creativeId) {
        const [cr] = await db
          .select()
          .from(creatives)
          .where(eq(creatives.id, creativeId));
        if (cr) creativeCode = cr.creativeCode;
      }

      const [inserted] = await db
        .insert(metaPosts)
        .values({
          creativeId,
          pageMetaId,
          pageName,
          effectiveObjectStoryId: storyId,
          copyVersion: String(body.copyVersion || "Bài Page gốc"),
          primaryText: String(
            body.primaryText ||
              `[Kéo từ /${pageMetaId}/promotable_posts] Bài đăng công khai gắn với ${creativeCode} — Đầy đủ tương tác tự nhiên, sẵn sàng chạy đa tài khoản.`
          ),
          headline: String(body.headline || `Ưu đãi chính hãng từ ${pageName}`),
          ctaType: String(body.ctaType || "SEND_MESSAGE"),
          source: "fanpage_pull",
          advantagePlusDisabled: true,
        })
        .returning();

      return NextResponse.json({
        post: inserted,
        message: `Đã kéo thành công bài viết ${storyId} từ /${pageMetaId}/promotable_posts vào Kho Post ID.`,
      });
    }

    // Manual add Post ID
    const [inserted] = await db
      .insert(metaPosts)
      .values({
        creativeId: body.creativeId ? Number(body.creativeId) : null,
        pageMetaId: String(body.pageMetaId).trim(),
        pageName: String(body.pageName || "Fanpage"),
        effectiveObjectStoryId: String(body.effectiveObjectStoryId).trim(),
        copyVersion: String(body.copyVersion || "Bản chữ A"),
        primaryText: String(body.primaryText || ""),
        headline: String(body.headline || ""),
        ctaType: String(body.ctaType || "SEND_MESSAGE"),
        source: "manual",
        advantagePlusDisabled: true,
      })
      .returning();

    return NextResponse.json({ post: inserted });
  } catch (err) {
    console.error("POST /api/meta-posts error:", err);
    return NextResponse.json(
      { error: "Không thể lưu Post ID (kiểm tra trùng effective_object_story_id)." },
      { status: 500 }
    );
  }
}
