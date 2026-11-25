"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bell,
  Gauge,
  Send,
  Play,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { formatDateTimeVi } from "@/lib/format";

interface SystemSettingsSummary {
  metaRateLimitPct: number;
  metaCpuUsagePct: number;
  metaTimeUsagePct: number;
  throttleMode: boolean;
}

interface SyncLogItem {
  id: number;
  jobName: string;
  status: "success" | "error" | "throttled";
  itemsProcessed: number;
  durationMs: number;
  rateLimitPct: number;
  message: string;
  createdAt: string;
}

interface TelegramAlertItem {
  id: number;
  streamType: "realtime" | "scheduled";
  alertCategory: string;
  title: string;
  body: string;
  deepLinkPath: string;
  dedupKey: string;
  deliveryStatus: string;
  createdAt: string;
}

const JOB_LABELS: Record<string, { name: string; schedule: string }> = {
  meta_insights: { name: "Meta Insights 3 cấp", schedule: "Mỗi 30–60 phút" },
  meta_backfill_3d: { name: "Backfill 3 ngày (Khớp trễ)", schedule: "02:00 sáng hàng ngày" },
  meta_assets: { name: "Đồng bộ Tài sản BM", schedule: "Mỗi 30 phút" },
  google_drive: { name: "Quét Kho Creative Drive", schedule: "Mỗi 60 phút" },
  google_sheets: { name: "Đối soát Google Sheets", schedule: "Mỗi 60 phút" },
  rule_engine: { name: "Quét quy tắc Action Center", schedule: "11:00 / 16:00 / 22:00" },
  ai_briefing: { name: "Bản tin AI Briefing", schedule: "07:30 sáng hàng ngày" },
};

