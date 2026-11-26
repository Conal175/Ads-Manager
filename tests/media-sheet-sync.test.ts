import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inSyncWindow, planStableLinks, syncStableLinks } from '../src/lib/media-sheet-sync';

const header = Array(15).fill('');
header[0]='Mã Media'; header[3]='Tên SP'; header[9]='Định dạng'; header[14]='Link Media / Post ID';
const row = (code:string, value='') => { const r=Array(15).fill(''); r[0]=code; r[3]='Gi'; r[9]='VID'; r[14]=value; return r; };
const catalog = [{code:'M001',productCode:'GI',mediaType:'video',driveFileId:'abc-123'}];
test('only stable unique empty links are proposed', () => {
  const data=[header,row('M001')];
  assert.deepEqual(planStableLinks(data,data,catalog,catalog), [{row:2,link:'https://drive.google.com/file/d/abc-123/view'}]);
  for (const value of ['=IF(TRUE,"","")','123_456','https://other']) {
    const occupied=[header,row('M001',value)];
    assert.deepEqual(planStableLinks(occupied,occupied,catalog,catalog),[]);
  }
  const duplicate=[header,row('M001'),row('M001')];
  assert.deepEqual(planStableLinks(duplicate,duplicate,catalog,catalog),[]);
  const otherFormat=row('M001'); otherFormat[9]='IMG';
  const ambiguous=[header,row('M001'),otherFormat];
  assert.deepEqual(planStableLinks(ambiguous,ambiguous,catalog,catalog),[]);
  assert.throws(()=>planStableLinks(data,[header,row('M001','changed')],catalog,catalog));
  assert.throws(()=>planStableLinks(data,data,catalog,[]));
  assert.throws(()=>planStableLinks([[]],[[]],catalog,catalog));
});
test('only 03:00 to 03:54 Vietnam time is accepted',()=>{
  assert.equal(inSyncWindow(new Date('2026-11-21T19:59:59Z')),false);
  assert.equal(inSyncWindow(new Date('2026-11-21T20:00:00Z')),true);
  assert.equal(inSyncWindow(new Date('2026-11-21T20:54:59Z')),true);
  assert.equal(inSyncWindow(new Date('2026-11-21T20:55:00Z')),false);
});
test('guarded workflow writes once, never on changed snapshots or outside window',async()=>{
  const data=[header,row('M001')];
  let writes=0; let seen:unknown;
  const deps={readSheet:async()=>data, readCatalog:async()=>catalog, isAllowed:()=>true, write:async (u:unknown)=>{writes++; seen=u;}};
  assert.equal(await syncStableLinks(deps),1);
  assert.equal(writes,1);
  assert.deepEqual(seen,[{row:2,link:'https://drive.google.com/file/d/abc-123/view'}]);
  let reads=0;
  await assert.rejects(()=>syncStableLinks({...deps, readSheet:async()=>++reads===1 ? data : [header,row('M001','occupied')]}));
  assert.equal(writes,1);
  await assert.rejects(()=>syncStableLinks({...deps,isAllowed:()=>false}));
  assert.equal(writes,1);
  let checks=0;
  await assert.rejects(()=>syncStableLinks({...deps,isAllowed:()=>++checks===1}));
  assert.equal(writes,1);
});
