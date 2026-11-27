import {test} from 'node:test';
import assert from 'node:assert/strict';
import {graphAds,parseCampaigns,validId,MetaAdsError} from '../src/lib/meta-ad-management';
test('bounded Graph requests keep credentials in headers and allow only expected paths',async()=>{
 const calls:{url:URL;init?:RequestInit}[]=[];
 const fake:typeof fetch=async (url,init)=>{calls.push({url:new URL(String(url)),init});return Response.json({success:true});};
 await graphAds('secret','v24.0','act_123/campaigns',{fields:'id,name',limit:'100'},'GET',fake);
 await graphAds('secret','v24.0','456',{status:'PAUSED'},'POST',fake);
 assert.equal(calls[0].url.hostname,'graph.facebook.com');assert(!calls[0].url.href.includes('secret'));assert.equal((calls[0].init?.headers as Record<string,string>).Authorization,'Bearer secret');
 assert.equal(calls[1].init?.body,'status=PAUSED');assert.equal(calls[1].init?.redirect,'error');
 await assert.rejects(graphAds('secret','v24.0','../me',{},'GET',fake));
 assert.equal(validId('123'),true);assert.equal(validId('act_123'),false);
});
test('Graph errors never expose upstream messages or credentials',async()=>{
 await assert.rejects(graphAds('secret','v24.0','123',{},'GET',async()=>Response.json({error:{code:10,message:'secret'}},{status:403})),(e:unknown)=>e instanceof MetaAdsError&&e.code===10&&!e.message.includes('secret'));
 await assert.rejects(graphAds('secret','v24.0','123',{status:'PAUSED'},'POST',async()=>{throw new Error('secret')}),/có thể đã được áp dụng/);
});
test('campaigns strip unneeded fields and flag additional pages',()=>{
 const data=parseCampaigns({data:[{id:'123',name:'Test',status:'ACTIVE',effective_status:'PAUSED',secret:'private'},{id:'bad',name:'Bad'}],paging:{next:'https://example.com/private'}});
 assert.equal(data.campaigns.length,1);assert.equal(data.more,true);assert(!JSON.stringify(data).includes('private'));
});
