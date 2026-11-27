import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validInsightRequest,cleanInsightRows} from '../src/lib/meta-insights';
test('insights validates level and bounded valid dates',()=>{
 assert(validInsightRequest('ad','2025-01-01','2025-12-31'));
 for(const args of [['ad/../../me','2025-01-01','2025-01-02'],['account','2025-02-30','2025-03-02'],['ad','2024-01-01','2025-12-31'],['ad','2025-03-01','2025-02-01'],['ad','2025-01-01','2999-01-01']])assert(!validInsightRequest(...args as [string,string,string]));
});
test('reports return only bounded permitted metrics and do not expose paging URL',()=>{
 const data=cleanInsightRows({data:[{account_id:'1',spend:'0',actions:[{action_type:'purchase',value:'2',secret:'s'}],access_token:'hidden'}],paging:{next:'https://bad.example/secret'}});
 assert.equal(data.more,true);assert.deepEqual(data.rows,[{account_id:'1',spend:'0',actions:[{action_type:'purchase',value:'2'}]}]);assert(!JSON.stringify(data).includes('secret'));
});

test('pagination exposes only a bounded cursor and never a paging URL',()=>{
 const result=cleanInsightRows({data:[],paging:{next:'https://bad/secret',cursors:{after:'abc_123='}}});assert.equal(result.nextCursor,'abc_123=');assert(!JSON.stringify(result).includes('https'));
 assert.equal(cleanInsightRows({data:[],paging:{next:'https://bad',cursors:{after:'https://bad'}}}).nextCursor,null);
});

test('demographic dimensions and exact action values are preserved without summing variants', async()=>{
 const {actionValue}=await import('../src/lib/meta-insights');
 const row=cleanInsightRows({data:[{age:'35-44',gender:'male',account_currency:'VND',actions:[{action_type:'purchase',value:'2'},{action_type:'offsite_conversion.purchase',value:'4'}]}]}).rows[0];
 assert.equal(row.age,'35-44'); assert.equal(row.gender,'male'); assert.equal(row.account_currency,'VND');
 assert.equal(actionValue(row,'actions','purchase'),'2'); assert.equal(actionValue(row,'actions','complete_registration'),'—');
 assert.equal(actionValue({actions:[{action_type:'purchase',value:'1'},{action_type:'purchase',value:'2'}]},'actions','purchase'),'—');
});
