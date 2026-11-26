import {reportGroupKey, summarizeMeta, type ReportRow} from './meta-csv-report';

export function buildVideoReport(rows: ReportRow[], referenceRows: ReportRow[] = rows) {
  const groups = summarizeMeta(referenceRows);
  const ids = new Map<string, number>();
  for (const g of groups) if (g.adId) ids.set(g.adId, (ids.get(g.adId) ?? 0) + 1);
  const eligible = new Map<string, string>();
  for (const g of groups) {
    const match = /^([A-Z0-9]+)_(M\d+)_VID$/i.exec(g.ad.trim());
    // A missing ID or an ID used in multiple groups cannot be safely attributed.
    if (match && !g.nameConflict && g.adId && ids.get(g.adId) === 1)
      eligible.set(g.key, `${match[1]}_${match[2]}_VID`.toUpperCase());
  }
  const videos = new Map<string, {code:string;spend:number;messages:number;purchases:number;registrations:number;messagesBlank:boolean;purchasesBlank:boolean;registrationsBlank:boolean;adIds:Set<string>}>();
  let skippedRows = 0;
  for (const r of rows) {
    const code = eligible.get(reportGroupKey(r));
    if (!code) { skippedRows++; continue; }
    let video = videos.get(code);
    if (!video) { video = {code,spend:0,messages:0,purchases:0,registrations:0,messagesBlank:false,purchasesBlank:false,registrationsBlank:false,adIds:new Set()}; videos.set(code,video); }
    video.spend += r.spend; video.messages += r.messages; video.purchases += r.purchases; video.registrations += r.registrations ?? 0;
    video.messagesBlank ||= r.messagesBlank; video.purchasesBlank ||= r.purchasesBlank; video.registrationsBlank ||= r.registrationsBlank || r.registrations === null;
    video.adIds.add(r.adId);
  }
  return {videos:[...videos.values()].sort((a,b)=>b.spend-a.spend),skippedRows};
}

import {objectiveFromName, type Objective} from './campaign-objectives';
import type {CatalogMedia} from './media-reconciliation';

type VideoObjective = 'MESS'|'PURCHASES'|'CONVERSION'|'unknown'|'conflict';
const campaignKey=(r:ReportRow)=>JSON.stringify([r.accountId||r.account,r.campaignId||r.campaign]);
/** Conservative, session-only attribution; never asserts the actual Meta creative or objective. */
export function buildDetailedVideoReport(rows:ReportRow[], referenceRows:ReportRow[], catalog:CatalogMedia[]) {
  const groups=summarizeMeta(referenceRows), ids=new Map<string,number>();
  for(const g of groups) if(g.adId) ids.set(g.adId,(ids.get(g.adId)??0)+1);
  const campaigns=new Map<string,Set<string>>();
  for(const r of referenceRows){const key=campaignKey(r);const names=campaigns.get(key)??new Set<string>(); names.add(r.campaign); campaigns.set(key,names);}
  const partitions=new Map<string,number>();
  const partition=(r:ReportRow)=>JSON.stringify([r.accountId||r.account,r.adId,r.start,r.end,r.age,r.gender]);
  for(const r of referenceRows) if(r.adId){const key=partition(r);partitions.set(key,(partitions.get(key)??0)+1);}
  const unsafe=new Set(referenceRows.filter(r=>r.adId&&(partitions.get(partition(r))??0)>1).map(reportGroupKey));
  const eligible=new Map<string,{code:string;media:CatalogMedia}>();
  for(const g of groups){
    const match=/^([A-Z0-9]+)_(M\d+)_VID$/i.exec(g.ad.trim());
    if(!match||g.nameConflict||!g.adId||ids.get(g.adId)!==1||unsafe.has(g.key)) continue;
    const product=match[1].toUpperCase(), media=match[2].toUpperCase();
    const candidates=catalog.filter(c=>{const p=c.productCode.trim().toUpperCase(), code=c.code.trim().toUpperCase();return p===product&&(code===media||code===`${product}_${media}`);});
    if(candidates.length!==1||!['video','vid'].includes(candidates[0].type.trim().toLowerCase())) continue;
    eligible.set(g.key,{code:`${product}_${media}_VID`,media:candidates[0]});
  }
  type Detail={key:string; account:string;campaign:string;adset:string;ad:string;adId:string;objective:VideoObjective;spend:number;result:number;missing:boolean;statuses:Set<string>};
  type Video={code:string;media:CatalogMedia;details:Map<string,Detail>};
  const videos=new Map<string,Video>(); let skippedRows=0;
  for(const r of rows){
    const key=reportGroupKey(r), match=eligible.get(key); if(!match){skippedRows++;continue;}
    let video=videos.get(match.code);if(!video){video={...match,details:new Map()};videos.set(match.code,video);}
    let detail=video.details.get(key);
    if(!detail){const obj=objectiveFromName(r.campaign);const objective:VideoObjective=(campaigns.get(campaignKey(r))?.size??0)>1?'conflict':obj==='TRAFFIC'?'unknown':obj;detail={key,account:r.account,campaign:r.campaign,adset:r.adset,ad:r.ad,adId:r.adId,objective,spend:0,result:0,missing:false,statuses:new Set()};video.details.set(key,detail);}
    detail.spend+=r.spend;
    if(detail.objective==='MESS'){detail.result+=r.messages;detail.missing ||= r.messagesBlank;}
    else if(detail.objective==='PURCHASES'){detail.result+=r.purchases;detail.missing ||= r.purchasesBlank;}
    else if(detail.objective==='CONVERSION'){detail.result+=r.registrations??0;detail.missing ||= r.registrationsBlank||r.registrations===null;}
    if(r.deliveryStatus) detail.statuses.add(r.deliveryStatus);
  }
  return {videos:[...videos.values()].map(v=>({code:v.code,media:v.media,details:[...v.details.values()],objectives:(['MESS','PURCHASES','CONVERSION'] as Objective[]).map(objective=>{const details=[...v.details.values()].filter(d=>d.objective===objective);const spend=details.reduce((n,d)=>n+d.spend,0),result=details.reduce((n,d)=>n+d.result,0),missing=details.some(d=>d.missing);return {objective,spend,result,missing,count:details.length,cost:!missing&&result>0?spend/result:null};})})).sort((a,b)=>a.code.localeCompare(b.code)),skippedRows};
}
