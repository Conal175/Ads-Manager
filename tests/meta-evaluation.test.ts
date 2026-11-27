import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignObjective,matchMedia,evaluateMedia} from '../src/lib/meta-evaluation';
const sheet=[{code:'M001',adName:'GI_M001_VID',link:'https://drive.google.com/file/d/example/view'}];
test('campaign objective must be the second of five non-empty name tokens',()=>{
 assert.equal(campaignObjective('2711_MESS_Gi_113_C01'),'MESS');
 assert.equal(campaignObjective('2711_conversion_Gi_113_C01'),'CONVERSION');
 for(const name of ['MESS_Gi_113_C01','2711_UNKNOWN_Gi_113_C01','2711_MESS__113_C01','2711_MESS_Gi_113_C01_extra'])assert.equal(campaignObjective(name),null);
});
test('media join rejects ambiguous codes, duplicates, missing links and changed generated names',()=>{
 assert.deepEqual(matchMedia('2711_MESS_Gi_113_C01','GI_M001_VID',sheet),{ok:true,objective:'MESS',code:'M001',link:sheet[0].link});
 for(const [name,rows] of [['GI_M001_M002',sheet],['GI_M001_VID', [...sheet,...sheet]],['GI_M001_VID',[{...sheet[0],link:''}]],['GI_M001_IMG',sheet]] as const)assert.equal(matchMedia('2711_MESS_Gi_113_C01',name,[...rows]).ok,false);
});
test('no conclusion on missing sync, missing metrics or missing rule',()=>{
 const input={objective:'MESS' as const,spend:100,results:5,reach:null,complete:true,matched:true,rule:null};
 assert.equal(evaluateMedia(input).status,'chưa đủ dữ liệu');
 const rule={minSpend:10,minResults:1,target:20,warningMarginPct:10};
 assert.equal(evaluateMedia({...input,rule,complete:false}).status,'chưa đủ dữ liệu');
 assert.equal(evaluateMedia({...input,rule,results:null}).status,'chưa đủ dữ liệu');
 assert.equal(evaluateMedia({...input,rule,results:0}).status,'chưa đủ dữ liệu');
 assert.equal(evaluateMedia({...input,rule,matched:false}).status,'cần kiểm tra');
 assert.equal(evaluateMedia({...input,rule}).status,'đạt');
 assert.equal(evaluateMedia({...input,rule,results:4.7}).status,'cần theo dõi');
 assert.equal(evaluateMedia({...input,rule,results:4}).status,'chưa đạt');
});
test('traffic requires a separately supplied deduplicated reach and applies lower-is-worse threshold',()=>{
 const base={objective:'TRAFFIC' as const,spend:100,results:null,reach:null,complete:true,matched:true,rule:{minSpend:10,minResults:1,target:1000,warningMarginPct:10}};
 assert.equal(evaluateMedia(base).status,'chưa đủ dữ liệu');
 assert.equal(evaluateMedia({...base,reach:1000}).status,'đạt');
 assert.equal(evaluateMedia({...base,reach:950}).status,'cần theo dõi');
 assert.equal(evaluateMedia({...base,reach:800}).status,'chưa đạt');
});

test('groups by campaign plus media and never sums reach across ads',async()=>{
 const {groupInsights}=await import('../src/lib/meta-evaluation');
 const row={campaign_name:'2711_TRAFFIC_Gi_113_C01',campaign_id:'1',ad_name:'GI_M001_VID',ad_id:'10',spend:'10',reach:'25'};
 const grouped=groupInsights([row,{...row,ad_id:'11',reach:'20'},{...row,campaign_id:'2',ad_id:'12'}],sheet);
 assert.equal(grouped.groups.length,2);assert.equal(grouped.groups[0].reach,null);assert.equal(grouped.groups[1].reach,25);
});
