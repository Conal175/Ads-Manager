import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderDrivePreview} from '../src/lib/drive-preview-order';
test('existing files and used codes appear last, in their original order; optionally hidden',()=>{
 const files=[{id:1,status:'existing'},{id:2,status:'new'},{id:3,status:'duplicate_code'},{id:4,status:'unknown_product'},{id:5,status:'new'}];
 assert.deepEqual(orderDrivePreview(files).map(f=>f.id),[2,4,5,1,3]);
 assert.deepEqual(orderDrivePreview(files,true).map(f=>f.id),[2,4,5]);
 assert.deepEqual(files.map(f=>f.id),[1,2,3,4,5]);
});
