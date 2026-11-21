"use client";

import React from "react";
import Link from "next/link";
import {
  Flame,
  TrendingUp,
  AlertOctagon,
  Filter,
  CheckCircle2,
  Clock,
  Rocket,
  Film,
} from "lucide-react";
import { formatCompactVnd, formatDateTimeVi, formatVnd } from "@/lib/format";
import type { ActionRecommendationDTO } from "@/types/domain";

export const ACTION_CATEGORY_META = {
  kill: {
    label: "Cắt lỗ (Kill)",
    border: "border-l-4 border-l-red-500 border-red-200",
    badge: "bg-red-100 text-red-800",
    icon: AlertOctagon,
    iconColor: "text-red-600",
  },
  scale: {
    label: "Mở rộng (Scale)",
    border: "border-l-4 border-l-emerald-500 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    icon: TrendingUp,
    iconColor: "text-emerald-600",
  },
  fatigue: {
    label: "Thay máu Creative",
    border: "border-l-4 border-l-amber-500 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    icon: Flame,
    iconColor: "text-amber-600",
  },
  leakage: {
    label: "Chặn rò rỉ ngân sách",
    border: "border-l-4 border-l-purple-500 border-purple-200",
    badge: "bg-purple-100 text-purple-800",
    icon: Filter,
    iconColor: "text-purple-600",
  },
} as const;

export function RecommendationCard({
  rec,
  onResolve,
  onOpenDismiss,
  onReopen,
}: {
  rec: ActionRecommendationDTO;
  onResolve: (id: number) => void;
  onOpenDismiss: (rec: ActionRecommendationDTO) => void;
  onReopen: (id: number) => void;
}) {
  const meta = ACTION_CATEGORY_META[rec.category] ?? ACTION_CATEGORY_META.kill;
  const Icon = meta.icon;

  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-xs space-y-3 ${meta.border}`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${meta.badge}`}
            >
              <Icon className="w-3 h-3" />
              {meta.label}
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {rec.productCode}
            </span>
            {rec.adAccountMetaId && (
              <span className="font-mono text-[11px] text-slate-500">
                {rec.adAccountMetaId}
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {formatDateTimeVi(rec.createdAt)}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900">{rec.title}</h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            {rec.description}
          </p>
        </div>

        {rec.wastedSpend > 0 && (
          <div className="shrink-0 px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-right tabular-nums">
            <div className="text-[10px] font-semibold uppercase text-red-700">
              Tiền đang lãng phí / rò rỉ
            </div>
            <div className="text-base font-bold text-red-700">
              {formatVnd(rec.wastedSpend)}
            </div>
          </div>
        )}
      </div>

      {rec.suggestedActionJson?.suggestedCreatives &&
        rec.suggestedActionJson.suggestedCreatives.length > 0 && (
          <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200/80 space-y-2">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-amber-700" />
              Gợi ý tự động từ bảng creatives (Video cùng SP đang ở trạng thái Chờ test):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rec.suggestedActionJson.suggestedCreatives.map((sc, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-white border border-amber-100 text-xs"
                >
                  <div className="font-mono font-bold text-slate-900">
                    {sc.creativeCode}
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    {sc.hookAngle || sc.fileName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {rec.suggestedActionJson?.launcherUrl && (
            <Link
              href={rec.suggestedActionJson.launcherUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              <Rocket className="w-3.5 h-3.5" />
              {rec.category === "scale"
                ? "Mở Trình Lên Ads (Luồng 2 - Post ID)"
                : rec.category === "fatigue"
                ? "Lên Video mới (Luồng 1)"
                : "Mở Mẫu Target để loại trừ"}
            </Link>
          )}
          {rec.suggestedActionJson?.recommendedNewBudget && (
            <span className="text-xs text-emerald-700 font-semibold tabular-nums">
              Gợi ý tăng +{rec.suggestedActionJson.recommendedBudgetIncreasePct}% →{" "}
              {formatCompactVnd(rec.suggestedActionJson.recommendedNewBudget)}/ngày
            </span>
          )}
        </div>

        {rec.status === "open" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenDismiss(rec)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <Clock className="w-3.5 h-3.5" />
              Bỏ qua (Tạm ẩn 24h)
            </button>
            <button
              onClick={() => onResolve(rec.id)}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã xử lý
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span
              className={`font-semibold px-2 py-0.5 rounded-full ${
                rec.status === "resolved"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {rec.status === "resolved"
                ? "Đã xử lý"
                : "Đã bỏ qua (Cooldown 24h)"}
            </span>
            {rec.decisionNote && <span>Lý do: &ldquo;{rec.decisionNote}&rdquo;</span>}
            {rec.cooldownUntil && (
              <span>Tạm ẩn đến: {formatDateTimeVi(rec.cooldownUntil)}</span>
            )}
            <button
              onClick={() => onReopen(rec.id)}
              className="text-blue-600 font-semibold hover:underline"
            >
              Mở lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
