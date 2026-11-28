import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('account selection does not itself load account data',()=>{
 const src=read('src/app/ad-accounts/page.tsx');
 assert.match(src,/onChange=\{e=>\{const id=e\.target\.value;setAccountId\(id\);setData\(null\);\}\}/);
 assert.doesNotMatch(src,/void load\(saved\)/);
 assert.match(src,/onClick=\{\(\)=>load\(\)\}/);
});
test('rules and evaluation are separate views and sync happens on explicit click',()=>{
 const src=read('src/components/reports/EvaluationWorkspace.tsx');
 assert.match(src,/if\(view==='rules'\)request\(.*action:'rules'/);
 assert.match(src,/onClick=\{pull\}/);
 assert.equal((src.match(/action:'sync'/g)||[]).length,1);
 assert.match(src,/view==='rules'&&<section/);
 assert.match(src,/view==='evaluation'&&<>/);
});
test('rules endpoint authorizes the account before rule reads and writes',()=>{
 const src=read('src/app/api/meta/evaluation/route.ts');
 assert(src.indexOf("if(identity.role!=='admin'){")<src.indexOf("if(body.action==='rules')"));
 assert(src.indexOf("if(identity.role!=='admin'){")<src.indexOf("if(body.action==='rule')"));
 assert.match(src,/if\(identity\.role!=='admin'\)return reply\(\{error:'Chỉ quản trị viên/);
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
