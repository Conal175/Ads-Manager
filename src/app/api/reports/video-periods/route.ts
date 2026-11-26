import {authorizeApi} from '@/lib/auth/server';
import {pool,db} from '@/db';
import {creatives,products} from '@/db/schema';
import {eq} from 'drizzle-orm';
import {parseMetaRows,reportGroupKey} from '@/lib/meta-csv-report';
import {buildDetailedVideoReport} from '@/lib/video-report';
import {createHash} from 'node:crypto';
import {periodMetrics,validConflictChoices} from '@/lib/video-period-metrics';
import type {CatalogMedia} from '@/lib/media-reconciliation';

const error=(message:string,status=400)=>Response.json({error:message},{status});

export async function GET(request:Request) {
 const denied=await authorizeApi('admin');if(denied)return denied;
 try {const url=new URL(request.url),start=url.searchParams.get('start'),end=url.searchParams.get('end');
  if(start&&end){if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))return error('Ngày không hợp lệ.');const result=await pool.query('select report_rows, media from public.video_period_data where active and period_start=$1::date and period_end=$2::date order by id',[start,end]);return Response.json({records:result.rows},{headers:{'Cache-Control':'no-store'}});}
  const result=await pool.query('select period_start::text,period_end::text,count(*)::int as ads,max(created_at) as updated from public.video_period_data where active group by period_start,period_end order by period_start desc,period_end desc limit 200');return Response.json({periods:result.rows},{headers:{'Cache-Control':'no-store'}});
 }catch{return error('Không thể tải dữ liệu đã lưu.',500);}
}
export async function POST(request:Request){
 const denied=await authorizeApi('admin',true);if(denied)return denied;
 try{
  const raw=await request.text();if(Buffer.byteLength(raw,'utf8')>3_000_000)return error('Dữ liệu vượt giới hạn lưu 3 MB.',413);
  const body=JSON.parse(raw),data=body?.data;
  if(!Array.isArray(data)||data.length<2||data.length>25000||data.some((r:unknown)=>!Array.isArray(r)||r.length>100||r.some((c:unknown)=>typeof c!=='string'||c.length>10000)))return error('Dữ liệu file không hợp lệ.');
  const parsed=parseMetaRows(data);if(!parsed.rows.length||parsed.errors.length||parsed.differences.length)return error('File không có dữ liệu, có dòng lỗi hoặc chênh lệch tổng; cần đối chiếu trước khi lưu.');
  const all=parsed.rows;
  const catalog:CatalogMedia[]=await db.select({code:creatives.creativeCode,productCode:products.code,productName:products.name,type:creatives.mediaType,fileName:creatives.fileName}).from(creatives).innerJoin(products,eq(creatives.productId,products.id));
  const report=buildDetailedVideoReport(all,all,catalog);
  const rowsByGroup=new Map<string,typeof all>();
  for(const row of all){const key=reportGroupKey(row);const group=rowsByGroup.get(key)??[];group.push(row);rowsByGroup.set(key,group);}
  const entries=report.videos.flatMap(v=>v.details.filter(d=>d.objective!=='conflict').map(d=>({adId:d.adId,code:v.code,media:v.media,rows:rowsByGroup.get(d.key)??[]})));
  if(!entries.length)return error('Không có video đủ điều kiện lưu. Cần tên đúng mẫu, ID quảng cáo và đối chiếu danh mục duy nhất.');
  const start=all[0].start,end=all[0].end,adIds=entries.map(e=>e.adId);
  const client=await pool.connect();
  try{
   await client.query('begin');await client.query("select pg_advisory_xact_lock(hashtext('video_period_data_v1'))");
   const existing=await client.query('select id::text,ad_id,period_start::text,period_end::text,video_code,report_rows from public.video_period_data where active and ad_id=any($1::text[]) and period_start <= $3::date and period_end >= $2::date order by id',[adIds,start,end]);
   const fingerprint=createHash('sha256').update(JSON.stringify({entries,existing:existing.rows})).digest('hex');
   const conflicts=entries.filter(e=>existing.rows.some(x=>x.ad_id===e.adId)).map(e=>({adId:e.adId,video:e.code,campaign:e.rows[0].campaign,incoming:{start,end,...periodMetrics(e.rows)},existing:existing.rows.filter(x=>x.ad_id===e.adId).map(x=>({id:x.id,video:x.video_code,start:x.period_start,end:x.period_end,...periodMetrics(x.report_rows)}))}));
   if(body.action==='preview'){await client.query('rollback');return Response.json({fingerprint,conflicts,eligible:entries.length,skipped:all.length-entries.reduce((n,e)=>n+e.rows.length,0)});}
   if(body.action!=='save'||body.fingerprint!==fingerprint){await client.query('rollback');return error('Dữ liệu hoặc danh mục đã thay đổi. Hãy xem trước lại.',409);}
   if(!validConflictChoices(conflicts.map(c=>c.adId),body.choices)){await client.query('rollback');return error('Hãy chọn giữ số cũ hoặc thay thế cho từng quảng cáo trùng.');}
   let saved=0,kept=0,replaced=0;
   for(const entry of entries){const old=existing.rows.filter(x=>x.ad_id===entry.adId);if(old.length&&body.choices[entry.adId]==='keep'){kept++;continue;}
    if(old.length){const ids=old.map(x=>x.id);await client.query('update public.video_period_data set active=false,replaced_at=now() where id=any($1::bigint[])',[ids]);replaced+=old.length;}
    await client.query('insert into public.video_period_data(ad_id,period_start,period_end,video_code,report_rows,media) values ($1,$2,$3,$4,$5::jsonb,$6::jsonb)',[entry.adId,start,end,entry.code,JSON.stringify(entry.rows),JSON.stringify(entry.media)]);saved++;
   }
   await client.query('commit');return Response.json({saved,kept,replaced,skipped:all.length-entries.reduce((n,e)=>n+e.rows.length,0)});
  }catch(e){await client.query('rollback');throw e;}finally{client.release();}
 }catch{return error('Không thể xử lý báo cáo. Kiểm tra cấu trúc file và cấu hình lưu trữ.',500);}
}
