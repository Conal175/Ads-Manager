export type ChartMetricInput = {spend:number; impressions:number; clicks:number; messages:number; purchases:number};
export type ChartMetric = 'spend'|'messages'|'purchases'|'ctr'|'costPerMessage'|'costPerPurchase';
/** Ratios must use aggregate sums, not an average of row-level rates. */
export function chartMetricValue(entry:ChartMetricInput, metric:ChartMetric):number|null {
  switch(metric) {
    case 'spend': return entry.spend;
    case 'messages': return entry.messages;
    case 'purchases': return entry.purchases;
    case 'ctr': return entry.impressions ? entry.clicks / entry.impressions * 100 : null;
    case 'costPerMessage': return entry.messages ? entry.spend / entry.messages : null;
    case 'costPerPurchase': return entry.purchases ? entry.spend / entry.purchases : null;
  }
}
