"use client";

import React from "react";
import { History, SlidersHorizontal, TrendingUp } from "lucide-react";
import { formatCompactVnd, formatVnd } from "@/lib/format";
import type { ProductWithKpiDTO } from "@/types/domain";

interface ProductKpiCardProps {
  prod: ProductWithKpiDTO;
  onOpenHistory: (prod: ProductWithKpiDTO) => void;
  onOpenBudget: (prod: ProductWithKpiDTO) => void;
  onOpenNewVersion: (prod: ProductWithKpiDTO) => void;
}

export function ProductKpiCard({
  prod,
  onOpenHistory,
  onOpenBudget,
  onOpenNewVersion,
}: ProductKpiCardProps) {
  const kpi = prod.currentKpi;
  const pacingBadge =
    prod.pacing.status === "overspending"
      ? "bg-red-50 text-red-700 border-red-200"
      : prod.pacing.status === "slow"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";
  const spendPct =
    prod.dailyBudgetTarget > 0
      ? Math.min(
          100,
          Math.round((prod.pacing.actualSpend / prod.dailyBudgetTarget) * 100)
        )
      : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold text-sm flex items-center justify-center">
            {prod.code}
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2">
              {prod.name}
              {kpi && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  KPI v{kpi.versionNumber} (hiệu lực từ {kpi.effectiveFrom})
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">{prod.category}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenHistory(prod)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử KPI ({prod.kpiVersions.length} bản)
          </button>
          <button
            onClick={() => onOpenBudget(prod)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Định mức ngân sách
          </button>
          <button
            onClick={() => onOpenNewVersion(prod)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Cập nhật KPI (Tạo v{(kpi?.versionNumber ?? 0) + 1})
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {kpi && (
          <div className="lg:col-span-4 space-y-2 text-xs">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
              Hồ sơ Kinh tế đơn vị (v{kpi.versionNumber})
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 tabular-nums">
              <span className="text-slate-500">Giá bán trung bình:</span>
              <span className="font-semibold text-right text-slate-900">
                {formatVnd(kpi.avgSellingPrice)}
              </span>
              <span className="text-slate-500">Giá vốn (COGS):</span>
              <span className="font-medium text-right text-slate-800">
                {formatVnd(kpi.cogs)}
              </span>
              <span className="text-slate-500">Ship + Đóng gói:</span>
              <span className="font-medium text-right text-slate-800">
                {formatVnd(kpi.shippingPackingFee)}
              </span>
              <span className="text-slate-500">Chi phí khác:</span>
              <span className="font-medium text-right text-slate-800">
                {formatVnd(kpi.otherCost)}
              </span>
              <span className="text-slate-500">Tỷ lệ hoàn dự kiến:</span>
              <span className="font-medium text-right text-amber-700">
                {kpi.expectedReturnRatePct}%
              </span>
              <span className="text-slate-500">Biên LN ròng mong muốn:</span>
              <span className="font-semibold text-right text-emerald-700">
                {kpi.targetNetMarginPct}%
              </span>
              <span className="text-slate-500">Tỷ lệ chốt tin mục tiêu:</span>
              <span className="font-semibold text-right text-blue-700">
                {kpi.targetCloseRatePct}%
              </span>
            </div>
          </div>
        )}

        {kpi && (
          <div className="lg:col-span-4 grid grid-cols-1 gap-2.5">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase">
                  CPO hòa vốn (Khóa)
                </div>
                <div className="text-[11px] text-slate-400">Ngưỡng tối đa không lỗ</div>
              </div>
              <div className="text-lg font-bold text-slate-900 tabular-nums">
                {formatVnd(kpi.breakevenCpo)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-blue-700 uppercase">
                  CPO mục tiêu (Khóa)
                </div>
                <div className="text-[11px] text-blue-600/80">
                  Đạt biên LN {kpi.targetNetMarginPct}%
                </div>
              </div>
              <div className="text-lg font-bold text-blue-800 tabular-nums">
                {formatVnd(kpi.targetCpo)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-emerald-700 uppercase">
                  Giá tin nhắn trần (Khóa)
                </div>
                <div className="text-[11px] text-emerald-600/80">
                  Với tỷ lệ chốt {kpi.targetCloseRatePct}%
                </div>
              </div>
              <div className="text-lg font-bold text-emerald-800 tabular-nums">
                {formatVnd(kpi.ceilingMessageCost)}
              </div>
            </div>
          </div>
        )}

        <div className="lg:col-span-4 rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-800">
                Định mức ngân sách (Pacing)
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${pacingBadge}`}
              >
                {prod.pacing.label} ({prod.pacing.pacingRatioPct}%)
              </span>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden my-2">
              <div
                className={`h-full rounded-full ${
                  prod.pacing.status === "overspending"
                    ? "bg-red-500"
                    : prod.pacing.status === "slow"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${spendPct}%` }}
              />
            </div>
            <div className="text-xs text-slate-600 tabular-nums flex justify-between">
              <span>
                Đã đốt hôm nay:{" "}
                <strong>{formatCompactVnd(prod.pacing.actualSpend)}</strong>
              </span>
              <span>
                Chuẩn {prod.pacing.hourOfDay}h:{" "}
                <strong>{formatCompactVnd(prod.pacing.expectedSpendToNow)}</strong>
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-center tabular-nums">
            <div className="bg-white rounded-lg p-2 border border-slate-200/70">
              <div className="text-[10px] text-slate-500 uppercase">Ngày</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {formatCompactVnd(prod.dailyBudgetTarget)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 border border-slate-200/70">
              <div className="text-[10px] text-slate-500 uppercase">Tuần</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {formatCompactVnd(prod.weeklyBudgetTarget)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 border border-slate-200/70">
              <div className="text-[10px] text-slate-500 uppercase">Tháng</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {formatCompactVnd(prod.monthlyBudgetTarget)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
