'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
export function WorkspaceTabs({active}:{active:'meta'|'reports'|'evaluation'|'rules'}) {
 const [admin,setAdmin]=useState(false);
 useEffect(()=>{fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>setAdmin(j?.role==='admin')).catch(()=>setAdmin(false));},[]);
 const style=(selected:boolean)=>`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${selected?'bg-teal-700 text-white shadow-sm':'text-slate-600 hover:bg-teal-50 hover:text-teal-800'}`;
 return <nav aria-label="Quảng cáo và báo cáo" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5"><Link href="/ad-accounts" aria-current={active==='meta'?'page':undefined} className={style(active==='meta')}>Quản lý quảng cáo</Link><Link href="/ad-accounts/evaluation" aria-current={active==='evaluation'?'page':undefined} className={style(active==='evaluation')}>Đánh giá</Link><Link href="/ad-accounts/rules" aria-current={active==='rules'?'page':undefined} className={style(active==='rules')}>Quy tắc mục tiêu</Link>{admin&&<Link href="/reports" aria-current={active==='reports'?'page':undefined} className={style(active==='reports')}>Báo cáo hiện có</Link>}</nav>;
}
