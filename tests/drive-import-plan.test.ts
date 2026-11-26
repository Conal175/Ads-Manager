import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planDriveImport } from '../src/lib/drive-import-plan';
import type { DriveMediaPreview } from '../src/lib/drive-inventory';
const file = (id: string, name: string): DriveMediaPreview => ({id,name,mimeType:'video/mp4',sizeBytes:'100000000',modifiedTime:'2026-11-01T00:00:00Z',durationMillis:'12000',productCode:'GI',month:'2026-11',path:'Gi/2026-11'});
const a = file('a','M001_first.mp4');
const b = file('b','M002_second.mp4');
const products = [{id:1,code:'GI'}];
const select = (f: DriveMediaPreview) => ({...f, productId:1});
test('plans two selected files without copying video bytes',()=>{
 const result=planDriveImport([a,b],products,[],[select(a),select(b)]);
 assert.deepEqual(result.errors,[]); assert.deepEqual(result.rows.map(r=>[r.creativeCode,r.productId,r.fileSizeMb,r.durationSec]),[['M001',1,100,12],['M002',1,100,12]]);
});
test('rejects changed, duplicate, missing or ambiguous records',()=>{
 assert.ok(planDriveImport([a],products,[],[{...select(a),name:'old.mp4'}]).errors.length);
 assert.ok(planDriveImport([a],products,[],[select(a),select(a)]).errors.length);
 assert.ok(planDriveImport([],products,[],[select(a)]).errors.length);
 assert.ok(planDriveImport([a],[],[],[select(a)]).errors.length);
 assert.ok(planDriveImport([a],products,[{id:4,productId:1,driveFileId:'a',creativeCode:'M001'}],[select(a)]).errors.length);
 assert.ok(planDriveImport([a],products,[{id:4,productId:1,driveFileId:'other',creativeCode:'m001'}],[select(a)]).errors.length);
 const c=file('c','M001_second.mp4'); assert.ok(planDriveImport([a,c],products,[],[select(a),select(c)]).errors.length);
 assert.ok(planDriveImport([{...a,sizeBytes:null}],products,[],[{...select(a),sizeBytes:null}]).errors.length);
 assert.ok(planDriveImport([{...a,name:'untitled.mp4'}],products,[],[{...select(a),name:'untitled.mp4'}]).errors.length);
});
