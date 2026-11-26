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
