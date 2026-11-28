import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('account selection does not itself load account data',()=>{
 const src=read('src/app/ad-accounts/page.tsx');
 assert.match(src,/onChange=\{e=>\{const id=e\.target\.value;setAccountId\(id\);setData\(null\);/);
 assert.doesNotMatch(src,/void load\(saved\)/);
 assert.match(src,/onClick=\{\(\)=>load\(\)\}/);
});
test('global rules table needs no account and evaluation sync stays manual',()=>{
 const ui=read('src/components/reports/GlobalRules.tsx');
 const evalUi=read('src/components/reports/EvaluationWorkspace.tsx');
 assert.match(ui,/action:'rules'/);
 assert.match(ui,/action:'saveRules'/);
 assert.match(ui,/request\(\{action:'rules'\}\)/);
 assert.match(ui,/objectives\.map/);
 assert.match(evalUi,/onClick=\{pull\}/);
 assert.equal((evalUi.match(/action:'sync'/g)||[]).length,1);
});
test('global rule writes require admin and all report reads use global rules',()=>{
 const src=read('src/app/api/meta/evaluation/route.ts');
 assert(src.indexOf("if(!['admin','operator']")<src.indexOf("if(body.action==='rules')"));
 assert(src.indexOf("if(body.action==='rules')")<src.indexOf('if(!validId(body.accountId))'));
 const save=src.slice(src.indexOf("if(body.action==='saveRules')"),src.indexOf('if(!validId(body.accountId))'));
 assert.match(save,/identity.role!=='admin'/);
 assert.match(save,/OBJECTIVES.some/);
 assert.match(save,/db.query\('BEGIN'\)/);
 assert.match(save,/db.query\('ROLLBACK'\)/);
 assert.match(src,/const ruleMap=await readGlobalRules\(\)/);
 assert.doesNotMatch(src.slice(src.indexOf('async function buildReport')),/from public.meta_evaluation_rules/);
});
test('pull is temporary and explicit save replaces overlapping history atomically',()=>{
 const api=read('src/app/api/meta/evaluation/route.ts');
 const sync=api.slice(api.indexOf("if(body.action==='sync')"),api.indexOf('async function buildReport'));
 assert.doesNotMatch(sync,/insert into public\.meta_evaluation_runs|delete from public\.meta_evaluation_runs/);
 assert.match(sync,/createHmac\('sha256',token\)/);
 const save=api.slice(api.indexOf("if(body.action==='save')"),api.indexOf("if(body.action==='sync')"));
 assert.match(save,/timingSafeEqual/);
 assert.match(save,/snap\.user!==user\.id/);
 assert.match(save,/snap\.status!=='complete'/);
 assert.match(save,/since_date <= \$3::date and until_date >= \$2::date/);
 assert(save.indexOf("db.query('BEGIN')")<save.indexOf('delete from public.meta_evaluation_runs'));
 assert(save.indexOf('insert into public.meta_evaluation_runs')<save.indexOf("db.query('COMMIT')"));
 assert.match(save,/db.query\('ROLLBACK'\)/);
 const ui=read('src/components/reports/EvaluationWorkspace.tsx');
 assert.match(ui,/onClick=\{saveSnapshot\}/);
 assert.match(ui,/window\.confirm/);
 assert.match(ui,/action:'savedReport'/);
});

test('legacy rules respect access and require confirmation before changes',()=>{
 const api=read('src/app/api/meta/evaluation/route.ts');
 const legacy=api.slice(api.indexOf("if(body.action==='legacyRules')"),api.indexOf("if(body.action==='saveRules')"));
 assert.match(legacy,/meta_ad_account_grants/);
 assert.match(legacy,/identity.role!=='admin'/);
 assert.match(legacy,/updated_at::text=\$3/);
 assert.doesNotMatch(legacy,/delete from public\.meta_evaluation_global_rules/);
 const ui=read('src/components/reports/GlobalRules.tsx');
 assert.match(ui,/action:'legacyRules'/);
 assert.match(ui,/action:'deleteLegacyRule'/);
 assert.match(ui,/function applyLegacy[\s\S]*window.confirm/);
 assert.match(ui,/async function deleteLegacy[\s\S]*window.confirm/);
});
test('account search filters loaded names and IDs without pulling data',()=>{
 const src=read('src/app/ad-accounts/page.tsx');
 assert.match(src,/aria-label="Tìm tài khoản quảng cáo theo tên hoặc ID"/);
 assert.match(src,/accounts\.filter\(a=>`\$\{a\.name\} \$\{a\.id\}`/);
 assert.match(src,/grants\.filter\(g=>g\.account_id\.includes\(accountQuery\)\)/);
 assert.match(src,/onChange=\{e=>setAccountSearch\(e\.target\.value\)\}/);
 assert.match(src,/Tài khoản đang chọn vẫn được giữ lại/);
});

test('navigation restores memory only after identity and account grants are checked',()=>{
 const a=read('src/app/ad-accounts/page.tsx');const e=read('src/components/reports/EvaluationWorkspace.tsx');const m=read('src/lib/meta-workspace-memory.ts');
 assert.match(a,/cached\?\.userId===uid&&\(d.admin\|\|!!grant\)/);
 assert.match(e,/cached.userId===uid&&\(d.admin\|\|list.some/);
 assert.match(e,/action:'rules'/);assert.match(e,/evaluateMedia/);
 assert.doesNotMatch(m,/sessionStorage|localStorage/);
 assert.match(a,/metaWorkspaceMemory.setAccount\(null\)/);
 assert.match(e,/metaWorkspaceMemory.setEvaluation\(null\)/);
 const detail=read('src/components/reports/MetaInsights.tsx');assert.match(detail,/metaInsightsMemory.get/);assert.match(detail,/skipInitial/);
});
test('completed matched pulls automatically save media periods and replace only overlapping keys atomically',()=>{
 const api=read('src/app/api/meta/evaluation/route.ts');
 assert.match(api,/status==='complete'&&report\.review\.length===0&&report\.groups\.length>0/);
 assert.match(api,/saveMediaPeriods\(body\.accountId/);
 const save=api.slice(api.indexOf('async function saveMediaPeriods'));
 assert.match(save,/pg_advisory_xact_lock/);
 assert.match(save,/p\.account_id=\$1 and p\.campaign_id=n\.campaign_id and p\.media_code=n\.media_code/);
 assert.match(save,/p\.since_date <= \$3::date and p\.until_date >= \$2::date/);
 assert.match(save,/p\.pulled_at > \$5::timestamptz/);
 assert(save.indexOf('delete from public.meta_media_periods')<save.indexOf('insert into public.meta_media_periods'));
 assert.match(save,/db.query\('ROLLBACK'\)/);
 assert(api.indexOf("if(identity.role!=='admin'){\n   const grant")<api.indexOf("if(body.action==='mediaHistory')"));
 const migration=read('supabase/migrations/20261121170000_meta_media_periods.sql');
 assert.match(migration,/enable row level security/);
 assert.match(migration,/revoke all on public.meta_media_periods/);
});
