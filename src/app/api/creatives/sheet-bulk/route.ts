import { createHash } from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';
import { authorizeApi } from '@/lib/auth/server';
import { pool } from '@/db';
import { manualSyncAllowed, planMediaBulk } from '@/lib/media-sheet-bulk';
import type { SheetCreative } from '@/lib/media-sheet-preview';

export const dynamic='force-dynamic';
export const maxDuration=60;
const spreadsheetId='1fJHNeYryZq-L5rSp3Ek3eXOiVTIDdsbXq3iua4Nm7Ns';
const title='Quản Lý Media & Tạo Tên';
const noStore={ 'Cache-Control':'private, no-store' };
async function run(expected?:string) {
 const db=await pool.connect(); let writing=false;
 try {
  await db.query('BEGIN');
  const lock=await db.query<{locked:boolean}>("SELECT pg_try_advisory_xact_lock(hashtext('ads-manager-media-sheet-sync')) AS locked");
  if(!lock.rows[0]?.locked) return {status:409, body:{error:'Một lượt đồng bộ đang chạy. Hãy thử xem trước lại.'}};
  const settings=await db.query<{google_service_account_json:string|null}>('SELECT google_service_account_json FROM public.system_settings ORDER BY id LIMIT 1');
  const raw=settings.rows[0]?.google_service_account_json?.trim() || process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if(!raw) throw new Error('Missing service account');
  const cred=JSON.parse(raw) as {client_email?:unknown;private_key?:unknown};
  if(typeof cred.client_email!=='string'||typeof cred.private_key!=='string') throw new Error('Invalid service account');
  const client=await new GoogleAuth({credentials:{client_email:cred.client_email,private_key:cred.private_key},scopes:['https://www.googleapis.com/auth/spreadsheets']}).getClient();
  const base=`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const meta=await client.request<{sheets?:{properties?:{title?:string;gridProperties?:{rowCount?:number}}}[]}>({url:`${base}?fields=sheets.properties(title,gridProperties.rowCount)`,timeout:10000});
  const count=meta.data.sheets?.find(s=>s.properties?.title===title)?.properties?.gridProperties?.rowCount;
  if(!count||count>10000) throw new Error('Sheet missing or too large');
  async function snapshot() {
   const ranges=[`'${title}'!A1:O${count}`,"'Cấu Hình Dropdown'!B2:B1000","'Cấu Hình Dropdown'!G2:G1000"];
   const params=new URLSearchParams({valueRenderOption:'FORMULA'}); ranges.forEach(r=>params.append('ranges',r));
   const [result,catalog]=await Promise.all([client.request<{valueRanges?:{values?:unknown[][]}[]}>({url:`${base}/values:batchGet?${params}`,timeout:15000}),db.query<SheetCreative>(`SELECT c.creative_code AS code, p.code AS "productCode", c.media_type AS "mediaType", c.drive_file_id AS "driveFileId" FROM public.creatives c JOIN public.products p ON p.id=c.product_id ORDER BY c.id`)]);
   const rangesOut=result.data.valueRanges; if(!rangesOut || rangesOut.length!==3) throw new Error('Incomplete read');
   const sheet=rangesOut[0].values??[], products=(rangesOut[1].values??[]).map(r=>r[0]), formats=(rangesOut[2].values??[]).map(r=>r[0]);
   const rows=planMediaBulk(sheet,catalog.rows,products,formats);
   const hash=createHash('sha256').update(JSON.stringify([sheet,catalog.rows,products,formats])).digest('hex');
   return {rows,hash};
  }
  const first=await snapshot();
  if(!expected) return {status:200,body:first};
  if(!manualSyncAllowed(new Date())) return {status:409,body:{error:'Không đồng bộ thủ công trong khung 03:00–04:00 giờ Việt Nam.'}};
  if(first.hash!==expected) return {status:409,body:{error:'Sheet hoặc kho đã thay đổi. Hãy xem trước lại; chưa ghi.'}};
  const second=await snapshot();
  if(first.hash!==second.hash || !manualSyncAllowed(new Date())) return {status:409,body:{error:'Dữ liệu hoặc khung giờ đã thay đổi. Hãy xem trước lại; chưa ghi.'}};
  const data=second.rows.filter(r=>r.status==='ready').flatMap(r=>r.fields.map(col=>({range:`'${title}'!${col}${r.row}`,values:[[col==='D'?r.product:col==='J'?r.format:r.link]]})));
  if(data.length>3000) throw new Error('Too many updates');
  if(data.length){writing=true; await client.request({url:`${base}/values:batchUpdate`,method:'POST',timeout:15000,retry:false,data:{valueInputOption:'RAW',data}}); writing=false;}
  await db.query('COMMIT');
  return {status:200,body:{updatedRows:second.rows.filter(r=>r.status==='ready').length, updatedCells:data.length}};
 } catch(error){
  console.error('bulk media sheet sync failed', error instanceof Error ? error.message : 'unknown');
  return {status:502,body:{error:writing?'Chưa rõ kết quả ghi. Hãy kiểm tra Sheet và xem trước lại trước khi thử tiếp.':'Không thể kiểm tra Sheet hoặc kho; chưa thực hiện ghi.'}};
 } finally {await db.query('ROLLBACK').catch(()=>{}); db.release();}
}
export async function GET(){const denied=await authorizeApi('operator');if(denied)return denied;const result=await run();return Response.json(result.body,{status:result.status,headers:noStore});}
export async function POST(request:Request){const denied=await authorizeApi('operator',true);if(denied)return denied;let body;try{body=await request.json();}catch{return Response.json({error:'Yêu cầu không hợp lệ.'},{status:400});} if(body?.confirm!==true || typeof body.hash!=='string'|| !/^[a-f0-9]{64}$/.test(body.hash))return Response.json({error:'Hãy xem trước và xác nhận.'},{status:400});const result=await run(body.hash);return Response.json(result.body,{status:result.status,headers:noStore});}
