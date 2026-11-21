"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { AssetsHealthSection } from "@/components/assets/AssetsHealthSection";
import { ApiConnectionsForm } from "@/components/assets/ApiConnectionsForm";
import type { MetaAssetDTO, SettingsDTO } from "@/types/domain";

export default function AssetsAndConnectionsPage() {
  const [activeTab, setActiveTab] = useState<"assets" | "connections">("assets");
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
            Trung tâm Kết nối & Giám sát Tài sản Meta
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý tập trung khóa API (Meta, Drive, Sheets, Telegram, Google Gemini) và theo dõi sức khỏe TKQC, Fanpage, Pixel.
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-slate-200/70 p-1">
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
        </div>
      </div>

      <FeedbackBanner
        message={banner?.text ?? null}
        variant={banner?.type ?? "ok"}
        onClose={() => setBanner(null)}
      />

      {loading ? (
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
