import {objectiveFromName} from './campaign-objectives';
export type Metric='messages'|'purchases'|'registrations';
const headers={account:['Tên tài khoản','Account name'],accountId:['ID tài khoản','ID tài khoản quảng cáo','Account ID'],campaign:['Tên chiến dịch','Campaign name'],campaignId:['ID chiến dịch','Campaign ID'],spend:['Số tiền đã chi tiêu (VND)','Amount spent (VND)'],currency:['Đơn vị tiền tệ','Currency'],start:['Lượt bắt đầu báo cáo','Reporting starts'],end:['Lượt kết thúc báo cáo','Reporting ends'],messages:['Lượt bắt đầu cuộc trò chuyện qua tin nhắn'],purchases:['Lượt mua'],registrations:['Lượt đăng ký hoàn tất']} as const;
const number=(s:string):number|null=>{if(!/^\d+(?:[,.]\d+)?$/.test(s.trim()))return null;const n=Number(s.trim().replace(',','.'));return Number.isFinite(n)?n:null;};
const validDate=(s:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;};
export function campaignLevelLegacy(data:string[][],metric:Metric,blankZero:boolean,idsSafe:boolean){
 const header=(data[0]??[]).map(x=>x.trim()), indices=Object.fromEntries(Object.entries(headers).map(([k,names])=>[k,names.map(n=>header.indexOf(n)).find(i=>i>=0)??-1])) as Record<keyof typeof headers,number>;
 const required=['account','accountId','campaign','campaignId','spend','currency','start','end',metric] as const;const missing=required.filter(k=>indices[k]<0);if(missing.length)return {error:'Thiếu cột bắt buộc: '+missing.map(k=>headers[k][0]).join(', '),rows:[],excluded:0,period:'',notice:''};
 const prohibited=['Tên nhóm quảng cáo','Ad set name','ID nhóm quảng cáo','Ad set ID','Tên quảng cáo','Ad name','ID quảng cáo','Mã quảng cáo','Ad ID','Độ tuổi','Age','Giới tính','Gender'];
 const levelCols=prohibited.map(n=>header.indexOf(n)).filter(i=>i>=0);
 const rawRows=data.slice(1).filter(r=>r.some(v=>v?.trim()));const get=(r:string[],k:keyof typeof headers)=>(r[indices[k]]??'').trim();
 if(rawRows.some(r=>levelCols.some(i=>(r[i]??'').trim())))return {error:'File có dữ liệu cấp nhóm/quảng cáo hoặc phân tách tuổi, giới tính. Hãy xuất báo cáo cấp campaign không phân tách.',rows:[],excluded:0,period:'',notice:''};
 const detail=rawRows.filter(r=>get(r,'account')||get(r,'campaign')||get(r,'accountId')||get(r,'campaignId')),summaries=rawRows.filter(r=>!detail.includes(r));
 if(summaries.length>1)return {error:'File có nhiều dòng tổng; không thể đối chiếu an toàn.',rows:[],excluded:0,period:'',notice:''};
 const periods=new Set<string>(), seen=new Set<string>();let sumSpend=0,sumResult=0,hasBlank=false,excluded=0;const rows=[];
 for(const r of detail){const acc=get(r,'account'),id=get(r,'accountId'),campaign=get(r,'campaign'),cid=get(r,'campaignId'),start=get(r,'start'),end=get(r,'end'),spend=number(get(r,'spend')),v=get(r,metric),value=v?number(v):null,key=JSON.stringify([id,cid]);
 if(!acc||!campaign||!/^\d+$/.test(id)||!/^\d+$/.test(cid)||get(r,'currency')!=='VND'||spend===null||!validDate(start)||!validDate(end)||start>end||v&&(value===null||!Number.isSafeInteger(value)))return {error:'File có dòng thiếu ID/tên, tiền tệ không phải VND, chỉ số hoặc ngày không hợp lệ.',rows:[],excluded:0,period:'',notice:''};
 if(seen.has(key))return {error:'Có nhiều dòng cho cùng ID tài khoản và campaign. Không cộng để tránh trùng hoặc phân tách.',rows:[],excluded:0,period:'',notice:''};seen.add(key);periods.add(start+'/'+end);sumSpend+=spend;sumResult+=value??0;hasBlank ||= !v;
 if(objectiveFromName(campaign)!=='unknown'){excluded++;continue;}
 const result=value??(blankZero?0:null);const reason=!idsSafe?'ID Excel có nguy cơ sai':result===null?'Ô kết quả trống':result===0?'Không có kết quả':spend===0?'Chi tiêu bằng 0 — cần kiểm tra':null;
 rows.push({key,account:acc,campaign,campaignId:cid,spend,result,reason,cost:reason===null&&result!==null?spend/result:null});
 }
 if(periods.size>1)return {error:'File có nhiều kỳ báo cáo; không xếp hạng các kỳ có thể chồng lấn.',rows:[],excluded:0,period:'',notice:''};
 if(!detail.length)return {error:'Không có campaign trong file.',rows:[],excluded:0,period:'',notice:''};
 let notice='File không có dòng tổng để đối chiếu.';
 if(summaries.length){const s=summaries[0],sp=number(get(s,'spend')),m=number(get(s,metric));if(sp===null||m===null)notice='Dòng tổng thiếu chi tiêu hoặc chỉ số đang chọn; chưa đối chiếu được.';else if(Math.abs(sp-sumSpend)>0.01||m!==sumResult)return {error:'Tổng các dòng campaign không khớp dòng tổng của chỉ số hoặc chi tiêu; không xếp hạng.',rows:[],excluded:0,period:'',notice:''};else notice='Tổng chi tiêu và chỉ số đang chọn khớp dòng tổng.';}
 if(hasBlank&&blankZero)notice+=' Đã tính ô kết quả trống là 0 theo xác nhận của bạn; không chứng minh được từng ô.';
 return {error:'',rows:rows.sort((a,b)=>a.cost===null?(b.cost===null?a.campaign.localeCompare(b.campaign,'vi'):1):b.cost===null?-1:a.cost-b.cost),excluded,period:[...periods][0],notice};
}