export default function SystemHealthPage() {
  const [settings, setSettings] = useState<SystemSettingsSummary | null>(null);
  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [alerts, setAlerts] = useState<TelegramAlertItem[]>([]);
  const [streamFilter, setStreamFilter] = useState<"all" | "realtime" | "scheduled">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const loadSystem = useCallback(async () => {
    try {
      const res = await fetch("/api/system");
      const json = await res.json();
      setSettings(json.settings || null);
      setLogs(json.logs || []);
      setAlerts(json.alerts || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystem();
  }, [loadSystem]);

  const triggerAction = async (payload: Record<string, unknown>, busyKey: string) => {
    setBusy(busyKey);
    setBanner(null);
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        setBanner(json.message);
        await loadSystem();
      }
    } finally {
      setBusy(null);
    }
  };

  const filteredAlerts = alerts.filter(
    (a) => streamFilter === "all" || a.streamType === streamFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Cảnh báo Telegram 2 Luồng & Giám sát Hệ thống
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Theo dõi tiêu thụ hạn mức API Meta (<code>x-business-use-case-usage</code>), tác vụ nền <code>sync_logs</code> và lịch sử tin báo Telegram.
          </p>
        </div>
        <button
          onClick={() => triggerAction({ action: "test_telegram" }, "test_tg")}
          disabled={busy === "test_tg"}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-60"
        >
          <Send className="w-3.5 h-3.5" />
          {busy === "test_tg" ? "Đang gửi..." : "Gửi tin nhắn thử Telegram"}
        </button>
      </div>

      {banner && (
        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {banner}
          </span>
          <button onClick={() => setBanner(null)} className="text-xs underline">
            Đóng
          </button>
        </div>
      )}

      {/* Meta API Rate Limit Monitor */}
      {settings && (
        <div
          className={`rounded-xl border p-5 shadow-xs space-y-4 ${
            settings.throttleMode
              ? "bg-amber-50/70 border-amber-300"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Gauge
                className={`w-5 h-5 ${
                  settings.throttleMode ? "text-amber-600" : "text-blue-600"
                }`}
              />
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Hạn mức API Meta (Header <code>x-business-use-case-usage</code>)
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      settings.throttleMode
                        ? "bg-amber-200 text-amber-900"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {settings.throttleMode
                      ? "ĐANG GIÃN CHU KỲ (>75%)"
                      : "Chu kỳ chuẩn (30–60 phút)"}
                  </span>
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tự động giãn chu kỳ đồng bộ khi mức tải vượt ngưỡng <strong>75%</strong> nhằm tránh bị Facebook tạm khóa gọi API.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!settings.throttleMode ? (
                <button
                  onClick={() =>
                    triggerAction(
                      { action: "simulate_rate_limit", rateLimitPct: 82 },
                      "sim_high"
                    )
                  }
                  disabled={busy === "sim_high"}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                >
                  Giả lập tải 82% (Test Auto-Throttle)
                </button>
              ) : (
                <button
                  onClick={() =>
                    triggerAction(
                      { action: "simulate_rate_limit", rateLimitPct: 24 },
                      "sim_low"
                    )
                  }
                  disabled={busy === "sim_low"}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Khôi phục mức an toàn (24%)
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
            {[
              { label: "Call Count (%)", value: settings.metaRateLimitPct },
              { label: "Total CPU Time (%)", value: settings.metaCpuUsagePct },
              { label: "Total Time (%)", value: settings.metaTimeUsagePct },
            ].map((m) => (
              <div
                key={m.label}
                className="p-3.5 rounded-lg bg-white border border-slate-200/80 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{m.label}</span>
                  <span
                    className={`font-bold ${
                      m.value >= 75 ? "text-amber-700" : "text-slate-900"
                    }`}
                  >
                    {m.value}% / 100%
                  </span>
                </div>
                <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      m.value >= 75
                        ? "bg-amber-500"
                        : m.value >= 50
                        ? "bg-blue-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${m.value}%` }}
                  />
                  {/* 75% auto-throttle threshold marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                    style={{ left: "75%" }}
                    title="Ngưỡng tự động giãn chu kỳ: 75%"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Cron Job Triggers */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Bảng điều khiển Tác vụ nền (Cron Jobs)
          </h2>
          <span className="text-xs text-slate-500">
            Bấm chạy tay bất kỳ tác vụ nào để ghi log tức thời
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            "meta_insights",
            "meta_backfill_3d",
            "google_drive",
            "google_sheets",
            "rule_engine",
          ].map((jobKey) => {
            const info = JOB_LABELS[jobKey];
            return (
              <div
                key={jobKey}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{info.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{info.schedule}</div>
                </div>
                <button
                  onClick={() =>
                    triggerAction({ action: "run_job", jobName: jobKey }, jobKey)
                  }
                  disabled={busy === jobKey}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 disabled:opacity-60"
                >
                  <Play className="w-3 h-3" />
                  {busy === jobKey ? "Đang chạy..." : "Chạy ngay"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column Layout: Telegram 2-Stream Alerts + Sync Logs Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Telegram 2-Stream Alerts */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                Cảnh báo Telegram (2 Luồng)
              </h2>
              <p className="text-[11px] text-slate-500">
                Khẩn cấp (Chống spam) & Định kỳ (07:30, 11:05, 16:05, 22:30)
              </p>
            </div>
            <select
              value={streamFilter}
              onChange={(e) =>
                setStreamFilter(e.target.value as "all" | "realtime" | "scheduled")
              }
              className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white"
            >
              <option value="all">Tất cả</option>
              <option value="realtime">Khẩn cấp</option>
              <option value="scheduled">Định kỳ</option>
            </select>
          </div>

          <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="h-40 animate-pulse bg-slate-100 rounded-lg" />
            ) : (
              filteredAlerts.map((al) => (
                <div
                  key={al.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    al.streamType === "realtime"
                      ? "bg-red-50/40 border-red-200"
                      : "bg-slate-50/70 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        al.streamType === "realtime"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {al.streamType === "realtime" ? "Luồng khẩn cấp" : "Luồng định kỳ"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDateTimeVi(al.createdAt)}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900">{al.title}</div>
                  <p className="text-slate-600 leading-relaxed">{al.body}</p>
                  <div className="pt-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-400 truncate max-w-[180px]">
                      {al.dedupKey ? `dedup: ${al.dedupKey}` : al.deliveryStatus}
                    </span>
                    <Link
                      href={al.deepLinkPath || "/"}
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                    >
                      Mở màn hình xử lý ({al.deepLinkPath})
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sync Logs Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Nhật ký Tác vụ nền (<code>sync_logs</code>)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi trạng thái gần nhất của Meta Insights, Backfill 02:00, Google Drive, Google Sheets và Rule Engine.
            </p>
          </div>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500 sticky top-0">
                  <th className="py-2.5 px-4">Thời gian</th>
                  <th className="py-2.5 px-3">Tác vụ</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Thời lượng / Tải</th>
                  <th className="py-2.5 px-4">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTimeVi(log.createdAt)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {JOB_LABELS[log.jobName]?.name || log.jobName}
                    </td>
                    <td className="py-3 px-3">
                      {log.status === "success" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Thành công
                        </span>
                      ) : log.status === "throttled" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Giãn chu kỳ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold">
                          <ShieldAlert className="w-3 h-3" />
                          Lỗi
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap text-slate-600">
                      {log.durationMs}ms • API {log.rateLimitPct}%
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
