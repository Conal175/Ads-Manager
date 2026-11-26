import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { creatives, products, systemSettings } from '@/db/schema';
import { authorizeApi } from '@/lib/auth/server';
import { resolveEffectiveSecrets } from '@/lib/api-utils';
import { planDriveImport, type DriveSelection } from '@/lib/drive-import-plan';
import { previewDriveInventory } from '@/services/drive-inventory';

function validSelection(value: unknown): value is DriveSelection[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return false;
  return value.every(v => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    for (const key of ['id', 'name', 'productCode', 'month', 'path', 'mimeType']) if (typeof v[key] !== 'string' || v[key].length < 1 || v[key].length > 500) return false;
    for (const key of ['sizeBytes', 'modifiedTime', 'durationMillis']) if (v[key] !== null && (typeof v[key] !== 'string' || v[key].length > 100)) return false;
    return /^[A-Za-z0-9_-]+$/.test(v.id) && Number.isSafeInteger(v.productId) && v.productId > 0;
  });
}

export async function POST(req: NextRequest) {
  const denied = await authorizeApi('operator', true);
  if (denied) return denied;
  let body: { selected?: unknown; confirm?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({error:'Dữ liệu không hợp lệ.'}, {status:400}); }
  if (!body || body.confirm !== true || !validSelection(body.selected)) return NextResponse.json({error:'Vui lòng xác nhận và chọn từ 1 đến 50 file hợp lệ.'}, {status:400});
  try {
    const [settings] = await db.select().from(systemSettings).limit(1);
    const secrets = resolveEffectiveSecrets(settings);
    if (!secrets.googleDriveRootFolderId || !secrets.googleServiceAccountJson) return NextResponse.json({error:'Chưa cấu hình thư mục Drive hoặc Service Account.'}, {status:400});
    // Re-read all relevant metadata, never trust the client to provide file contents or associations.
    let inventory;
    try { inventory = await previewDriveInventory(secrets.googleServiceAccountJson, secrets.googleDriveRootFolderId); }
    catch { return NextResponse.json({error:'Không thể đọc đầy đủ Drive. Chưa nhập dữ liệu.'}, {status:502}); }
    const result = await db.transaction(async tx => {
      // Fail closed unless both database constraints exist and are valid.
      const indexes = await tx.execute(sql`SELECT c.relname AS name, pg_get_indexdef(i.indexrelid) AS definition FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_class t ON t.oid = i.indrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = 'public' AND t.relname = 'creatives' AND i.indisunique AND i.indisvalid AND i.indisready AND c.relname IN ('creatives_drive_file_id_unique', 'creatives_normalized_code_unique')`);
      const definitions = new Map(indexes.rows.map(r => [r.name, r.definition]));
      if (!String(definitions.get('creatives_drive_file_id_unique') ?? '').endsWith('USING btree (drive_file_id)') || !String(definitions.get('creatives_normalized_code_unique') ?? '').includes('upper(TRIM(BOTH FROM creative_code))')) return {error:'Chưa bật đủ ràng buộc chống trùng trong cơ sở dữ liệu. Chưa nhập dữ liệu.', status:503};
      const [productRows, creativeRows] = await Promise.all([
        tx.select({id:products.id, code:products.code}).from(products).for('share'),
        tx.select({id:creatives.id, productId:creatives.productId, driveFileId:creatives.driveFileId, creativeCode:creatives.creativeCode}).from(creatives),
      ]);
      const plan = planDriveImport(inventory.files, productRows, creativeRows, body.selected as DriveSelection[]);
      if (plan.errors.length) return {error:`Chưa nhập dữ liệu: ${plan.errors.join(' ')}`, status:409};
      const inserted = await tx.insert(creatives).values(plan.rows.map(({file, productId, creativeCode, fileSizeMb, durationSec}) => ({
        creativeCode, productId, driveFileId:file.id, driveFolderPath:file.path, fileName:file.name,
        mediaType:file.mimeType.startsWith('image/') ? 'image' : 'video', fileSizeMb, durationSec,
        sizeWarning:fileSizeMb >= 80, thumbnailUrl:'', hookAngle:'', lifecycleStatus:'cho_test',
      }))).returning({id:creatives.id, creativeCode:creatives.creativeCode});
      return {inserted, status:200};
    }, {isolationLevel:'serializable'});
    if (result.error) return NextResponse.json({error:result.error}, {status:result.status});
    return NextResponse.json({inserted:result.inserted, message:`Đã nhập metadata của ${result.inserted?.length ?? 0} media. File vẫn nằm trên Drive.`}, {headers:{'Cache-Control':'private, no-store'}});
  } catch (err) {
    const e = err as {code?:string;cause?:{code?:string}};
    if (['23505','40001','23503'].includes(e.code ?? '') || ['23505','40001','23503'].includes(e.cause?.code ?? '')) return NextResponse.json({error:'Dữ liệu vừa thay đổi hoặc bị trùng. Chưa nhập; hãy xem trước lại.'},{status:409});
    console.error('POST /api/creatives/import-drive failed', err);
    return NextResponse.json({error:'Không thể nhập metadata. Hãy kiểm tra lại kho trước khi thử lại.'},{status:500});
  }
}
