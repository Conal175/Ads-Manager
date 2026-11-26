import type {ReportRow} from './meta-csv-report';
export type Objective='MESS'|'PURCHASES'|'CONVERSION'|'TRAFFIC';
/** A marker must be a whole ASCII token, not part of another word. */
export function objectiveFromName(name:string):Objective|'unknown'|'conflict' {
  const found=new Set<Objective>((name.toUpperCase().match(/[A-Z0-9]+/g)??[]).filter(x=>['MESS','PURCHASES','CONVERSION','TRAFFIC'].includes(x)) as Objective[]);
  return found.size===0?'unknown':found.size>1?'conflict':[...found][0] as Objective;
}
type Campaign = {key:string;label:string; names:Set<string>; objectives:Set<string>; spend:number; results:number; blankCount:number; missingColumn:boolean; objective:Objective|'unknown'|'conflict'; status:'ranked'|'zero'|'missing'|'unknown'|'conflict'|'unsupported'};
export function classifyCampaigns(rows:ReportRow[]):Campaign[] {
  const groups=new Map<string,{key:string;label:string;names:Set<string>;objectives:Set<string>; rows:ReportRow[]}>();
  for(const r of rows){const key=JSON.stringify([[r.accountId?'id':'name',r.accountId||r.account],[r.campaignId?'id':'name',r.campaignId||r.campaign]]);let g=groups.get(key);if(!g){g={key,label:`${r.account} · ${r.campaign}${r.campaignId?` (ID ${r.campaignId})`:''}`,names:new Set(),objectives:new Set(),rows:[]};groups.set(key,g);}g.names.add(r.campaign);g.objectives.add(objectiveFromName(r.campaign));g.rows.push(r);}
  return [...groups.values()].map(g=>{
    const objective=g.names.size>1 || g.objectives.size>1?'conflict':([...g.objectives][0]??'unknown') as Campaign['objective'];
    const spend=g.rows.reduce((s,r)=>s+r.spend,0);
    const missingColumn=objective==='CONVERSION'&&g.rows.some(r=>r.registrations===null);
    const blankCount=g.rows.filter(r=>objective==='MESS'?r.messagesBlank:objective==='PURCHASES'?r.purchasesBlank:objective==='CONVERSION'?r.registrationsBlank:false).length;
    const results=g.rows.reduce((s,r)=>s+(objective==='MESS'?r.messages:objective==='PURCHASES'?r.purchases:objective==='CONVERSION'?r.registrations??0:0),0);
    const status=objective==='unknown'?'unknown':objective==='conflict'?'conflict':objective==='TRAFFIC'?'unsupported':missingColumn?'missing':results===0?'zero':'ranked';
    return {...g,objective,spend,results,blankCount,missingColumn,status};
  });
}
export function rankObjectiveCampaigns(campaigns:Campaign[],objective:Objective) {
  return campaigns.filter(c=>c.objective===objective&&c.status==='ranked').sort((a,b)=>a.spend/a.results-b.spend/b.results||b.results-a.results||a.label.localeCompare(b.label,'vi'));
}
