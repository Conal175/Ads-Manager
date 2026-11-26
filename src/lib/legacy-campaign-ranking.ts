import type {ReportRow} from './meta-csv-report';
export type LegacyMetric = 'messages'|'purchases'|'registrations';
export function legacyCampaignRanking(rows:ReportRow[], reference:ReportRow[], metric:LegacyMetric, fileSafe:boolean) {
 const key=(r:ReportRow)=>JSON.stringify([r.accountId||r.account,r.campaignId||r.campaign]);
 const partition=(r:ReportRow)=>JSON.stringify([r.accountId,r.adId,r.start,r.end,r.age,r.gender]);
 const all=new Map<string,ReportRow[]>(), shown=new Map<string,ReportRow[]>(), partitions=new Map<string,number>(), adCampaigns=new Map<string,Set<string>>();
 for(const r of reference){const k=key(r);all.set(k,[...(all.get(k)??[]),r]);if(r.adId){const p=partition(r);partitions.set(p,(partitions.get(p)??0)+1);const a=JSON.stringify([r.accountId,r.adId]);const s=adCampaigns.get(a)??new Set<string>();s.add(k);adCampaigns.set(a,s);}}
 for(const r of rows){const k=key(r);shown.set(k,[...(shown.get(k)??[]),r]);}
 return [...shown].map(([k,items])=>{const full=all.get(k)??items;const spend=items.reduce((s,r)=>s+r.spend,0);const missing=items.some(r=>metric==='messages'?r.messagesBlank:metric==='purchases'?r.purchasesBlank:r.registrationsBlank||r.registrations===null);const result=items.reduce((s,r)=>s+(r[metric]??0),0);const duplicate=full.some(r=>r.adId&&((partitions.get(partition(r))??0)>1||(adCampaigns.get(JSON.stringify([r.accountId,r.adId]))?.size??0)>1));
 const reason=!fileSafe?'Tổng chi tiết không khớp dòng tổng':full.some(r=>!r.accountId||!r.campaignId||!r.adId)?'Thiếu ID tài khoản, campaign hoặc quảng cáo':new Set(full.map(r=>r.campaign)).size>1?'Tên campaign không nhất quán':duplicate?'Dòng phân tách trùng hoặc ID quảng cáo mâu thuẫn':items.length!==full.length?'Bộ lọc chỉ chọn một phần campaign':missing?'Có ô kết quả trống':result===0?'Kết quả bằng 0':null;
 return {key:k,account:items[0].account,campaign:items[0].campaign,campaignId:items[0].campaignId,spend,result:missing?null:result,cost:reason===null?spend/result:null,reason};
 }).sort((a,b)=>a.cost===null?(b.cost===null?a.campaign.localeCompare(b.campaign,'vi'):1):b.cost===null?-1:a.cost-b.cost||a.campaign.localeCompare(b.campaign,'vi'));
}
