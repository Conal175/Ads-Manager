export const INSIGHT_FIELDS='account_id,account_name,account_currency,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,cost_per_action_type,date_start,date_stop';
export const INSIGHT_LEVELS=['account','campaign','adset','ad'] as const;
export function validInsightRequest(level:unknown,since:unknown,until:unknown): boolean {
 if(typeof level!=='string'||!INSIGHT_LEVELS.includes(level as typeof INSIGHT_LEVELS[number])||typeof since!=='string'||typeof until!=='string')return false;
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(`${s}T00:00:00Z`))&&new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)===s;
 if(!valid(since)||!valid(until)||since>until)return false;
 const days=(Date.parse(`${until}T00:00:00Z`)-Date.parse(`${since}T00:00:00Z`))/86400000;
 const today=new Date().toISOString().slice(0,10);
 return days<=365 && until<=today;
}
export function cleanInsightRows(data:Record<string,unknown>) {
 if(!Array.isArray(data.data))throw new Error('Danh sách báo cáo không hợp lệ.');
 const fields=[...INSIGHT_FIELDS.split(','),'age','gender'];
 const rows=data.data.slice(0,100).filter((r:unknown)=>r&&typeof r==='object'&&!Array.isArray(r)).map((r:Record<string,unknown>)=>{
  const result:Record<string,unknown>={};
  for(const key of fields){const value=r[key];if(key==='actions'||key==='cost_per_action_type') {if(Array.isArray(value)) result[key]=value.slice(0,100).filter(v=>v&&typeof v.action_type==='string'&&typeof v.value==='string').map(v=>({action_type:v.action_type,value:v.value}));}else if(typeof value==='string')result[key]=value;}
  return result;
 });
 const paging=data.paging as {next?:unknown;cursors?:{after?:unknown}}|undefined;
 const after=paging?.cursors?.after;
 const nextCursor=Boolean(paging?.next)&&validCursor(after)?after:null;
 return {rows,more:Boolean(paging?.next)||data.data.length>100,nextCursor};
}

export function validCursor(v:unknown): v is string {return typeof v==='string' && /^[A-Za-z0-9_=-]{1,1024}$/.test(v);}

/** Preserve the exact Meta action type; never sum different attribution events. */
export function actionValue(row:Record<string,unknown>,field:'actions'|'cost_per_action_type',type:string):string {
 const list=row[field];if(!Array.isArray(list))return '—';
 const matching=list.filter(a=>a&&a.action_type===type&&typeof a.value==='string');
 return matching.length===1?matching[0].value:'—';
}
