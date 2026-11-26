import type {ReportRow} from './meta-csv-report';
/** Totals for the same ad and reporting period; a blank makes that result unknown. */
export function periodMetrics(rows:ReportRow[]) {
 return {spend:rows.reduce((a,r)=>a+r.spend,0),messages:rows.some(r=>r.messagesBlank)?null:rows.reduce((a,r)=>a+r.messages,0),purchases:rows.some(r=>r.purchasesBlank)?null:rows.reduce((a,r)=>a+r.purchases,0),registrations:rows.some(r=>r.registrationsBlank||r.registrations===null)?null:rows.reduce((a,r)=>a+(r.registrations??0),0)};
}
export function validConflictChoices(adIds:string[],choices:unknown) {
 if(!choices||typeof choices!=='object'||Array.isArray(choices))return false;
 const values=choices as Record<string,unknown>;
 return adIds.every(id=>values[id]==='keep'||values[id]==='replace');
}
