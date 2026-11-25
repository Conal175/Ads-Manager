"use client";
import type { ReportRow } from "@/lib/meta-csv-report";
import { summarizeMeta } from "@/lib/meta-csv-report";

type Entry = { label:string; spend:number; messages:number; purchases:number };
const number = (n:number) => new Intl.NumberFormat("vi-VN",{maximumFractionDigits:2}).format(n);
function Chart({ title, entries, metric, suffix }: {title:string;entries:Entry[];metric:"spend"|"messages";suffix:string}) {
  const sorted=[...entries].filter(x=>x[metric]>0).sort((a,b)=>b[metric]-a[metric]).slice(0,10);
  const max=sorted[0]?.[metric]??0;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">Tối đa 10 mục có giá trị cao nhất; theo bộ lọc hiện tại.</p>{sorted.length ? <div className="mt-4 space-y-3">{sorted.map((x,i)=><div key={`${x.label}-${i}`}><div className="flex justify-between gap-3 text-xs"><span className="min-w-0 break-all text-slate-700">{x.label}</span><span className="shrink-0 font-semibold text-slate-900">{number(x[metric])}{suffix}</span></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${metric==='spend'?'bg-indigo-500':'bg-emerald-500'}`} style={{width:`${x[metric]/max*100}%`}} /></div></div>)}</div>:<p className="mt-4 text-sm text-slate-500">Không có dữ liệu.</p>}</section>;
}
export function ImportCharts({ rows }: {rows:ReportRow[]}) {
  const ads=summarizeMeta(rows), media=new Map<string,Entry>(), campaigns=new Map<string,Entry>(), ages=new Map<string,Entry>(), genders=new Map<string,Entry>();
  const add=(map:Map<string,Entry>,key:string,label:string,r:{spend:number;messages:number;purchases:number})=>{let e=map.get(key);if(!e){e={label,spend:0,messages:0,purchases:0};map.set(key,e);}e.spend+=r.spend;e.messages+=r.messages;e.purchases+=r.purchases;};
  for(const ad of ads) if(ad.mediaCode) add(media,ad.mediaCode,ad.mediaCode,ad);
  for(const r of rows){add(campaigns,JSON.stringify([r.accountId||r.account,r.campaignId||r.campaign]),`${r.account} · ${r.campaign}`,r);add(ages,r.age||'Không xác định',r.age||'Không xác định',r);add(genders,r.gender||'Không xác định',r.gender||'Không xác định',r);}
  return <><div><h2 className="text-lg font-bold text-slate-900">Phân tích chi tiết</h2><p className="text-sm text-slate-500">Biểu đồ media chỉ gồm tên đúng mẫu sản phẩm_Mã media_định dạng; chưa đối chiếu danh mục media.</p></div><div className="grid gap-4 xl:grid-cols-2"><Chart title="Chi tiêu theo media" entries={[...media.values()]} metric="spend" suffix=" ₫"/><Chart title="Tin nhắn theo media" entries={[...media.values()]} metric="messages" suffix=""/><Chart title="Chi tiêu theo campaign" entries={[...campaigns.values()]} metric="spend" suffix=" ₫"/><Chart title="Chi tiêu theo độ tuổi" entries={[...ages.values()]} metric="spend" suffix=" ₫"/><Chart title="Tin nhắn theo độ tuổi" entries={[...ages.values()]} metric="messages" suffix=""/><Chart title="Chi tiêu theo giới tính" entries={[...genders.values()]} metric="spend" suffix=" ₫"/></div></>;
}
