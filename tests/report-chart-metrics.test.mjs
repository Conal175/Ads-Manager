import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chartMetricValue} from '../src/lib/report-chart-metrics.ts';
test('rates use totals and undefined denominators are not zero-cost results',()=>{
 const totals={spend:300,impressions:1100,clicks:21,messages:3,purchases:2};
 assert.equal(chartMetricValue(totals,'ctr'),21/1100*100);
 assert.equal(chartMetricValue(totals,'costPerMessage'),100);
 assert.equal(chartMetricValue(totals,'costPerPurchase'),150);
 const empty={spend:100,impressions:0,clicks:0,messages:0,purchases:0};
 assert.equal(chartMetricValue(empty,'ctr'),null);
 assert.equal(chartMetricValue(empty,'costPerMessage'),null);
 assert.equal(chartMetricValue(empty,'costPerPurchase'),null);
});

test('efficiency ranking favors lower cost or higher CTR, and leaves missing outcomes unranked',async()=>{
 const {rankByEfficiency}=await import('../src/lib/report-chart-metrics.ts');
 const base={impressions:100,clicks:10,purchases:0};
 const items=[{...base,label:'expensive',spend:1000,messages:2},{...base,label:'efficient',spend:300,messages:3},{...base,label:'no results',spend:500,messages:0},{...base,label:'zero cost',spend:0,messages:2}];
 const r=rankByEfficiency(items,'costPerMessage');
 assert.deepEqual(r.ranked.map(x=>x.entry.label),['zero cost','efficient','expensive']);
 assert.deepEqual(r.unranked.map(x=>x.entry.label),['no results']);
 assert.equal(rankByEfficiency(items,'costPerPurchase').ranked.length,0);
 const ctr=rankByEfficiency([{...items[0],label:'low',clicks:1},{...items[1],label:'high',clicks:20},{...items[2],label:'undefined',impressions:0}],'ctr');
 assert.deepEqual(ctr.ranked.map(x=>x.entry.label),['high','low']);
 assert.equal(ctr.unranked[0].entry.label,'undefined');
});
