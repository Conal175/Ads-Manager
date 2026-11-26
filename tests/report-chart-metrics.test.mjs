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
