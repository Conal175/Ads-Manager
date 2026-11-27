'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
export function WorkspaceTabs({active}:{active:'meta'|'reports'}) {
 const [admin,setAdmin]=useState(false);
 useEffect(()=>{fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>setAdmin(j?.role==='admin')).catch(()=>setAdmin(false));},[]);
 const style=(selected:boolean)=>`rounded-lg px-4 py-2 text-sm font-semibold ${selected?'bg-indigo-600 text-white':'text-indigo-700 hover:bg-indigo-50'}`;
 return <nav aria-label="Quảng cáo và báo cáo" className="mb-5 flex flex-wrap gap-2 rounded-xl border bg-white p-2"><Link href="/ad-accounts" aria-current={active==='meta'?'page':undefined} className={style(active==='meta')}>Quảng cáo Meta & báo cáo</Link>{admin&&<Link href="/reports" aria-current={active==='reports'?'page':undefined} className={style(active==='reports')}>Báo cáo hiện có</Link>}</nav>;
}
