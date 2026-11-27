import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {createAdManagementHandler} from '../src/lib/meta-ad-management-handler';
import type {AppRole} from '../src/lib/auth/policy';

type Options={origin?:boolean;authenticated?:boolean;role?:AppRole|null;grant?:boolean;manage?:boolean;campaignAccount?:string;campaignStatus?:string;grantRowCount?:number};
function fixture(options:Options={}) {
 const calls:{path:string;method?:string;params:Record<string,string>}[]=[];
 const queries:string[]=[];
 const deps={
  sameOrigin:async()=>options.origin!==false,
  authClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'11111111-1111-1111-1111-111111111111'}},error:null})}}),
  resolveIdentity:async()=>({authenticated:options.authenticated!==false,role:options.role===undefined?'operator':options.role}),
  pool:{query:async(sql:string)=>{queries.push(sql);if(sql.startsWith('select can_manage'))return {rows:options.grant?[{can_manage:!!options.manage}]:[],rowCount:options.grant?1:0};if(sql.startsWith('insert into'))return {rows:[],rowCount:options.grantRowCount??1};return {rows:[],rowCount:0};}},
  graphAds:async(_token:string,_version:string,path:string,params:Record<string,string>,method?:string)=>{calls.push({path,params,method});if(method==='POST')return {success:true};if(path==='456')return {id:'456',account_id:options.campaignAccount??'123',status:options.campaignStatus??'ACTIVE'};if(path.endsWith('/campaigns'))return {data:[]};if(path.endsWith('/insights'))return {data:[]};return {id:'act_123',name:'Demo'};}
 };
 const handler=createAdManagementHandler(deps as unknown as Parameters<typeof createAdManagementHandler>[0]);
 async function post(body:object){const res=await handler(new NextRequest('https://app.test/api/meta/ad-management',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));return {status:res.status,body:await res.json()};}
 return {post,calls,queries};
}
process.env.META_READ_ACCESS_TOKEN='test-secret';
test('same-origin, identity and role enforced before graph calls',async()=>{
 for(const [options,status] of [[{origin:false},403],[{authenticated:false},401],[{role:'viewer'},403],[{role:null},403]] as [Options,number][]){const f=fixture(options);assert.equal((await f.post({action:'load',accountId:'123'})).status,status);assert.equal(f.calls.length,0);}
});
test('account grants enforce view and manage separately, including admin-only grant',async()=>{
 const denied=fixture();assert.equal((await denied.post({action:'load',accountId:'123'})).status,403);assert.equal(denied.calls.length,0);
 const read=fixture({grant:true});assert.equal((await read.post({action:'load',accountId:'123'})).status,200);assert.equal((await read.post({action:'setStatus',accountId:'123',campaignId:'456',expectedStatus:'ACTIVE',status:'PAUSED'})).status,403);
 assert.equal((await read.post({action:'grant',userId:'11111111-1111-1111-1111-111111111111',accountId:'123',canManage:true})).status,403);
 const admin=fixture({role:'admin',grantRowCount:0});assert.equal((await admin.post({action:'grant',userId:'11111111-1111-1111-1111-111111111111',accountId:'123',canManage:true})).status,400);
});
test('mutation verifies campaign ownership and expected state before sending update',async()=>{
 const body={action:'setStatus',accountId:'123',campaignId:'456',expectedStatus:'ACTIVE',status:'PAUSED'};
 const wrong=fixture({grant:true,manage:true,campaignAccount:'999'});assert.equal((await wrong.post(body)).status,403);assert.equal(wrong.calls.filter(c=>c.method==='POST').length,0);
 const stale=fixture({grant:true,manage:true,campaignStatus:'PAUSED'});assert.equal((await stale.post(body)).status,409);assert.equal(stale.calls.filter(c=>c.method==='POST').length,0);
 const allowed=fixture({grant:true,manage:true});assert.equal((await allowed.post(body)).status,200);assert.deepEqual(allowed.calls.map(c=>[c.path,c.method]),[['456',undefined],['456','POST']]);assert.equal(allowed.calls[1].params.status,'PAUSED');
});

test('insights require account grants and reject invalid dates before Graph request',async()=>{
 const body={action:'insights',accountId:'123',level:'ad',since:'2025-01-01',until:'2025-01-31'};
 const denied=fixture();assert.equal((await denied.post(body)).status,403);assert.equal(denied.calls.length,0);
 const allowed=fixture({grant:true});assert.equal((await allowed.post({...body,level:'invalid'})).status,400);assert.equal(allowed.calls.length,0);
 const result=await allowed.post(body);assert.equal(result.status,200);assert.equal(allowed.calls[0].path,'act_123/insights');assert.equal(allowed.calls[0].params.level,'ad');assert.equal(allowed.calls[0].params.limit,'100');
});
