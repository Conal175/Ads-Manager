import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkMetaReadConnection} from '../src/lib/meta-read-connection';

test('read check uses bearer header, returns separate results and never exposes page tokens or paging URL',async()=>{
 const seen:string[]=[];
 const fake:typeof fetch=async (input,init)=>{
  const url=new URL(String(input)); seen.push(url.pathname);
  assert.equal(url.hostname,'graph.facebook.com');assert.equal(url.search.includes('token'),false);
  assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer secret-token');assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');
  const data=url.pathname.endsWith('/me/permissions')?{data:[{permission:'ads_read',status:'granted'},{permission:'ads_management',status:'declined'}]}:url.pathname.endsWith('/me/accounts')?{data:[{id:'1',name:'Page',access_token:'page-secret'}],paging:{next:'https://example.com/?access_token=page-secret'}}:{id:'act_123',name:'Account',currency:'VND',account_status:1};
  return new Response(JSON.stringify(data),{status:200});
 };
 const result=await checkMetaReadConnection('secret-token','123','v24.0',fake);
 assert.equal(seen.length,3);assert(result.permissions.ok);assert.deepEqual(result.permissions.data.granted,['ads_read']);assert(result.permissions.data.missing.includes('ads_management'));
 assert(result.account.ok);assert.equal(result.account.data.name,'Account');assert(result.pages.ok);assert.equal(result.pages.data.hasMore,true);
 assert(!JSON.stringify(result).includes('secret'));assert.deepEqual(result.pages.data.pages,[{id:'1',name:'Page'}]);
});
test('partial failures do not claim success or expose upstream error message',async()=>{
 const fake:typeof fetch=async(input)=>String(input).includes('me/accounts') ? new Response(JSON.stringify({error:{code:190,message:'secret'}}),{status:400}) : new Response(JSON.stringify(String(input).includes('permissions')?{data:[]}:{id:'act_123',name:'Account'}));
 const result=await checkMetaReadConnection('secret','123','v24.0',fake);
 assert(result.account.ok);assert(!result.pages.ok);assert.equal(result.pages.code,190);assert(!JSON.stringify(result).includes('secret'));
 await assert.rejects(checkMetaReadConnection('token','../evil','v24.0',fake),/Invalid/);
});
