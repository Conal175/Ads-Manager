import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortCreatives, type CreativeFilters } from '../src/lib/creative-filters';
import type { CreativeDTO } from '../src/types/domain';
const item = (id:number, code:string, type:string, size:number, product:string, status:string):CreativeDTO => ({id, creativeCode:code, mediaType:type, fileSizeMb:size, sizeWarning:size>=80, productId:id, product:{id,code:product,name:product}, fileName:`${code}_test`,driveFolderPath:'Gi/ADS Win',driveFileId:String(id), durationSec:0,hookAngle:'',lifecycleStatus:status,mediaCache:[],posts:[]});
const items=[item(1,'M2','video',100,'GI','winning'),item(2,'M10','image',2,'GI','cho_test'),item(3,'M1','video',1,'SP','winning')];
const base:CreativeFilters={search:'',product:'ALL',status:'ALL',mediaType:'ALL',size:'ALL',sort:'newest'};
test('filters combine and search works without mutating input',()=>{
 assert.deepEqual(filterAndSortCreatives(items,{...base,search:'ads win',product:'GI',mediaType:'video',size:'large',status:'winning'}).map(x=>x.id),[1]);
 assert.deepEqual(items.map(x=>x.id),[1,2,3]);
 assert.equal(filterAndSortCreatives(items,{...base,search:'absent'}).length,0);
});
test('sort natural media codes and sizes',()=>{
 assert.deepEqual(filterAndSortCreatives(items,{...base,sort:'code_asc'}).map(x=>x.creativeCode),['M1','M2','M10']);
 assert.deepEqual(filterAndSortCreatives(items,{...base,sort:'size_desc'}).map(x=>x.id),[1,2,3]);
 assert.deepEqual(filterAndSortCreatives(items,base).map(x=>x.id),[3,2,1]);
});
