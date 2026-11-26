/** Meta report preview. This module deliberately never persists imported data. */
export type ReportRow = { accountId:string; campaignId:string; adsetId:string; adId:string; account:string; campaign:string; adset:string; ad:string; age:string; gender:string; currency:string; spend:number; impressions:number; clicks:number; messages:number; purchases:number; registrations:number|null; messagesBlank:boolean; purchasesBlank:boolean; registrationsBlank:boolean; start:string; end:string };
export function parseCsv(text:string): string[][] {
  const rows:string[][]=[]; let row:string[]=[], cell='', quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) { const c=text[i];
    if(quoted) { if(c==='"' && text[i+1]==='"'){cell+='"';i++;} else if(c==='"') quoted=false; else cell+=c; }
    else if(c==='"' && !cell) quoted=true;
    else if(c===','){row.push(cell);cell='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted) throw new Error('CSV có dấu ngoặc kép chưa đóng.');
  if(cell||row.length){row.push(cell);rows.push(row);} return rows;
}
const names={account:'Tên tài khoản',campaign:'Tên chiến dịch',adset:'Tên nhóm quảng cáo',ad:'Tên quảng cáo',age:'Độ tuổi',gender:'Giới tính',currency:'Đơn vị tiền tệ',spend:'Số tiền đã chi tiêu (VND)',impressions:'Lượt hiển thị',clicks:'Lượt click (tất cả)',messages:'Lượt bắt đầu cuộc trò chuyện qua tin nhắn',purchases:'Lượt mua',start:'Lượt bắt đầu báo cáo',end:'Lượt kết thúc báo cáo'} as const;
const idHeaders = {
  accountId: ['ID tài khoản', 'ID tài khoản quảng cáo', 'Account ID'],
  campaignId: ['ID chiến dịch', 'Campaign ID'],
  adsetId: ['ID nhóm quảng cáo', 'Ad Set ID'],
  adId: ['ID quảng cáo', 'Ad ID'],
} as const;
function numberValue(v:string, emptyAsZero=false):number|null {
  v=v.trim(); if(!v) return emptyAsZero?0:null;
  // Meta sample uses comma as decimal separator. Reject thousands separators rather than guessing.
  if(!/^\d+(?:,\d+|\.\d+)?$/.test(v)) return null;
  const n=Number(v.replace(',','.')); return Number.isFinite(n)&&n>=0?n:null;
}
function validDate(value:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d=new Date(value+'T00:00:00Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value;
}
export function parseMetaReport(text:string) {
  return parseMetaRows(parseCsv(text));
}
export function normalizeExcelRows(data: (string|number|boolean|Date|null)[][]):string[][] {
  const header=(data[0]??[]).map(v=>typeof v==='string'?v.trim():'');
  const idIndices=Object.values(idHeaders).flatMap(aliases=>aliases.map(h=>header.indexOf(h)).filter(i=>i>=0));
  if(data.slice(1).some(row=>idIndices.some(i=>typeof row[i]==='number'))) throw new Error('Cột ID trong Excel phải lưu dạng văn bản để tránh mất chữ số. Hãy xuất CSV hoặc đặt cột ID là văn bản trước khi xuất lại.');
  return data.map(row=>row.map(cell=>cell instanceof Date?(Number.isFinite(cell.getTime())?cell.toISOString().slice(0,10):''):cell==null?'':String(cell)));
}
export function parseMetaRows(data:string[][]) {
  if(!data.length) throw new Error('Trang tính hoặc file trống.');
  const headers=data[0].map(x=>x.trim()); const indices=Object.fromEntries(Object.entries(names).map(([key,name])=>[key,headers.indexOf(name)])) as Record<keyof typeof names,number>;
  const missing=Object.entries(names).filter(([key])=>indices[key as keyof typeof names]===-1).map(([,name])=>name);
  if(missing.length) throw new Error('Thiếu cột: '+missing.join(', '));
  const registrationIndex=headers.indexOf('Lượt đăng ký hoàn tất');
  const idIndices=Object.fromEntries(Object.entries(idHeaders).map(([key,aliases])=>[key,aliases.map(name=>headers.indexOf(name)).find(i=>i>=0)??-1])) as Record<keyof typeof idHeaders,number>;
  const rows:ReportRow[]=[]; const errors:{line:number;message:string}[]=[]; let totals=0; let summary: {spend:number|null;impressions:number|null;clicks:number|null;messages:number|null;purchases:number|null;registrations:number|null}|null=null; let blankOutcomes=0;
  data.slice(1).forEach((r,i)=>{
    if(r.every(v=>!v.trim())) return; const get=(k:keyof typeof names)=>(r[indices[k]]??'').trim();
    if(!get('account')&&!get('campaign')&&!get('adset')&&!get('ad')){totals++; if(totals===1) summary={spend:numberValue(get('spend')),impressions:numberValue(get('impressions')),clicks:numberValue(get('clicks')),messages:numberValue(get('messages')),purchases:numberValue(get('purchases')),registrations:registrationIndex<0?null:numberValue((r[registrationIndex]??'').trim())};return;}
    const ids=Object.fromEntries(Object.entries(idIndices).map(([key,index])=>[key,index<0?'':(r[index]??'').trim()])) as Record<keyof typeof idHeaders,string>;
    if(Object.values(ids).some(id=>id && !/^\d+$/.test(id))){errors.push({line:i+2,message:'ID Meta không hợp lệ; cần là chuỗi số đầy đủ.'});return;}
    if (!get('messages') || !get('purchases')) blankOutcomes++;
    const spend=numberValue(get('spend')),impressions=numberValue(get('impressions')),clicks=numberValue(get('clicks'));
    const messages=numberValue(get('messages'),true),purchases=numberValue(get('purchases'),true);
    const registrationText=registrationIndex<0?'':(r[registrationIndex]??'').trim();
    const registrations=registrationIndex<0?null:numberValue(registrationText,true);
    const start=get('start'),end=get('end');
    if(!get('account')||!get('campaign')||!get('adset')||!get('ad')||get('currency')!=='VND'||spend===null||impressions===null||clicks===null||messages===null||purchases===null||(registrationIndex>=0&&(registrations===null||!Number.isSafeInteger(registrations)))||![impressions,clicks,messages,purchases].every(Number.isSafeInteger)||!validDate(start)||!validDate(end)||start>end){errors.push({line:i+2,message:'Thiếu định danh, sai số, tiền tệ hoặc kỳ báo cáo.'});return;}
    rows.push({...ids,account:get('account'),campaign:get('campaign'),adset:get('adset'),ad:get('ad'),age:get('age'),gender:get('gender'),currency:'VND',spend,impressions,clicks,messages,purchases,registrations,messagesBlank:!get('messages'),purchasesBlank:!get('purchases'),registrationsBlank:!registrationText,start,end});
  });
  const periods=new Set(rows.map(r=>`${r.start}/${r.end}`));
  if(periods.size>1) throw new Error('File có nhiều kỳ báo cáo; không cộng các kỳ có thể chồng lấn.');
  const detailTotals=rows.reduce((acc,r)=>({spend:acc.spend+r.spend,impressions:acc.impressions+r.impressions,clicks:acc.clicks+r.clicks,messages:acc.messages+r.messages,purchases:acc.purchases+r.purchases}),{spend:0,impressions:0,clicks:0,messages:0,purchases:0});
  const differences: string[]=[];
  if(summary && totals===1) for(const key of ['spend','impressions','clicks','messages','purchases'] as const) {const expected=(summary as Record<string,number|null>)[key];if(expected!==null && Math.abs(expected-detailTotals[key])>0.01) differences.push(key);}
  const registrationSummary=(summary as {registrations:number|null}|null)?.registrations;
  if(totals===1 && registrationSummary!=null && registrationSummary!==rows.reduce((n,r)=>n+(r.registrations??0),0)) differences.push('registrations');
  if(totals>1) differences.push('multiple_totals');
  return {rows,errors,totals,blankOutcomes,differences,period:rows.length?`${rows[0].start} — ${rows[0].end}`:null};
}
export function reportGroupKey(r:ReportRow) {
  return JSON.stringify([[r.accountId?'id':'name',r.accountId||r.account],[r.campaignId?'id':'name',r.campaignId||r.campaign],[r.adsetId?'id':'name',r.adsetId||r.adset],[r.adId?'id':'name',r.adId||r.ad]]);
}
export function summarizeMeta(rows:ReportRow[]) {
  const groups=new Map<string,{key:string;account:string;campaign:string;adset:string;ad:string;adId:string;mediaCode:string|null;legacyCode:string|null;nameConflict:boolean;spend:number;impressions:number;clicks:number;messages:number;purchases:number}>();
  for(const r of rows){const key=reportGroupKey(r);let g=groups.get(key);if(!g){const match=/^([A-Za-z0-9]+)_(M\d+)_(?:VID|IMG)$/i.exec(r.ad);const legacy=/^(M\d+)_(?:VID|IMG|IMAGE|VIDEO)(?:_|$)/i.exec(r.ad);g={key,account:r.account,campaign:r.campaign,adset:r.adset,ad:r.ad,adId:r.adId,mediaCode:match?`${match[1]}_${match[2]}`.toUpperCase():null,legacyCode:legacy?.[1].toUpperCase()??null,nameConflict:false,spend:0,impressions:0,clicks:0,messages:0,purchases:0};groups.set(key,g);} else if (g.ad!==r.ad) {g.nameConflict=true;g.mediaCode=null;g.legacyCode=null;}g.spend+=r.spend;g.impressions+=r.impressions;g.clicks+=r.clicks;g.messages+=r.messages;g.purchases+=r.purchases;}
  return [...groups.values()].sort((a,b)=>b.spend-a.spend);
}
