import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMediaCatalog,reconcileMedia} from '../src/lib/media-reconciliation.ts';
const h=['Mã media','Mã sản phẩm','Tên sản phẩm','Loại','Tên file'];
const catalog=parseMediaCatalog([h,['M001','GI','Gi','video','x.mp4'],['GI_M001','GI','Gi','image','x.jpg'],['M001','ABC','ABC','video','y.mp4']]);
test('only same product, media code and type gives a nonbinding candidate',()=>{
 assert.equal(reconcileMedia('GI_M001_VID',false,catalog).candidates[0].fileName,'x.mp4');
 assert.equal(reconcileMedia('GI_M001_IMG',false,catalog).candidates[0].fileName,'x.jpg');
 assert.equal(reconcileMedia('GI_M002_VID',false,catalog).status,'missing');
 assert.equal(reconcileMedia('M001_VID',false,catalog).status,'legacy');
 assert.equal(reconcileMedia('GI_M001_VID',true,catalog).status,'conflict');
 assert.equal(reconcileMedia('GI_M001_VID',false,[...catalog,catalog[0]]).status,'ambiguous');
 assert.throws(()=>parseMediaCatalog([['Mã media']]),/thiếu cột/);
});
