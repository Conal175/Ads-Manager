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
 assert.match(src,/view==='rules'\?\{action:'rules'/);
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
