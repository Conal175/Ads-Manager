import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectDriveInventory} from '../src/lib/drive-inventory.ts';
const folder='application/vnd.google-apps.folder';
test('traverse product/month folders without importing or following shortcuts',async()=>{
 const tree={root:[{id:'p',name:'sp01',mimeType:folder},{id:'shortcut',name:'link',mimeType:'application/vnd.google-apps.shortcut'}],p:[{id:'m',name:'2026-11',mimeType:folder},{id:'bad',name:'november',mimeType:folder}],m:[{id:'v',name:'video.mp4',mimeType:'video/mp4',size:'100',videoMediaMetadata:{durationMillis:'4000'}},{id:'doc',name:'text.txt',mimeType:'text/plain'}]};
 const paths=[]; const result=await collectDriveInventory('root',async id=>{paths.push(id);return tree[id]});
 assert.deepEqual(paths,['root','p','m']); assert.equal(result.files.length,1);assert.equal(result.files[0].productCode,'SP01');assert.equal(result.files[0].durationMillis,'4000');assert.equal(result.warnings.length,3);
});
test('reject duplicate product folders and invalid folder IDs',async()=>{
 await assert.rejects(collectDriveInventory('root',async id=>id==='root'?[{id:'a',name:'Sp01',mimeType:folder},{id:'b',name:'SP01',mimeType:folder}]:[]),/Duplicate/);
 await assert.rejects(collectDriveInventory("invalid'",async()=>[]),/Invalid/);
});
test('limit directory scan and fail instead of silently truncating',async()=>{
 let n=0; await assert.rejects(collectDriveInventory('root',async()=>{n++;return n===1?Array.from({length:61},(_,i)=>({id:'p'+i,name:'p'+i,mimeType:folder})):[]}),/limit/i);
});
test('classify existing, new, unknown and conflicting media without writing', async()=>{
 const {matchDriveInventory}=await import('../src/lib/drive-inventory.ts');
 const f=(id,productCode)=>({id,name:id,mimeType:'image/png',sizeBytes:null,modifiedTime:null,durationMillis:null,productCode,month:'2026-11',path:''});
 const files=[f('new','A'),f('old','A'),f('none','Z'),f('other','A'),f('dupe','A'),f('dupe','A'),f('amb','B'),f('dbdupe','A')];
 const products=[{id:1,code:'A'},{id:2,code:'B'},{id:3,code:' b '}];
 const creatives=[{id:1,productId:1,driveFileId:'old'},{id:2,productId:9,driveFileId:'other'},{id:3,productId:1,driveFileId:'dbdupe'},{id:4,productId:1,driveFileId:'dbdupe'}];
 const result=matchDriveInventory(files,products,creatives);
 assert.deepEqual(result.files.map(x=>x.status),['new','existing','unknown_product','product_conflict','duplicate_file','duplicate_file','ambiguous_product','duplicate_file']);
 assert.deepEqual(result.counts,{new:1,existing:1,unknown_product:1,product_conflict:1,duplicate_file:3,ambiguous_product:1});
});
