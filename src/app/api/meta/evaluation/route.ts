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
  if(!validInsightRequest('ad',body.since,body.until))return reply({error:'Khoảng ngày không hợp lệ (tối đa 366 ngày, không chọn ngày tương lai).'},400);
  if(body.action==='sync'){
   const db=await pool.connect();let runId:string|undefined;
   try {
    await db.query('BEGIN');
    const locked=await db.query<{locked:boolean}>("select pg_try_advisory_xact_lock(hashtext('meta-eval:' || $1)) as locked",[body.accountId]);
    if(!locked.rows[0].locked)return reply({error:'Tài khoản đang được kéo dữ liệu. Hãy thử lại sau.'},409);
    const run=await db.query<{id:string}>(`insert into public.meta_evaluation_runs(account_id,since_date,until_date,status,actor_id) values($1,$2,$3,'running',$4) returning id::text`,[body.accountId,body.since,body.until,user.id]);runId=run.rows[0].id;
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
    const status=more?'partial':'complete';
    await db.query(`update public.meta_evaluation_runs set status=$2,finished_at=now(),rows=$3::jsonb,sheet=$4::jsonb,error_message=$5 where id=$1`,[runId,status,JSON.stringify(rows),JSON.stringify(sheet),more?'Còn trang chưa tải hoặc không có cursor hợp lệ; chưa đủ dữ liệu để đánh giá.':null]);
    await db.query('COMMIT');
    return reply({status,count:rows.length,message:more?'Chưa tải hết dữ liệu; không đưa ra kết luận. Giới hạn hiện tại 400 dòng/lần.':'Đã kéo dữ liệu cho kỳ đã chọn.'});
   } catch {
    if(runId)await db.query("update public.meta_evaluation_runs set status='failed',finished_at=now(),error_message='Không thể kéo dữ liệu Meta hoặc đọc Sheet. Kiểm tra kết nối và quyền.' where id=$1",[runId]).catch(()=>{});
    await db.query('COMMIT').catch(()=>{});
    return reply({error:'Không thể kéo dữ liệu Meta hoặc đọc Sheet. Kiểm tra kết nối và quyền; chưa đánh giá.'},502);
   } finally {await db.query('ROLLBACK').catch(()=>{});db.release();}
  }
  if(body.action==='report'){
   const result=await pool.query(`select id::text,status,started_at,finished_at,error_message,rows,sheet from public.meta_evaluation_runs where account_id=$1 and since_date=$2 and until_date=$3 order by id desc limit 1`,[body.accountId,body.since,body.until]);
   const run=result.rows[0]??null;
   const rules=await pool.query(`select objective,min_spend,min_results,target,warning_margin_pct from public.meta_evaluation_rules where account_id=$1`,[body.accountId]);
   const ruleMap:Partial<Record<Objective,EvaluationRule>>={};for(const r of rules.rows)ruleMap[r.objective as Objective]={minSpend:Number(r.min_spend),minResults:Number(r.min_results),target:Number(r.target),warningMarginPct:Number(r.warning_margin_pct)};
   if(!run)return reply({run:null,groups:[],review:[],rules:ruleMap,admin:identity.role==='admin'});
   const {groups,review}=groupInsights(run.rows,run.sheet);
   const evaluated=groups.map(g=>({...g,ads:g.ads.map(a=>({ad_id:a.ad_id,ad_name:a.ad_name,spend:a.spend,reach:a.reach,actions:a.actions})),evaluation:evaluateMedia({objective:g.objective,spend:g.spend,results:g.results,reach:g.reach,complete:run.status==='complete'&&review.length===0,matched:true,rule:ruleMap[g.objective]??null})}));
   return reply({run:{id:run.id,status:run.status,startedAt:run.started_at,finishedAt:run.finished_at,error:run.error_message,count:run.rows.length},groups:evaluated,review,rules:ruleMap,admin:identity.role==='admin'});
  }
  return reply({error:'Thao tác không hợp lệ.'},400);
 }catch{return reply({error:'Không thể xử lý yêu cầu. Kiểm tra cấu hình và quyền hệ thống.'},500);}
}
