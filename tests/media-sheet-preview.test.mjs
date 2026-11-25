import {test} from 'node:test'; import assert from 'node:assert/strict';
import {previewMediaSheet} from '../src/lib/media-sheet-preview.ts';
const h=Array(15).fill('');h[0]='Mã Media';h[3]='Tên SP';h[9]='Định dạng';h[14]='Link Media / Post ID';
const row=(m,p,f,o='')=>{const a=Array(15).fill('');a[0]=m;a[3]=p;a[9]=f;a[14]=o;return a};
const c={code:'GI_M001',productCode:'GI',mediaType:'video',driveFileId:'abc-123'};
test('preview only unique, blank cells and never overwrite post IDs or formulas',()=>{
 const p=previewMediaSheet([h,row('M001','GI','VID')],[c]);assert.equal(p[0].status,'ready');assert.equal(p[0].proposedLink,'https://drive.google.com/file/d/abc-123/view');
 for(const value of ['123_456','=IF(TRUE;"";"")']) assert.equal(previewMediaSheet([h,row('M001','GI','VID',value)],[c])[0].status,'occupied');
 assert.equal(previewMediaSheet([h,row('M001','GI','VID'),row('M001','GI','VID')],[c])[0].status,'duplicate_sheet');
 assert.equal(previewMediaSheet([h,row('M001','GI','VID')],[c,{...c,code:'M001'}])[0].status,'duplicate_catalog');
 assert.equal(previewMediaSheet([h,row('M001','GI','IMG')],[c])[0].status,'unmatched');
 assert.equal(previewMediaSheet([h,row('M001','','VID')],[c])[0].status,'invalid');
 assert.throws(()=>previewMediaSheet([[]],[c]),/Cấu trúc/);
});
