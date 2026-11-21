"use client";

import React from "react";
import { formatCompactVnd, formatVnd } from "@/lib/format";
import type { BreakdownItem } from "@/types/domain";

export type HeatmapDimension = "hour" | "age_gender" | "platform" | "region";

export function BreakdownsHeatmapSection({
  breakdowns,
  heatmapDim,
  onChangeDim,
}: {
  breakdowns: BreakdownItem[];
  heatmapDim: HeatmapDimension;
  onChangeDim: (dim: HeatmapDimension) => void;
}) {
  const dimItemsMap = new Map<
    string,
    { dimensionValue: string; spend: number; impressions: number; messages: number }
  >();

  for (const b of breakdowns) {
    if (b.dimensionType !== heatmapDim) continue;
    const cur = dimItemsMap.get(b.dimensionValue) ?? {
      dimensionValue: b.dimensionValue,
      spend: 0,
      impressions: 0,
      messages: 0,
    };
    cur.spend += b.spend;
    cur.impressions += b.impressions;
    cur.messages += b.messages;
    dimItemsMap.set(b.dimensionValue, cur);
  }

  const heatmapItems = [...dimItemsMap.values()];
  const heatmapTotalSpend = heatmapItems.reduce((s, i) => s + i.spend, 0);
  const heatmapTotalMsgs = heatmapItems.reduce((s, i) => s + i.messages, 0);
  const heatmapAvgCost =
    heatmapTotalMsgs > 0 ? heatmapTotalSpend / heatmapTotalMsgs : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Biểu đồ nhiệt (Heatmap) phân bổ Chi tiêu & Giá tin nhắn
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phát hiện vùng rò rỉ ngân sách (ô màu đỏ có giá tin nhắn ≥ 1,5x mức trung bình{" "}
            <strong className="text-slate-800">
              {formatVnd(heatmapAvgCost)}
            </strong>
            ).
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs">
          {[
            { id: "hour" as const, label: "Khung giờ" },
            { id: "age_gender" as const, label: "Độ tuổi & Giới tính" },
            { id: "platform" as const, label: "Nền tảng / Vị trí" },
            { id: "region" as const, label: "Khu vực" },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => onChangeDim(d.id)}
              className={`px-3 py-1.5 rounded-md font-semibold ${
                heatmapDim === d.id
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {heatmapItems.map((item) => {
          const sharePct =
            heatmapTotalSpend > 0
              ? Number(((item.spend / heatmapTotalSpend) * 100).toFixed(1))
              : 0;
          const costPerMsg =
            item.messages > 0
              ? Math.round(item.spend / item.messages)
              : item.spend;
          const ratio = heatmapAvgCost > 0 ? costPerMsg / heatmapAvgCost : 1;

          const heatClass =
            ratio >= 1.5
              ? "bg-red-50 border-red-300 text-red-950"
              : ratio >= 1.15
              ? "bg-amber-50 border-amber-300 text-amber-950"
              : "bg-emerald-50 border-emerald-300 text-emerald-950";
          const barColor =
            ratio >= 1.5
              ? "bg-red-500"
              : ratio >= 1.15
              ? "bg-amber-500"
              : "bg-emerald-500";

          return (
            <div
              key={item.dimensionValue}
              className={`p-4 rounded-xl border-2 transition-all ${heatClass}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{item.dimensionValue}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 tabular-nums">
                  {ratio.toFixed(2)}x TB
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between tabular-nums">
                <div>
                  <div className="text-[11px] opacity-75">Giá / Tin nhắn</div>
                  <div className="text-xl font-bold">{formatVnd(costPerMsg)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] opacity-75">Tỷ trọng chi tiêu</div>
                  <div className="text-sm font-bold">{sharePct}%</div>
                </div>
              </div>

              <div className="h-2 bg-white/70 rounded-full overflow-hidden my-2.5">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.min(100, sharePct * 2)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs opacity-85 tabular-nums">
                <span>Chi tiêu: {formatCompactVnd(item.spend)}</span>
                <span>{item.messages} tin nhắn</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
