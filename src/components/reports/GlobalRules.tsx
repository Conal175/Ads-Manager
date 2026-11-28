'use client';
import {useEffect,useState} from 'react';
import {WorkspaceTabs} from '@/components/reports/WorkspaceTabs';

type Objective='MESS'|'PURCHASES'|'CONVERSION'|'TRAFFIC';
type Fields={target:string;minSpend:string;minResults:string;warningMarginPct:string};
type Rule={target:number;minSpend:number;minResults:number;warningMarginPct:number};
const objectives:Objective[]=['MESS','PURCHASES','CONVERSION','TRAFFIC'];
const names:Record<Objective,string>={MESS:'Tin nhắn',PURCHASES:'Lượt mua',CONVERSION:'Đăng ký',TRAFFIC:'Tiếp cận'};
const fields:(keyof Fields)[]=['target','minSpend','minResults','warningMarginPct'];
const blank=():Fields=>({target:'',minSpend:'',minResults:'',warningMarginPct:''});
const initial=():Record<Objective,Fields>=>({MESS:blank(),PURCHASES:blank(),CONVERSION:blank(),TRAFFIC:blank()});
const input='w-full min-w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50';
async function request(body:object){const r=await fetch('/api/meta/evaluation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'Không thể xử lý yêu cầu.');return data;}
export function GlobalRules(){
 const [rows,setRows]=useState(initial),[admin,setAdmin]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;request({action:'rules'}).then(data=>{if(!active)return;const next=initial();for(const objective of objectives){const r=data.rules[objective] as Rule|undefined;if(r)for(const f of fields)next[objective][f]=String(r[f]);}setRows(next);setAdmin(data.admin);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 async function save(){setError('');setNotice('');const rules:Partial<Record<Objective,Rule|null>>={};
  for(const objective of objectives){const row=rows[objective],values=fields.map(f=>row[f].trim());if(values.every(v=>v==='')){rules[objective]=null;continue;}if(values.some(v=>v===''||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1e12)||Number(row.target)<=0||Number(row.warningMarginPct)>100){setError(`${objective}: nhập đầy đủ số hợp lệ; ngưỡng phải lớn hơn 0 và vùng theo dõi từ 0 đến 100%.`);return;}rules[objective]={target:Number(row.target),minSpend:Number(row.minSpend),minResults:Number(row.minResults),warningMarginPct:Number(row.warningMarginPct)};}
  if(!window.confirm('Lưu bảng quy tắc chung cho tất cả tài khoản quảng cáo? Những dòng để trống sẽ không có quy tắc.'))return;
  setBusy(true);try{await request({action:'saveRules',rules});setNotice('Đã lưu quy tắc chung. Các lượt đánh giá sẽ dùng các ngưỡng mới.');}catch(e){setError(e instanceof Error?e.message:'Không thể lưu quy tắc.');}finally{setBusy(false);}
 }
 return <main className="space-y-5"><WorkspaceTabs active="rules"/><header><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Quảng cáo · Thiết lập</p><h1 className="mt-2 text-2xl font-bold">Quy tắc mục tiêu</h1><p className="mt-2 text-sm text-slate-600">Một bảng quy tắc chung cho tất cả tài khoản quảng cáo; mỗi mục tiêu có ngưỡng riêng.</p></header>
 <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"><div><h2 className="font-bold">Thiết lập theo mục tiêu chiến dịch</h2><p className="mt-1 text-sm text-slate-600">Để trống cả dòng nếu chưa muốn đặt quy tắc. Các mục tiêu chưa có quy tắc sẽ không được kết luận. Chỉ quản trị viên được chỉnh sửa.</p></div>
 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-600"><tr><th className="p-3">Mục tiêu</th><th className="p-3">Ngưỡng</th><th className="p-3">Chi tiêu tối thiểu</th><th className="p-3">Kết quả tối thiểu</th><th className="p-3">Vùng theo dõi (%)</th></tr></thead><tbody>{objectives.map(o=><tr key={o} className="border-b border-slate-100"><th className="p-3 whitespace-nowrap"><span className="block text-slate-900">{o}</span><span className="text-xs font-normal text-slate-500">{names[o]}</span></th>{fields.map(f=><td key={f} className="p-2"><input aria-label={`${o} ${f}`} className={input} type="number" min="0" step="any" value={rows[o][f]} disabled={!admin||loading||busy} onChange={e=>setRows(prev=>({...prev,[o]:{...prev[o],[f]:e.target.value}}))}/></td>)}</tr>)}</tbody></table></div>
 <p className="text-xs leading-5 text-slate-500">MESS, PURCHASES, CONVERSION: ngưỡng là chi phí trên kết quả tối đa. TRAFFIC: ngưỡng là số người tiếp cận tối thiểu. Chi phí dùng đơn vị tiền tệ của từng tài khoản; hãy kiểm tra các tài khoản có cùng đơn vị trước khi dùng chung. Vùng theo dõi là phần trăm sai lệch so với ngưỡng.</p>
 {loading&&<p className="text-sm text-slate-500">Đang tải quy tắc…</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="text-sm text-emerald-700">{notice}</p>}{admin&&<button className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={loading||busy} onClick={save}>{busy?'Đang lưu…':'Lưu toàn bộ quy tắc'}</button>}</section></main>;
}
