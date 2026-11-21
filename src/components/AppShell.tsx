"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  Package,
  Film,
  Rocket,
  BarChart3,
  Zap,
  Activity,
  Menu,
  X,
  Lock,
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Tổng quan & AI Briefing",
    shortDesc: "Bản tin 07:30 & Pacing",
    icon: LayoutDashboard,
  },
  {
    href: "/assets",
    label: "Tài sản & Kết nối Meta",
    shortDesc: "API, BM, TKQC, Page, Pixel",
    icon: ShieldCheck,
  },
  {
    href: "/products",
    label: "Sản phẩm & KPI Tài chính",
    shortDesc: "CPO, Versioning, Pacing",
    icon: Package,
  },
  {
    href: "/creatives",
    label: "Kho Creative & Post ID",
    shortDesc: "Drive Metadata & Cache",
    icon: Film,
  },
  {
    href: "/launcher",
    label: "Trình Lên Ads (3 Luồng)",
    shortDesc: "Đẩy PAUSED & Auto-Name",
    icon: Rocket,
  },
  {
    href: "/reports",
    label: "Báo cáo & Lợi nhuận thực",
    shortDesc: "3 cấp, Heatmap, Sheets",
    icon: BarChart3,
  },
  {
    href: "/actions",
    label: "Trung tâm Đề xuất",
    shortDesc: "Kill, Scale, Fatigue, Leak",
    icon: Zap,
  },
  {
    href: "/system",
    label: "Telegram & Hệ thống",
    shortDesc: "Cron Jobs & Rate Limit",
    icon: Activity,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth/")) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc]">
      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            AP
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-tight">
              AdsPulse OS
            </div>
            <div className="text-[11px] text-slate-500">Meta Ads & Lợi nhuận thực</div>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Mở menu điều hướng"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-slate-900/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-[256px] shrink-0 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            AP
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-slate-900 tracking-tight truncate">
              AdsPulse OS
            </div>
            <div className="text-[11px] font-medium text-slate-500 truncate">
              Meta Ads Ops & Profit Hub
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 ${
                    active
                      ? "text-blue-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-[13px] leading-tight truncate">
                    {item.label}
                  </div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      active ? "text-blue-600/80 font-normal" : "text-slate-400"
                    }`}
                  >
                    {item.shortDesc}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Safety Footer Badge */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <Link href="/login" className="block text-sm text-blue-700 px-3">Đăng nhập / đổi tài khoản</Link>
          <button className="block text-sm text-slate-600 px-3" onClick={async () => {
            const res = await fetch("/api/auth/logout", { method: "POST" });
            if (res.ok) window.location.assign("/login");
            else window.alert("Không thể đăng xuất. Vui lòng thử lại.");
          }}>Đăng xuất</button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200/70">
            <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <div className="text-[11px] text-emerald-800 leading-snug">
              <span className="font-semibold">Chế độ an toàn:</span> Mọi lệnh lên
              Ads khóa cứng <code className="font-mono font-bold">PAUSED</code>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
