import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('campaign overview uses account and campaign Meta levels separately from stored history',()=>{
 const s=read('src/app/ad-accounts/overview/page.tsx');
 assert.match(s,/level:'account'/);assert.match(s,/level:'campaign'/);
 assert.match(s,/accountPage\.rows\.length===1&&!loaded\.accountPage\.more/);
 assert.match(s,/MediaPeriodHistory account=\{account\}/);
 assert.match(s,/không cộng vào số liệu Meta trực tiếp/);
 assert.match(s,/Danh sách chưa đầy đủ/);assert.match(s,/onClick=\{load\}/);
 assert.doesNotMatch(s,/action:'setStatus'|action:'sync'/);
 assert.match(s,/requestId\.current\+\+/);
});
test('existing account grants protect Meta and stored history requests',()=>{
 const api=read('src/lib/meta-ad-management-handler.ts'),history=read('src/app/api/meta/evaluation/route.ts');
 assert(api.indexOf('meta_ad_account_grants')<api.indexOf("if(body.action==='insights')"));
 assert(history.indexOf("if(identity.role!=='admin'){\n   const grant")<history.indexOf("if(body.action==='mediaHistory')"));
});
