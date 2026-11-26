import { GoogleAuth } from 'google-auth-library';
import { pool } from '@/db';
import { syncStableLinks } from '@/lib/media-sheet-sync';
import type { SheetCreative } from '@/lib/media-sheet-preview';

const title = 'Quản Lý Media & Tạo Tên';
/** The caller must restrict the spreadsheet ID and authorize the request. */
export async function runMediaSheetSync(spreadsheetId:string, isAllowed:()=>boolean): Promise<number> {
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    const lock = await connection.query<{locked:boolean}>("SELECT pg_try_advisory_xact_lock(hashtext('ads-manager-media-sheet-sync')) AS locked");
    if (!lock.rows[0]?.locked) throw new Error('Already running');
    const settings = await connection.query<{google_service_account_json:string|null}>('SELECT google_service_account_json FROM public.system_settings ORDER BY id LIMIT 1');
    const raw = settings.rows[0]?.google_service_account_json?.trim() || process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
    if (!raw) throw new Error('Missing service account');
    const credentials = JSON.parse(raw) as {client_email?:string; private_key?:string};
    if (!credentials.client_email || !credentials.private_key) throw new Error('Invalid service account');
    const client = await new GoogleAuth({credentials, scopes:['https://www.googleapis.com/auth/spreadsheets']}).getClient();
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const meta = await client.request<{sheets?:{properties?:{title?:string;gridProperties?:{rowCount?:number}}}[]}>({url:`${base}?fields=sheets.properties(title,gridProperties.rowCount)`, timeout:10000});
    const count = meta.data.sheets?.find(s=>s.properties?.title===title)?.properties?.gridProperties?.rowCount;
    if (!count || count > 10000) throw new Error('Sheet missing or over limit');
    const range = `'${title}'!A1:O${count}`;
    async function readSheet(): Promise<unknown[][]> {
      const response = await client.request<{values?:unknown[][]}>({url:`${base}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`,timeout:15000});
      return response.data.values ?? [];
    }
    async function readCatalog(): Promise<SheetCreative[]> {
      const result = await connection.query<{code:string;productCode:string;mediaType:string;driveFileId:string}>(`SELECT c.creative_code AS code, p.code AS "productCode", c.media_type AS "mediaType", c.drive_file_id AS "driveFileId" FROM public.creatives c JOIN public.products p ON p.id=c.product_id ORDER BY c.id`);
      return result.rows;
    }
    const updated = await syncStableLinks({
      readSheet, readCatalog, isAllowed,
      // Sheets has no compare-and-set; editors must avoid the entire agreed window.
      // Never retry an uncertain request automatically within this invocation.
      write: async updates => { await client.request({url:`${base}/values:batchUpdate`, method:'POST', timeout:15000, retry:false, data:{valueInputOption:'RAW', data:updates.map(u=>({range:`'${title}'!O${u.row}`,values:[[u.link]]}))}}); },
    });
    await connection.query('COMMIT');
    console.info('media-sheet-sync complete', {updated});
    return updated;
  } catch (error) {
    await connection.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { connection.release(); }
}
