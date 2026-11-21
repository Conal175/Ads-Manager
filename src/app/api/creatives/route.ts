import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  creatives,
  metaMediaCache,
  metaPosts,
  products,
  syncLogs,
  systemSettings,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";

export async function GET() {
  try {
    await ensureSeeded();
    const [allCreatives, allProducts, allCache, allPosts] = await Promise.all([
      db.select().from(creatives).orderBy(desc(creatives.createdAt)),
      db.select().from(products),
      db.select().from(metaMediaCache).orderBy(desc(metaMediaCache.uploadedAt)),
      db.select().from(metaPosts).orderBy(desc(metaPosts.createdAt)),
    ]);

    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    const enriched = allCreatives.map((c) => ({
      ...c,
      product: productMap.get(c.productId) ?? null,
      mediaCache: allCache.filter((m) => m.creativeId === c.id),
      posts: allPosts.filter((p) => p.creativeId === c.id),
    }));

    return NextResponse.json({
      creatives: enriched,
      mediaCache: allCache,
      posts: allPosts,
      products: allProducts,
    });
  } catch (err) {
    console.error("GET /api/creatives error:", err);
    return NextResponse.json({ error: "Lỗi tải kho Creative." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();

    if (body.action === "sync_drive") {
      const started = Date.now();
      const [settings] = await db.select().from(systemSettings).limit(1);
      const allProducts = await db.select().from(products);
      const existing = await db.select().from(creatives);

      // Simulate scanning Kho_Ads/[Mã_SP]/[Tháng] and discovering 1 fresh creative if under 14 items
      let newlyAdded = null;
      if (allProducts.length > 0) {
        const targetProd = allProducts[existing.length % allProducts.length];
        const nextIdx =
          existing.filter((c) => c.productId === targetProd.id).length + 1;
        const code = `CR-${targetProd.code}-${String(nextIdx).padStart(2, "0")}`;
        const fileSizeMb = Number((25 + Math.random() * 68).toFixed(1));
        const monthFolder = new Date().toISOString().slice(0, 7);

        const [inserted] = await db
          .insert(creatives)
          .values({
            creativeCode: code,
            productId: targetProd.id,
            driveFileId: `1DriveSynced_${code}_${Date.now().toString().slice(-4)}`,
            driveFolderPath: `Kho_Ads/${targetProd.code}/${monthFolder}`,
            fileName: `${code}_UGC_Hook_Moi_${monthFolder}.mp4`,
            mediaType: "video",
            fileSizeMb,
            durationSec: Math.floor(24 + Math.random() * 32),
            thumbnailUrl: "",
            hookAngle: "UGC mở hộp cận cảnh + test công dụng 5 giây đầu",
            lifecycleStatus: "cho_test",
            sizeWarning: fileSizeMb >= 80,
          })
          .returning();
        newlyAdded = inserted;
      }

      const durationMs = Date.now() - started;
      await db.insert(syncLogs).values({
        jobName: "google_drive",
        status: "success",
        itemsProcessed: existing.length + (newlyAdded ? 1 : 0),
        durationMs,
        rateLimitPct: settings?.metaRateLimitPct ?? 24,
        message: newlyAdded
          ? `Quét Drive hoàn tất: Phát hiện video mới ${newlyAdded.creativeCode} (${newlyAdded.fileSizeMb} MB) trong ${newlyAdded.driveFolderPath}.`
          : "Quét Drive hoàn tất: Không có file mới.",
      });

      return NextResponse.json({
        newlyAdded,
        message: newlyAdded
          ? `Đồng bộ Drive thành công! Đã nạp siêu dữ liệu ${newlyAdded.creativeCode} (0 byte video lưu vào PostgreSQL).`
          : "Đã đồng bộ kho Google Drive.",
      });
    }

    // Manual add Creative metadata from Drive File ID
    const fileSizeMb = Number(body.fileSizeMb) || 32;
    const [inserted] = await db
      .insert(creatives)
      .values({
        creativeCode: String(body.creativeCode).trim().toUpperCase(),
        productId: Number(body.productId),
        driveFileId: String(body.driveFileId).trim(),
        driveFolderPath: String(
          body.driveFolderPath || `Kho_Ads/SP01/${new Date().toISOString().slice(0, 7)}`
        ),
        fileName: String(body.fileName).trim(),
        mediaType: body.mediaType === "image" ? "image" : "video",
        fileSizeMb,
        durationSec: Number(body.durationSec) || 30,
        thumbnailUrl: String(body.thumbnailUrl || ""),
        hookAngle: String(body.hookAngle || ""),
        lifecycleStatus: String(body.lifecycleStatus || "cho_test"),
        sizeWarning: fileSizeMb >= 80,
      })
      .returning();

    return NextResponse.json({ creative: inserted });
  } catch (err) {
    console.error("POST /api/creatives error:", err);
    return NextResponse.json(
      { error: "Không thể đồng bộ hoặc thêm Creative (kiểm tra trùng mã Creative)." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const { id, lifecycleStatus, hookAngle } = body;
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID Creative." }, { status: 400 });
    }

    const updateData: Partial<typeof creatives.$inferInsert> = {};
    if (typeof lifecycleStatus === "string") updateData.lifecycleStatus = lifecycleStatus;
    if (typeof hookAngle === "string") updateData.hookAngle = hookAngle;

    const [updated] = await db
      .update(creatives)
      .set(updateData)
      .where(eq(creatives.id, Number(id)))
      .returning();

    return NextResponse.json({ creative: updated });
  } catch (err) {
    console.error("PATCH /api/creatives error:", err);
    return NextResponse.json({ error: "Lỗi cập nhật Creative." }, { status: 500 });
  }
}
