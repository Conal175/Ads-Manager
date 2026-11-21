"use client";

import React from "react";
import { FileText } from "lucide-react";
import { formatDateTimeVi } from "@/lib/format";
import type { AdDraftDTO } from "@/types/domain";

interface DraftsHistorySectionProps {
  draftsList: AdDraftDTO[];
  onLoadDraft: (draft: AdDraftDTO) => void;
}

export function DraftsHistorySection({
  draftsList,
  onLoadDraft,
}: DraftsHistorySectionProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Bản nháp đã lưu & Lịch sử đẩy chiến dịch (PAUSED)
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase">
              <th className="py-3 px-4">Thời gian</th>
              <th className="py-3 px-4">Luồng</th>
              <th className="py-3 px-4">Tên chiến dịch (Auto-Naming)</th>
              <th className="py-3 px-4">TKQC đích</th>
              <th className="py-3 px-4">Trạng thái</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {draftsList.map((d) => (
              <tr key={d.id}>
                <td className="py-3 px-4 text-slate-500">
                  {formatDateTimeVi(d.updatedAt)}
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                  {d.flowType}
                </td>
                <td className="py-3 px-4">
                  <div className="font-mono font-semibold text-slate-900">
                    {d.generatedCampaignName}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    {d.generatedAdName}
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">
                  {d.adAccountMetaId}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      d.status === "launched_paused"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {d.status === "launched_paused"
                      ? "Đã đẩy (PAUSED)"
                      : "Bản nháp"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onLoadDraft(d)}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Nạp vào Trình tạo
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
