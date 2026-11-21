"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Zap, Sliders, RefreshCw } from "lucide-react";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { ModalShell } from "@/components/ui/ModalShell";
import { RuleThresholdsForm } from "@/components/actions/RuleThresholdsForm";
import {
  ACTION_CATEGORY_META,
  RecommendationCard,
} from "@/components/actions/RecommendationCard";
import type { ActionRecommendationDTO, RuleConfig } from "@/types/domain";

export default function ActionCenterPage() {
  const [recs, setRecs] = useState<ActionRecommendationDTO[]>([]);
  const [ruleConfig, setRuleConfig] = useState<RuleConfig | null>(null);
  const [viewMode, setViewMode] = useState<"open" | "history">("open");
  const [filterCat, setFilterCat] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showRulesPanel, setShowRulesPanel] = useState(false);
  const [dismissTarget, setDismissTarget] =
    useState<ActionRecommendationDTO | null>(null);
  const [dismissNote, setDismissNote] = useState("");
  const [banner, setBanner] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    try {
      const res = await fetch("/api/actions");
      const json = await res.json();
      setRecs(json.recommendations || []);
      setRuleConfig(json.ruleConfig || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const handleRunScan = async () => {
    setScanning(true);
    setBanner(null);
    try {
      const res = await fetch("/api/actions", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setRecs(json.recommendations || []);
        setBanner(json.message);
      }
    } finally {
      setScanning(false);
    }
  };

  const handleDecision = async (
    id: number,
    decision: "resolved" | "dismissed" | "open",
    note = ""
  ) => {
    const res = await fetch("/api/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision, note }),
    });
    const json = await res.json();
    if (res.ok) {
      setRecs((prev) =>
        prev.map((r) => (r.id === id ? json.recommendation : r))
      );
      setDismissTarget(null);
      setDismissNote("");
      setBanner(json.message);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleConfig) return;
    const res = await fetch("/api/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_rules",
        ruleConfigJson: ruleConfig,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setShowRulesPanel(false);
      setBanner(json.message);
    }
  };

  const openRecs = recs.filter((r) => r.status === "open");
  const historyRecs = recs.filter((r) => r.status !== "open");
  const visibleList = (viewMode === "open" ? openRecs : historyRecs).filter(
    (r) => filterCat === "ALL" || r.category === filterCat
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Trung tâm Đề xuất Hành động (Action Center)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bộ máy quét quy tắc định kỳ (11h00, 16h00, 22h00) kèm bộ lọc chống nhiễu mẫu nhỏ và cơ chế tạm ẩn 24h (Cooldown).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowRulesPanel(!showRulesPanel)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Sliders className="w-3.5 h-3.5" />
            Tùy chỉnh ngưỡng quy tắc
          </button>
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`}
            />
            {scanning ? "Đang quét PostgreSQL..." : "Chạy quét quy tắc ngay"}
          </button>
        </div>
      </div>

      <FeedbackBanner message={banner} onClose={() => setBanner(null)} />

      {showRulesPanel && ruleConfig && (
        <RuleThresholdsForm
          ruleConfig={ruleConfig}
          onChange={setRuleConfig}
          onSubmit={handleSaveRules}
          onClose={() => setShowRulesPanel(false)}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["kill", "scale", "fatigue", "leakage"] as const).map((cat) => {
          const meta = ACTION_CATEGORY_META[cat];
          const Icon = meta.icon;
          const count = openRecs.filter((r) => r.category === cat).length;
          const active = filterCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(active ? "ALL" : cat)}
              className={`p-4 rounded-xl border text-left transition-all bg-white ${
                active
                  ? "ring-2 ring-blue-500 border-blue-400"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  {meta.label}
                </span>
                <Icon className={`w-4 h-4 ${meta.iconColor}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
                {count}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {active ? "Đang lọc nhóm này" : "Nhấn để lọc"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-slate-200/70 p-1 text-xs">
          <button
            onClick={() => setViewMode("open")}
            className={`px-3.5 py-1.5 rounded-md font-semibold ${
              viewMode === "open"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600"
            }`}
          >
            Đang chờ duyệt ({openRecs.length})
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`px-3.5 py-1.5 rounded-md font-semibold ${
              viewMode === "history"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600"
            }`}
          >
            Lịch sử xử lý / Tạm ẩn 24h ({historyRecs.length})
          </button>
        </div>
        {filterCat !== "ALL" && (
          <button
            onClick={() => setFilterCat("ALL")}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Hiện tất cả 4 nhóm
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 bg-white rounded-xl border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : visibleList.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">
            Không có thẻ đề xuất nào trong danh mục này.
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bạn có thể bấm &ldquo;Chạy quét quy tắc ngay&rdquo; để bộ máy kiểm tra dữ liệu mới nhất.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleList.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onResolve={(id) =>
                handleDecision(
                  id,
                  "resolved",
                  "Đã thực hiện thao tác trên Meta Ads Manager"
                )
              }
              onOpenDismiss={setDismissTarget}
              onReopen={(id) => handleDecision(id, "open")}
            />
          ))}
        </div>
      )}

      <ModalShell
        open={Boolean(dismissTarget)}
        onClose={() => setDismissTarget(null)}
        maxWidthClass="max-w-md"
        title="Bỏ qua & Tạm ẩn 24h (Cooldown)"
      >
        {dismissTarget && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              <strong>{dismissTarget.title}</strong>
              <p className="mt-1 text-slate-500">
                Hệ thống sẽ lưu ảnh chụp chỉ số hiện tại và tạm ẩn cảnh báo này trong 24 giờ để các phiên quét 11h00 / 16h00 / 22h00 không báo lặp lại.
              </p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ghi chú lý do bỏ qua
              </label>
              <input
                value={dismissNote}
                onChange={(e) => setDismissNote(e.target.value)}
                placeholder="Ví dụ: Đang giữ nhóm chạy đến hết tối để đủ dữ liệu..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDismissTarget(null)}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={() =>
                  handleDecision(
                    dismissTarget.id,
                    "dismissed",
                    dismissNote || "Chủ động bỏ qua — Tạm ẩn 24h"
                  )
                }
                className="px-4 py-2 rounded-lg font-semibold bg-slate-900 text-white hover:bg-slate-800"
              >
                Xác nhận Tạm ẩn 24h
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
}
