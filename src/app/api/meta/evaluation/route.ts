import {createHmac,timingSafeEqual} from 'node:crypto';
import {GoogleAuth} from 'google-auth-library';
import {authClient,sameOrigin} from '@/lib/auth/server';
import {resolveIdentity} from '@/lib/auth/identity';
import {pool} from '@/db';
import {graphAds,validId} from '@/lib/meta-ad-management';
import {INSIGHT_FIELDS,cleanInsightRows,validInsightRequest} from '@/lib/meta-insights';
import {OBJECTIVES,groupInsights,evaluateMedia,type Objective,type EvaluationRule,type SheetMedia} from '@/lib/meta-evaluation';
export const dynamic='force-dynamic';
export const maxDuration=60;
const sheetId='1fJHNeYryZq-L5rSp3Ek3eXOiVTIDdsbXq3iua4Nm7Ns';
const sheetTitle='Quản Lý Media & Tạo Tên';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});

async function readSheet():Promise<SheetMedia[]> {
 const settings=await pool.query<{google_service_account_json:string|null}>('SELECT google_service_account_json FROM public.system_settings ORDER BY id LIMIT 1');
 const raw=settings.rows[0]?.google_service_account_json?.trim()||process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
 if(!raw)throw new Error('Chưa cấu hình kết nối Sheet.');
 const credentials=JSON.parse(raw) as {client_email?:string;private_key?:string};
 if(!credentials.client_email||!credentials.private_key)throw new Error('Cấu hình kết nối Sheet không hợp lệ.');
 const client=await new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']}).getClient();
 const base=`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
 const meta=await client.request<{sheets?:{properties?:{title?:string;gridProperties?:{rowCount?:number}}}[]}>({url:`${base}?fields=sheets.properties(title,gridProperties.rowCount)`,timeout:10000});
 const n=meta.data.sheets?.find(s=>s.properties?.title===sheetTitle)?.properties?.gridProperties?.rowCount;
 if(!n||n>10000)throw new Error('Không thể đọc toàn bộ Sheet media hoặc Sheet vượt giới hạn 10.000 dòng.');
 const range=`'${sheetTitle}'!A1:O${n}`;
 const data=await client.request<{values?:unknown[][]}>({url:`${base}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,timeout:12000});
 const values=data.data.values??[]; const h=values[0]??[];
 if(h[0]!=='Mã Media'||h[12]!=='Tên ADS (Tự động)'||h[14]!=='Link Media / Post ID')throw new Error('Tiêu đề Sheet media không khớp; cần kiểm tra.');
 const text=(v:unknown)=>typeof v==='string'?v.trim():'';
 return values.slice(1).map(r=>({code:text(r[0]),adName:text(r[12]),link:text(r[14])})).filter(r=>r.code);
}
function validRule(x:unknown):x is EvaluationRule {
 if(!x||typeof x!=='object')return false;
 const r=x as EvaluationRule;
 return [r.minSpend,r.minResults,r.target,r.warningMarginPct].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e12)&&r.target>0&&r.warningMarginPct<=100;
}
export async function POST(req:Request){
 if(!(await sameOrigin()))return reply({error:'Nguồn yêu cầu không hợp lệ.'},403);
 try {
  const client=await authClient(),identity=await resolveIdentity(client);
  if(!identity.authenticated)return reply({error:'Vui lòng đăng nhập.'},401);
  if(!['admin','operator'].includes(identity.role||''))return reply({error:'Bạn không có quyền.'},403);
  const {data:{user}}=await client.auth.getUser();if(!user)return reply({error:'Vui lòng đăng nhập.'},401);
  const body=await req.json();
  if(!validId(body.accountId))return reply({error:'ID tài khoản không hợp lệ.'},400);
  if(identity.role!=='admin'){
   const grant=await pool.query('select 1 from public.meta_ad_account_grants where user_id=$1 and account_id=$2',[user.id,body.accountId]);
   if(!grant.rowCount)return reply({error:'Bạn chưa được cấp quyền với tài khoản này.'},403);
  }
  if(body.action==='rule'){
   if(identity.role!=='admin')return reply({error:'Chỉ quản trị viên có thể thiết lập quy tắc.'},403);
   if(!OBJECTIVES.includes(body.objective)||!validRule(body.rule))return reply({error:'Quy tắc không hợp lệ.'},400);
   const r:EvaluationRule=body.rule;
   await pool.query(`insert into public.meta_evaluation_rules(account_id,objective,min_spend,min_results,target,warning_margin_pct) values($1,$2,$3,$4,$5,$6) on conflict(account_id,objective) do update set min_spend=excluded.min_spend,min_results=excluded.min_results,target=excluded.target,warning_margin_pct=excluded.warning_margin_pct,updated_at=now()`,[body.accountId,body.objective,r.minSpend,r.minResults,r.target,r.warningMarginPct]);
   return reply({ok:true});
  }
  if(body.action==='rules'){
   const rules=await pool.query(`select objective,min_spend,min_results,target,warning_margin_pct from public.meta_evaluation_rules where account_id=$1`,[body.accountId]);
   const ruleMap:Partial<Record<Objective,EvaluationRule>>={};for(const r of rules.rows)ruleMap[r.objective as Objective]={minSpend:Number(r.min_spend),minResults:Number(r.min_results),target:Number(r.target),warningMarginPct:Number(r.warning_margin_pct)};
   return reply({run:null,groups:[],review:[],rules:ruleMap,admin:identity.role==='admin'});
  }
  if(body.action==='history'){
   const history=await pool.query(`select id::text,since_date::text as since,until_date::text as until,status,started_at,finished_at from public.meta_evaluation_runs where account_id=$1 order by id desc limit 100`,[body.accountId]);
   return reply({history:history.rows});
  }
  if(body.action==='savedReport'){
   if(typeof body.id!=='string'||!/^\d{1,20}$/.test(body.id))return reply({error:'Bản lưu không hợp lệ.'},400);
   const result=await pool.query(`select id::text,status,started_at,finished_at,error_message,rows,sheet,since_date::text as since,until_date::text as until from public.meta_evaluation_runs where account_id=$1 and id=$2`,[body.accountId,body.id]);
   if(!result.rows[0])return reply({error:'Không tìm thấy bản lưu.'},404);
   return reply(await buildReport(result.rows[0],body.accountId,identity.role==='admin'));
  }
  if(!validInsightRequest('ad',body.since,body.until))return reply({error:'Khoảng ngày không hợp lệ (tối đa 366 ngày, không chọn ngày tương lai).'},400);
  if(body.action==='save'){
   const secret=process.env.META_READ_ACCESS_TOKEN?.trim();
   if(!secret||typeof body.snapshot!=='string'||body.snapshot.length>5000000||typeof body.signature!=='string'||!/^[a-f0-9]{64}$/.test(body.signature))return reply({error:'Dữ liệu tạm không hợp lệ; hãy kéo lại.'},400);
   const signature=createHmac('sha256',secret).update(body.snapshot).digest();
   if(!timingSafeEqual(signature,Buffer.from(body.signature,'hex')))return reply({error:'Dữ liệu tạm không hợp lệ; hãy kéo lại.'},400);
   const snap=JSON.parse(body.snapshot);
   if(snap.user!==user.id||snap.accountId!==body.accountId||snap.since!==body.since||snap.until!==body.until||!Number.isFinite(snap.expires)||snap.expires<Date.now()||!Array.isArray(snap.rows)||!Array.isArray(snap.sheet)||snap.status!=='complete')return reply({error:'Dữ liệu tạm hết hạn hoặc không khớp; hãy kéo lại.'},400);
   const db=await pool.connect();
   try{
    await db.query('BEGIN');
    await db.query("select pg_advisory_xact_lock(hashtext('meta-eval:' || $1))",[body.accountId]);
    const removed=await db.query(`delete from public.meta_evaluation_runs where account_id=$1 and since_date <= $3::date and until_date >= $2::date`,[body.accountId,body.since,body.until]);
    await db.query(`insert into public.meta_evaluation_runs(account_id,since_date,until_date,status,actor_id,started_at,finished_at,rows,sheet,error_message) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10)`,[body.accountId,body.since,body.until,snap.status,user.id,snap.startedAt,snap.finishedAt,JSON.stringify(snap.rows),JSON.stringify(snap.sheet),snap.error]);
    await db.query('COMMIT');return reply({ok:true,removed:removed.rowCount});
   }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
  }
  if(body.action==='sync'){
   try {
    const startedAt=new Date().toISOString();
    const token=process.env.META_READ_ACCESS_TOKEN?.trim(),version=process.env.META_GRAPH_API_VERSION?.trim()||'v24.0';
    if(!token||!/^v\d{2}\.0$/.test(version))throw new Error('Kết nối Meta chưa được cấu hình.');
    const sheet=await readSheet();const rows:Record<string,unknown>[]=[];let after:string|null=null,more=false;const cursors=new Set<string>();
    for(let i=0;i<4;i++){
     const params:Record<string,string>={fields:INSIGHT_FIELDS,level:'ad',time_range:JSON.stringify({since:body.since,until:body.until}),limit:'100'};
     if(after)params.after=after;
     const rawPage=await graphAds(token,version,`act_${body.accountId}/insights`,params);const page=cleanInsightRows(rawPage);
     if(!Array.isArray(rawPage.data)||rawPage.data.length!==page.rows.length||page.rows.some(r=>r.account_id!==body.accountId||r.date_start!==body.since||r.date_stop!==body.until))throw new Error('Dữ liệu Meta không đầy đủ hoặc sai kỳ.');
     rows.push(...page.rows);more=page.more;
     if(!more)break;
     if(!page.nextCursor||cursors.has(page.nextCursor))break;
     cursors.add(page.nextCursor);after=page.nextCursor;
    }
    const status=more?'partial':'complete',finishedAt=new Date().toISOString();
    const error=more?'Còn trang chưa tải hoặc không có cursor hợp lệ; chưa đủ dữ liệu để đánh giá.':null;
    const snap={user:user.id,accountId:body.accountId,since:body.since,until:body.until,startedAt,finishedAt,status,error,rows,sheet,expires:Date.now()+24*60*60*1000};
    const snapshot=JSON.stringify(snap),signature=createHmac('sha256',token).update(snapshot).digest('hex');
    const report=await buildReport({status,started_at:startedAt,finished_at:finishedAt,error_message:error,rows,sheet},body.accountId,identity.role==='admin');
    return reply({report,snapshot,signature,message:more?'Chưa tải hết dữ liệu; không đưa ra kết luận. Giới hạn hiện tại 400 dòng/lần.':'Đã kéo dữ liệu tạm cho kỳ đã chọn.'});
   } catch {
    return reply({error:'Không thể kéo dữ liệu Meta hoặc đọc Sheet. Kiểm tra kết nối và quyền; chưa đánh giá.'},502);
   }
  }
  return reply({error:'Thao tác không hợp lệ.'},400);
 }catch{return reply({error:'Không thể xử lý yêu cầu. Kiểm tra cấu hình và quyền hệ thống.'},500);}
}
async function buildReport(run:{id?:string;status:string;started_at:string;finished_at:string|null;error_message:string|null;rows:Record<string,unknown>[];sheet:SheetMedia[];since?:string;until?:string},accountId:string,admin:boolean){
 const rules=await pool.query(`select objective,min_spend,min_results,target,warning_margin_pct from public.meta_evaluation_rules where account_id=$1`,[accountId]);
 const ruleMap:Partial<Record<Objective,EvaluationRule>>={};for(const r of rules.rows)ruleMap[r.objective as Objective]={minSpend:Number(r.min_spend),minResults:Number(r.min_results),target:Number(r.target),warningMarginPct:Number(r.warning_margin_pct)};
 const {groups,review}=groupInsights(run.rows,run.sheet);
 const evaluated=groups.map(g=>({...g,ads:g.ads.map(a=>({ad_id:a.ad_id,ad_name:a.ad_name,spend:a.spend,reach:a.reach,actions:a.actions})),evaluation:evaluateMedia({objective:g.objective,spend:g.spend,results:g.results,reach:g.reach,complete:run.status==='complete'&&review.length===0,matched:true,rule:ruleMap[g.objective]??null})}));
 return {run:{id:run.id,status:run.status,startedAt:run.started_at,finishedAt:run.finished_at,error:run.error_message,count:run.rows.length,since:run.since,until:run.until},groups:evaluated,review,rules:ruleMap,admin};
}
