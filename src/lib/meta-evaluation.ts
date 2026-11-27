/** Pure, conservative helpers for a future server-side Meta evaluation pipeline.
 * No network calls, storage, or Meta mutations are performed here.
 */
export const OBJECTIVES = ['MESS', 'PURCHASES', 'CONVERSION', 'TRAFFIC'] as const;
export type Objective = typeof OBJECTIVES[number];
export type SheetMedia = {code:string; adName:string; link:string};
export type Match = {ok:true; objective:Objective; code:string; link:string} | {ok:false; reason:string};
const norm=(v:unknown)=>typeof v==='string'?v.trim().toUpperCase():'';

/** The current Sheet naming convention consists of five non-empty underscore-separated fields. */
export function campaignObjective(name:unknown):Objective|null {
 if(typeof name!=='string')return null;
 const parts=name.trim().split('_');
 if(parts.length!==5 || parts.some(x=>!x.trim()))return null;
 const objective=norm(parts[1]);
 return OBJECTIVES.includes(objective as Objective)?objective as Objective:null;
}

/** Require one exact code token and one unambiguous Sheet row with an identical generated ad name. */
export function matchMedia(campaignName:unknown,adName:unknown,sheet:SheetMedia[]):Match {
 const objective=campaignObjective(campaignName);
 if(!objective)return {ok:false,reason:'Tên chiến dịch hoặc mục tiêu không hợp lệ.'};
 if(typeof adName!=='string'||!adName.trim())return {ok:false,reason:'Thiếu tên quảng cáo.'};
 const parts=norm(adName).split('_');
 const codes=parts.filter(p=>/^M\d+$/.test(p));
 if(parts.length!==3 || parts.some(p=>!p) || codes.length!==1 || codes[0]!==parts[1] || !['VID','IMG'].includes(parts[2]))return {ok:false,reason:'Tên quảng cáo không đúng cấu trúc hoặc mã media không rõ.'};
 const matches=sheet.filter(row=>norm(row.code)===codes[0]);
 if(matches.length!==1)return {ok:false,reason:'Mã media không có hoặc bị trùng trong Sheet.'};
 if(norm(matches[0].adName)!==norm(adName))return {ok:false,reason:'Tên quảng cáo không khớp tên tự động trong Sheet.'};
 if(!matches[0].link.trim())return {ok:false,reason:'Dòng media chưa có link Media / Post ID.'};
 return {ok:true,objective,code:codes[0],link:matches[0].link.trim()};
}

export type EvaluationRule={minSpend:number; minResults:number; target:number; warningMarginPct:number};
export type EvaluationInput={objective:Objective; spend:number|null; results:number|null; reach:number|null; complete:boolean; matched:boolean; rule:EvaluationRule|null};
export type Evaluation={status:'đạt'|'cần theo dõi'|'chưa đạt'|'chưa đủ dữ liệu'|'cần kiểm tra'; recommendation:string; reason:string; formula:string; value:number|null};
const out=(status:Evaluation['status'],recommendation:string,reason:string,formula='',value:number|null=null):Evaluation=>({status,recommendation,reason,formula,value});
const valid=(v:number|null):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
/** Rules are explicit inputs; no default threshold is invented. Reach must already be deduplicated for the exact group and period. */
export function evaluateMedia(input:EvaluationInput):Evaluation {
 if(!input.matched)return out('cần kiểm tra','Kiểm tra ghép mã','Không thể xác định chắc chắn media hoặc mục tiêu.');
 if(!input.complete)return out('chưa đủ dữ liệu','Kiểm tra đồng bộ','Dữ liệu kỳ đánh giá chưa đầy đủ hoặc đồng bộ lỗi.');
 const r=input.rule;
 if(!r || !valid(r.minSpend)||!valid(r.minResults)||!valid(r.target)||r.target===0||!valid(r.warningMarginPct)||r.warningMarginPct>100)return out('chưa đủ dữ liệu','Thiết lập quy tắc','Chưa có quy tắc hợp lệ cho mục tiêu này.');
 if(!valid(input.spend))return out('chưa đủ dữ liệu','Kiểm tra dữ liệu','Thiếu chi tiêu.');
 if(input.spend<r.minSpend)return out('chưa đủ dữ liệu','Theo dõi','Chi tiêu chưa đạt mức tối thiểu.');
 const isReach=input.objective==='TRAFFIC';
 const count=isReach?input.reach:input.results;
 const formula=isReach?'Số người tiếp cận không trùng của media trong chiến dịch, theo kỳ':'Tổng chi tiêu / tổng số kết quả';
 if(!valid(count))return out('chưa đủ dữ liệu','Kiểm tra dữ liệu',isReach?'Chưa có số tiếp cận không trùng cho nhóm này.':'Meta không trả về số kết quả.',formula);
 if(count<r.minResults || (!isReach && count===0))return out('chưa đủ dữ liệu','Theo dõi','Chưa đủ số kết quả tối thiểu để đánh giá.',formula);
 const value=isReach?count:input.spend/count;
 const achieved=isReach?value>=r.target:value<=r.target;
 const near=isReach?value>=r.target*(1-r.warningMarginPct/100):value<=r.target*(1+r.warningMarginPct/100);
 if(achieved)return out('đạt','Tiếp tục','Chỉ số đạt ngưỡng đã thiết lập.',formula,value);
 if(near)return out('cần theo dõi','Theo dõi','Chỉ số nằm trong khoảng theo dõi đã thiết lập.',formula,value);
 return out('chưa đạt','Cân nhắc kiểm tra hoặc tạm dừng','Chỉ số không đạt ngưỡng đã thiết lập.',formula,value);
}

