import { authorizeApi } from "@/lib/auth/server";
import { db } from "@/db";
import { creatives, products } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { mediaCsv } from "@/lib/media-export";

/** Snapshot for manual import into Sheets. Never modifies Drive or Sheets. */
export async function GET() {
  const denied = await authorizeApi("operator");
  if (denied) return denied;
  try {
    const rows = await db.select({
      creativeCode: creatives.creativeCode, productCode: products.code, productName: products.name,
      fileName: creatives.fileName, driveFileId: creatives.driveFileId, driveFolderPath: creatives.driveFolderPath,
      mediaType: creatives.mediaType, fileSizeMb: creatives.fileSizeMb, durationSec: creatives.durationSec,
      hookAngle: creatives.hookAngle, lifecycleStatus: creatives.lifecycleStatus,
    }).from(creatives).innerJoin(products, eq(creatives.productId, products.id)).orderBy(asc(creatives.id));
    return new Response(mediaCsv(rows), { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="danh-muc-media.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch {
    return Response.json({error: "Không thể xuất danh mục media."}, {status: 500});
  }
}
