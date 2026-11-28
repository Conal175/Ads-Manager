import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('ad area links include overview and preserve role gated older reports',()=>{
 const tabs=read('src/components/reports/WorkspaceTabs.tsx');
 for(const path of ['/ad-accounts/overview','/ad-accounts','/ad-accounts/evaluation','/ad-accounts/rules','/reports'])assert(tabs.includes(`href="${path}"`));
 assert.match(tabs,/{admin&&<Link href="\/reports"/);
 assert.match(read('src/app/ad-accounts/overview/page.tsx'),/WorkspaceTabs active="overview"/);
});
test('creative tools share navigation while legacy settings routes remain available',()=>{
 const tabs=read('src/components/creatives/CreativeWorkspaceTabs.tsx');
 assert.match(tabs,/href="\/creatives"/);assert.match(tabs,/href="\/creatives\/sheet-preview"/);
 assert.match(read('src/app/creatives/page.tsx'),/CreativeWorkspaceTabs active="library"/);
 assert.match(read('src/app/creatives/sheet-preview/page.tsx'),/CreativeWorkspaceTabs active="sheet"/);
 assert.match(read('src/app/system/page.tsx'),/assets\?tab=system/);assert.match(read('src/app/users/page.tsx'),/assets\?tab=users/);
});