export type InsightRow=Record<string,unknown>;
export type EvaluationGroup={campaignId:string;campaignName:string;mediaCode:string;objective:Objective;link:string;ads:InsightRow[];spend:number|null;results:number|null;reach:number|null};
const nonnegative=(v:unknown):number|null=>{
 if(typeof v!=='string'||!/^\d+(?:\.\d+)?$/.test(v))return null;
 const n=Number(v);return Number.isFinite(n)?n:null;
};
const actionTypes:Record<Exclude<Objective,'TRAFFIC'>,string>={MESS:'onsite_conversion.messaging_conversation_started_7d',PURCHASES:'purchase',CONVERSION:'complete_registration'};
function findAction(row:InsightRow,objective:Exclude<Objective,'TRAFFIC'>):number|null {
 if(!Array.isArray(row.actions))return null;
 const matches=row.actions.filter((x:unknown)=>x&&typeof x==='object'&&(x as {action_type?:unknown}).action_type===actionTypes[objective]);
 return matches.length===1?nonnegative(matches[0].value):null;
}
export function groupInsights(rows:InsightRow[],sheet:SheetMedia[]):{groups:EvaluationGroup[];review:{campaign:string;ad:string;reason:string}[]} {
 const map=new Map<string,EvaluationGroup>(),review:{campaign:string;ad:string;reason:string}[]=[];
 const seen=new Set<string>();
 for(const row of rows){
  const campaign=typeof row.campaign_name==='string'?row.campaign_name:'',ad=typeof row.ad_name==='string'?row.ad_name:'';
  const campaignId=typeof row.campaign_id==='string'?row.campaign_id:'',adId=typeof row.ad_id==='string'?row.ad_id:'';
  const match=matchMedia(campaign,ad,sheet);
  if(!/^\d+$/.test(campaignId)||!/^\d+$/.test(adId)||!match.ok){review.push({campaign,ad,reason:!match.ok?match.reason:'Thiếu ID chiến dịch hoặc quảng cáo.'});continue;}
  if(seen.has(adId)){review.push({campaign,ad,reason:'ID quảng cáo xuất hiện nhiều lần; không đánh giá dữ liệu này.'});continue;}seen.add(adId);
  const key=`${campaignId}:${match.code}`;
  const group=map.get(key)??{campaignId,campaignName:campaign,mediaCode:match.code,objective:match.objective,link:match.link,ads:[],spend:null,results:null,reach:null};
  group.ads.push(row);map.set(key,group);
 }
 for(const group of map.values()){
  const spend=group.ads.map(r=>nonnegative(r.spend));
  group.spend=spend.every(x=>x!==null)?spend.reduce<number>((a,b)=>a+b!,0):null;
  if(group.objective!=='TRAFFIC'){
   const objective=group.objective;const results=group.ads.map(r=>findAction(r,objective));
   group.results=results.every(x=>x!==null)?results.reduce<number>((a,b)=>a+b!,0):null;
  }
  // A single ad's period-level reach is deduplicated by Meta; sums across ads are not.
  group.reach=group.ads.length===1?nonnegative(group.ads[0].reach):null;
 }
 return {groups:[...map.values()],review};
}
