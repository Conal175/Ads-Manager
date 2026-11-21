"use client";

import React from "react";
import { formatVnd, LIFECYCLE_LABELS } from "@/lib/format";
import type { CreativeLeaderboardRow } from "@/types/domain";

export function CreativeLeaderboardSection({
  rows,
}: {
  rows: CreativeLeaderboardRow[];
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900">
          Bảng xếp hạng hiệu suất Creative xuyên tài khoản & xuyên Post ID
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Cộng dồn số liệu bằng cách liên kết{" "}
          <code>effective_object_story_id → meta_posts → creative_id</code> (có bộ phân tích chuỗi Auto-Naming làm lớp dự phòng).
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
              <th className="py-3 px-4">Mã Creative & Hook</th>
              <th className="py-3 px-3">Trạng thái</th>
              <th className="py-3 px-3 text-center">Xuyên TK / Post</th>
              <th className="py-3 px-3 text-right">Tổng Chi tiêu</th>
              <th className="py-3 px-3 text-right">Hook Rate (3s/Imp)</th>
              <th className="py-3 px-3 text-right">Hold Rate (Thru/3s)</th>
              <th className="py-3 px-3 text-right">CTR</th>
              <th className="py-3 px-3 text-right">Tần suất</th>
              <th className="py-3 px-3 text-right">Tin nhắn</th>
              <th className="py-3 px-3 text-right">Giá / Tin nhắn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {rows.map((row) => {
              const badge =
                LIFECYCLE_LABELS[row.lifecycleStatus] ??
                LIFECYCLE_LABELS.dang_chay;
              return (
                <tr key={row.creativeCode} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-slate-900">
                      {row.creativeCode}{" "}
                      <span className="font-sans text-[11px] font-normal text-slate-500">
                        ({row.productCode})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 max-w-xs truncate">
                      {row.hookAngle || row.fileName}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.badgeClass}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                      {row.accountsCount} TK • {row.postIdsCount} Post
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                    {formatVnd(row.metrics.spend)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold text-emerald-700">
                    {row.metrics.hookRate}%
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold text-blue-700">
                    {row.metrics.holdRate}%
                  </td>
                  <td className="py-3.5 px-3 text-right">{row.metrics.ctr}%</td>
                  <td
                    className={`py-3.5 px-3 text-right font-semibold ${
                      row.metrics.frequency >= 2.5 ? "text-amber-700" : ""
                    }`}
                  >
                    {row.metrics.frequency}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold">
                    {row.metrics.messages}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                    {row.metrics.messages > 0
                      ? formatVnd(row.metrics.costPerMessage)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
