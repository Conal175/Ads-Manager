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

export type EfficiencyMetric = 'costPerMessage'|'costPerPurchase'|'ctr';
/** Null denominators are unranked; deterministic ties prefer more results, then label. */
export function rankByEfficiency<T extends ChartMetricInput & {label:string}>(entries:T[],metric:EfficiencyMetric) {
  const ranked=entries.map(entry=>({entry,value:chartMetricValue(entry,metric)}));
  const valid=ranked.filter((x):x is {entry:T;value:number}=>x.value!==null && Number.isFinite(x.value));
  const unranked=ranked.filter(x=>x.value===null || !Number.isFinite(x.value));
  valid.sort((a,b)=>{
    const delta=metric==='ctr'?b.value-a.value:a.value-b.value;
    const volume=metric==='costPerMessage'?b.entry.messages-a.entry.messages:metric==='costPerPurchase'?b.entry.purchases-a.entry.purchases:b.entry.impressions-a.entry.impressions;
    return delta||volume||a.entry.label.localeCompare(b.entry.label,'vi');
  });
  return {ranked:valid,unranked};
}
