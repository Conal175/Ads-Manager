// Local isolated DB + fake auth only; this test inserts fixture data into that DB.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const base='http://127.0.0.1:3117';
const pool=new pg.Pool({connectionString:'postgresql://user@127.0.0.1:55432/ads_manager_integration_test'});
const session={access_token:'fake-test-access-token',refresh_token:'fake-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'18ef842a-05b7-4dc6-bb87-742408c33511'}};
const headers={cookie:'sb-127-auth-token=base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),origin:base,'content-type':'application/json'};
async function request(path,method='GET',body){const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,body:await res.json()};}
const expectStatus=(res,status)=>assert.equal(res.status,status,JSON.stringify(res));
after(()=>pool.end());

test('local business workflows and blocked integrations',async()=>{
 const marker=await pool.query('select id,current_database() db from public.integration_test_marker');
 assert.deepEqual(marker.rows,[{id:'local-only-test-database',db:'ads_manager_integration_test'}]);
 assert.equal((await request('/api/auth/me')).body.role,'admin');
 const unique=randomUUID().replaceAll('-','').toUpperCase();
 const product=await request('/api/products','POST',{code:'IT'+unique,name:'Local product',effectiveFrom:'2026-01-01',avgSellingPrice:100000,cogs:30000,shippingPackingFee:10000,otherCost:0,expectedReturnRatePct:0,targetNetMarginPct:10,targetCloseRatePct:20,dailyBudgetTarget:0});expectStatus(product,200);const productId=product.body.product.id;
 const preset=await request('/api/presets','POST',{code:'P'+unique,name:'Test preset',presetType:'target',configJson:{locations:['VN']}});expectStatus(preset,200);
 assert.ok((await request('/api/presets')).body.presets.some(p=>p.id===preset.body.preset.id));
 expectStatus(await request('/api/presets?id='+preset.body.preset.id,'DELETE'),200);
 assert.ok(!(await request('/api/presets')).body.presets.some(p=>p.id===preset.body.preset.id));
 expectStatus(await request('/api/creatives','POST',{productId}),400);
 const creative=await request('/api/creatives','POST',{creativeCode:'C'+unique,productId,driveFileId:'local-file-id',fileName:'local-test.mp4',fileSizeMb:85});expectStatus(creative,200);assert.equal(creative.body.creative.sizeWarning,true);
 const updated=await request('/api/creatives','PATCH',{id:creative.body.creative.id,hookAngle:'New angle',lifecycleStatus:'winning'});expectStatus(updated,200);assert.equal(updated.body.creative.hookAngle,'New angle');
 assert.ok((await request('/api/creatives')).body.creatives.some(c=>c.id===creative.body.creative.id&&c.product.id===productId));
 const draft=await request('/api/launcher','POST',{action:'save_draft',productId,flowType:'flow1_drive'});expectStatus(draft,200);assert.equal(draft.body.draft.status,'draft');
 assert.ok((await request('/api/launcher')).body.drafts.some(d=>d.id===draft.body.draft.id));
 const preflight=await request('/api/launcher','POST',{action:'preflight',flowType:'flow1_drive',dailyBudget:0});expectStatus(preflight,200);assert.equal(preflight.body.preflight.canLaunch,false);
 expectStatus(await request('/api/launcher','POST',{action:'wrong'}),400);
 const sales={action:'upsert_sales',reportDate:'2026-01-02',productId,ordersClosed:10,returnedOrders:2,actualRevenue:800000};
 expectStatus(await request('/api/reports','POST',{...sales,reportDate:'not-date'}),400);
 expectStatus(await request('/api/reports','POST',{...sales,returnedOrders:11}),400);
 expectStatus(await request('/api/actions','PATCH',{id:999999,decision:'invalid'}),400);
 expectStatus(await request('/api/actions','PATCH',{id:999999,decision:'open'}),404);
 let result=await request('/api/reports','POST',sales);expectStatus(result,200);assert.equal(result.body.record.actualReturnRatePct,20);const salesId=result.body.record.id;
 result=await request('/api/reports','POST',{...sales,ordersClosed:20,returnedOrders:3});expectStatus(result,200);assert.equal(result.body.record.id,salesId);assert.equal(result.body.record.actualReturnRatePct,15);
 assert.equal((await pool.query('select count(*)::int n from daily_sales_reconciliation where product_id=$1',[productId])).rows[0].n,1);
 const reports=await request('/api/reports?startDate=2026-01-01&endDate=2026-01-03');expectStatus(reports,200);
 const rule=await request('/api/actions');expectStatus(rule,200);assert.ok(rule.body.ruleConfig);
 const scan=await request('/api/actions','POST',{});expectStatus(scan,200);assert.equal(typeof scan.body.createdCount,'number');
 const [settings]= (await pool.query('select id from system_settings limit 1')).rows;
 const secrets=['fake-meta-secret','fake-google-secret','fake-telegram-secret','fake-ai-secret'];
 await pool.query('update system_settings set meta_system_user_token=$1,google_service_account_json=$2,telegram_bot_token=$3,ai_api_key=$4 where id=$5',[...secrets,settings.id]);
 for(const path of ['/api/settings','/api/system']){const response=await request(path);expectStatus(response,200);for(const secret of secrets)assert.equal(JSON.stringify(response.body).includes(secret),false,path);}
 await pool.query("update system_settings set meta_system_user_token='',google_service_account_json='',telegram_bot_token='',ai_api_key='' where id=$1",[settings.id]);
 const telegram=await request('/api/system','POST',{action:'test_telegram'});expectStatus(telegram,502);
 for(const [path,body] of [['/api/assets',{}],['/api/creatives',{action:'sync_drive'}],['/api/meta-posts',{action:'pull_from_fanpage'}],['/api/reports',{action:'refresh_insights'}],['/api/reports',{action:'sync_sheets'}],['/api/system',{action:'simulate_rate_limit'}]]) expectStatus(await request(path,'POST',body),501);
});
