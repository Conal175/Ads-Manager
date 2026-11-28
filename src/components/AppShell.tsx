"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canViewPage, type AppRole } from "@/lib/auth/policy";
import { LayoutDashboard, Settings2, Package, Film, Rocket, BarChart3, Zap, Menu, X, ArrowUpRight, Layers3, PanelsTopLeft } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", shortDesc: "Dashboard & briefing", icon: LayoutDashboard },
  { href: "/products", label: "Sản phẩm & KPI", shortDesc: "Theo dõi hiệu quả", icon: Package },
  { href: "/creatives", label: "Kho nội dung", shortDesc: "Media & Post ID", icon: Film },
  { href: "/ad-accounts", label: "Quảng cáo & báo cáo", shortDesc: "Meta & hiệu quả", icon: BarChart3 },
  { href: "/pages", label: "Quản lý Trang", shortDesc: "Fanpage & bài viết", icon: PanelsTopLeft },
  { href: "/actions", label: "Đề xuất", shortDesc: "Các cơ hội cần xem", icon: Zap },
  { href: "/launcher", label: "Lên quảng cáo", shortDesc: "Bản nháp & thiết lập", icon: Rocket },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" }).then(res => res.ok ? res.json() : null).then(data => { if (active) setRole(data?.role ?? null); }).catch(() => { if (active) setRole(null); });
    return () => { active = false; };
  }, [pathname]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  if (pathname === "/login" || pathname === "/register" || pathname === "/no-access" || pathname.startsWith("/auth/")) return <>{children}</>;
  const current = NAV_ITEMS.find(item => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
  const section = pathname.startsWith('/reports') ? 'Quảng cáo & báo cáo' : current?.label ?? (pathname.startsWith('/assets') || pathname.startsWith('/system') || pathname.startsWith('/users') ? 'Cài đặt & kết nối' : 'Không gian làm việc');

  const adArea = pathname.startsWith('/ad-accounts') || pathname.startsWith('/reports');


  return <div className="min-h-screen flex flex-col lg:flex-row bg-[#f3f7f7]">
    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-16 bg-white/95 backdrop-blur border-b border-slate-200">
      <Link href="/" className="flex items-center gap-2.5"><span className="brand-mark"><Layers3 size={19}/></span><span><span className="block text-sm font-bold tracking-tight text-slate-900">Ads Manager</span><span className="block text-[10px] font-medium text-slate-500">KHÔNG GIAN ĐIỀU HÀNH</span></span></Link>
      <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="rounded-xl p-2.5 text-slate-700 hover:bg-slate-100" aria-expanded={mobileOpen} aria-controls="app-navigation" aria-label={mobileOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}>{mobileOpen ? <X size={20}/> : <Menu size={20}/>}</button>
    </header>
    {mobileOpen && <button type="button" aria-label="Đóng menu điều hướng" className="lg:hidden fixed inset-0 z-30 bg-slate-950/50" onClick={() => setMobileOpen(false)}/>}
    <aside id="app-navigation" className={`app-sidebar fixed lg:sticky top-0 left-0 z-40 h-screen w-[264px] shrink-0 flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="flex h-[88px] items-center gap-3 px-6"><span className="brand-mark"><Layers3 size={20}/></span><span><span className="block text-[16px] font-bold tracking-tight text-slate-900">Ads Manager<span className="text-teal-600">.</span></span><span className="mt-0.5 block text-[10px] font-semibold tracking-[.16em] text-slate-500">KHÔNG GIAN ĐIỀU HÀNH</span></span></div>
      <div className="px-6 pt-4 pb-2 text-[10px] font-bold tracking-[.16em] text-slate-500">KHÔNG GIAN LÀM VIỆC</div>
      <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {NAV_ITEMS.filter(item => canViewPage(role, item.href)).map(item => { const Icon=item.icon; const active=item.href === '/' ? pathname === '/' : item.href === '/ad-accounts' ? adArea : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} aria-current={active?'page':undefined} onClick={()=>setMobileOpen(false)} className={`nav-entry ${active?'nav-entry-active':''}`}><span className="nav-icon"><Icon size={18}/></span><span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold leading-tight">{item.label}</span><span className="mt-1 block text-[11px] leading-tight text-slate-500">{item.shortDesc}</span></span>{active&&<span className="h-1.5 w-1.5 rounded-full bg-teal-500"/>}</Link>; })}
      </nav>

      <div className="border-t border-slate-200 p-3">{canViewPage(role, '/assets')&&<Link href="/assets" onClick={()=>setMobileOpen(false)} className={`nav-entry ${pathname.startsWith('/assets')||pathname.startsWith('/system')||pathname.startsWith('/users')?'nav-entry-active':''}`}><span className="nav-icon"><Settings2 size={18}/></span><span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">Cài đặt & kết nối</span><span className="mt-1 block text-[11px] text-slate-500">Tài khoản & hệ thống</span></span><ArrowUpRight size={15} className="text-slate-500"/></Link>}</div>
    </aside>
    <main className="app-content flex-1 min-w-0"><div className="workspace-bar hidden lg:flex"><div className="flex items-center gap-2"><span className="text-slate-400">Không gian làm việc</span><span className="text-slate-300">/</span><span className="font-semibold text-slate-700">{section}</span></div><span className="workspace-tag"><span className="h-1.5 w-1.5 rounded-full bg-teal-500"/> ADS MANAGER</span></div><div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-9 py-7 lg:py-9">{children}</div></main>
  </div>;
}
