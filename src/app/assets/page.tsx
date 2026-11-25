"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserRound, LogOut, LogIn } from "lucide-react";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { AssetsHealthSection } from "@/components/assets/AssetsHealthSection";
import { ApiConnectionsForm } from "@/components/assets/ApiConnectionsForm";
import SystemHealthSection from "@/components/system/SystemHealthSection";
import type { MetaAssetDTO, SettingsDTO } from "@/types/domain";

export default function AssetsAndConnectionsPage() {
  const [activeTab, setActiveTab] = useState<"assets" | "connections" | "system" | "account">("assets");
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [assets, setAssets] = useState<MetaAssetDTO[]>([]);
  const [settings, setSettings] = useState<SettingsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const loadAll = useCallback(async () => {
    try {
      const [assetsRes, settingsRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/settings"),
      ]);
      const assetsJson = await assetsRes.json();
      const settingsJson = await settingsRes.json();
      setAssets(assetsJson.assets || []);
      setSettings(settingsJson.settings || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((identity) => {
        if (!active) return;
        const admin = identity?.role === "admin";
        setIsAdmin(admin);
        setRoleName(identity?.role ?? null);
        if (admin && new URLSearchParams(window.location.search).get("tab") === "system") setActiveTab("system");
      }).catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, [loadAll]);

  const handleSyncAssets = async () => {
    setSyncing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/assets", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setAssets(json.assets || []);
        setBanner({ type: "ok", text: json.message });
      } else {
        setBanner({ type: "err", text: json.error || "Đồng bộ thất bại." });
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleMonitor = async (asset: MetaAssetDTO) => {
    const res = await fetch("/api/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: asset.id, isMonitored: !asset.isMonitored }),
    });
    if (res.ok) {
      const json = await res.json();
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? json.asset : a)));
      setBanner({
        type: "ok",
        text: json.asset.isMonitored
          ? `Đã BẬT theo dõi ${asset.name} — Đưa vào danh sách đồng bộ định kỳ.`
          : `Đã TẮT theo dõi ${asset.name} — Tiết kiệm hạn mức API Meta (Rate Limit).`,
      });
    }
  };

  const handleSimulateStatusChange = async (
    asset: MetaAssetDTO,
    nextStatus: number
  ) => {
    const res = await fetch("/api/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: asset.id,
        accountStatus: nextStatus,
        disableReason:
          nextStatus === 1
            ? "NONE"
            : nextStatus === 9
            ? "CARD_DECLINED"
            : "PAYMENT_UNSETTLED",
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? json.asset : a)));
      setBanner({
        type: nextStatus === 1 ? "ok" : "err",
        text:
          nextStatus === 1
            ? `Đã khôi phục trạng thái Đang chạy (account_status = 1) cho ${asset.name}.`
            : `🚨 Cảnh báo đỏ kích hoạt cho ${asset.name} (account_status = ${nextStatus}) và đã đẩy tin khẩn qua Telegram!`,
      });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (res.ok) {
        setSettings(json.settings);
        setBanner({
          type: "ok",
          text: "Đã lưu cấu hình kết nối API tập trung vào PostgreSQL.",
        });
      } else {
        setBanner({ type: "err", text: json.error || "Lưu thất bại." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (
    service: "meta" | "drive" | "sheets" | "telegram" | "ai"
  ) => {
    if (settings) {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    }
    setTestingService(service);
    setBanner(null);
    try {
      const res = await fetch("/api/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });
      const json = await res.json();
      if (res.ok && settings) {
        setSettings({
          ...settings,
          connectionStatuses: json.connectionStatuses,
        });
        setBanner({
          type: json.result?.ok ? "ok" : "err",
          text: json.result?.message || "Đã kiểm tra kết nối.",
        });
      }
    } finally {
      setTestingService(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Cài đặt và kết nối
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý kết nối, giám sát tài sản Meta và theo dõi Telegram & hệ thống.
          </p>
        </div>
        <div className="inline-flex flex-wrap rounded-lg bg-slate-200/70 p-1">
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "assets"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sức khỏe Tài sản ({assets.length})
          </button>
          <button
            onClick={() => setActiveTab("connections")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "connections"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cấu hình API tập trung
          </button>
          <button onClick={() => setActiveTab("account")} className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === "account" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}>Tài khoản</button>
          {isAdmin && <button
            onClick={() => setActiveTab("system")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === "system" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >Telegram & Hệ thống</button>}
        </div>
      </div>

      <FeedbackBanner
        message={banner?.text ?? null}
        variant={banner?.type ?? "ok"}
        onClose={() => setBanner(null)}
      />

      {activeTab === "account" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm max-w-2xl">
          <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><UserRound className="h-6 w-6" /></span><div><h2 className="text-lg font-bold text-slate-900">Tài khoản & phiên đăng nhập</h2><p className="mt-1 text-sm text-slate-500">Quản lý phiên truy cập Ads Manager của bạn.</p></div></div>
          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm"><span className="text-slate-500">Vai trò hiện tại</span><p className="mt-1 font-semibold text-slate-900">{roleName === "admin" ? "Quản trị viên" : roleName === "operator" ? "Nhân viên vận hành" : "Chưa xác định"}</p></div>
          {logoutError && <p role="alert" className="mt-4 text-sm text-red-700">{logoutError}</p>}
          <div className="mt-6 flex flex-wrap gap-3"><button disabled={logoutBusy} onClick={async () => { setLogoutBusy(true); setLogoutError(""); try { const res = await fetch("/api/auth/logout", { method: "POST" }); if (!res.ok) throw new Error(); window.location.assign("/login"); } catch { setLogoutError("Không thể đăng xuất. Vui lòng thử lại."); setLogoutBusy(false); } }} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><LogOut className="h-4 w-4" />{logoutBusy ? "Đang đăng xuất…" : "Đăng xuất"}</button><Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogIn className="h-4 w-4" />Đăng nhập / đổi tài khoản</Link></div>
        </section>
      ) : activeTab === "system" && isAdmin ? (
        <SystemHealthSection />
      ) : loading ? (
        <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
      ) : activeTab === "assets" ? (
        <AssetsHealthSection
          assets={assets}
          syncing={syncing}
          onSyncAssets={handleSyncAssets}
          onToggleMonitor={handleToggleMonitor}
          onSimulateStatusChange={handleSimulateStatusChange}
        />
      ) : (
        settings && (
          <ApiConnectionsForm
            settings={settings}
            saving={saving}
            testingService={testingService}
            onChange={setSettings}
            onSave={handleSaveSettings}
            onTestService={handleTestConnection}
          />
        )
      )}
    </div>
  );
}
