import Link from 'next/link';
export function CreativeWorkspaceTabs({active}:{active:'library'|'sheet'}) {
 const style=(selected:boolean)=>`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${selected?'bg-teal-700 text-white shadow-sm':'text-slate-600 hover:bg-teal-50 hover:text-teal-800'}`;
 return <nav aria-label="Kho nội dung" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5"><Link href="/creatives" aria-current={active==='library'?'page':undefined} className={style(active==='library')}>Kho media & nhập Drive</Link><Link href="/creatives/sheet-preview" aria-current={active==='sheet'?'page':undefined} className={style(active==='sheet')}>Đối chiếu & đồng bộ Sheet</Link></nav>;
}
