import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planMediaBulk,manualSyncAllowed} from '../src/lib/media-sheet-bulk';
const header=['Mã Media','','','Tên SP','','','','','','Định dạng','','','','','Link Media / Post ID'];
const cat=[{code:'M003',productCode:'GI',mediaType:'video',driveFileId:'abc'}, {code:'M014',productCode:'GI',mediaType:'image',driveFileId:'def'}];
const row=(code:string,d='',j='',o='')=>[code,'','',d,'','','','','',j,'','','','',o];
test('fill only blank fields from unique catalog and approved dropdowns',()=>{const p=planMediaBulk([header,row('M003'),row('M014')],cat,['Gi'],['VID','IMG']);assert.deepEqual(p.map(x=>[x.code,x.product,x.format,x.fields]),[['M003','Gi','VID',['D','J','O']],['M014','Gi','IMG',['D','J','O']]]);});
test('skip duplicates, conflicts, formulas and unknowns',()=>{const p=planMediaBulk([header,row('M003'),row('M003'),row('M014','Gi','VID'),row('M999')],cat,['Gi'],['VID','IMG']);assert.ok(p.every(x=>x.status==='skipped'));assert.equal(planMediaBulk([header,row('M003','=IF(TRUE;"";"")')],cat,['Gi'],['VID','IMG'])[0].status,'skipped');});
test('only fill missing columns and honor manual window',()=>{const p=planMediaBulk([header,row('M003','Gi','VID')],cat,['Gi'],['VID','IMG']);assert.deepEqual(p[0].fields,['O']);assert.equal(manualSyncAllowed(new Date('2026-11-26T20:30:00Z')),false);assert.equal(manualSyncAllowed(new Date('2026-11-26T21:00:00Z')),true);});
