"use client";

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatCompactVnd, formatNumber, formatVnd } from "@/lib/format";
import type { CampaignHierarchyNode } from "@/types/domain";

interface HierarchyTreeTableProps {
  hierarchy: CampaignHierarchyNode[];
  expandedCampaigns: Record<string, boolean>;
  expandedAdsets: Record<string, boolean>;
  onToggleCampaign: (id: string) => void;
  onToggleAdset: (id: string) => void;
}

export function HierarchyTreeTable({
  hierarchy,
  expandedCampaigns,
  expandedAdsets,
  onToggleCampaign,
  onToggleAdset,
}: HierarchyTreeTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
              <th className="py-3 px-4 min-w-[300px]">
                Cấu trúc 3 Cấp (Chiến dịch → Nhóm → Quảng cáo)
              </th>
              <th className="py-3 px-3">SP</th>
              <th className="py-3 px-3 text-right">Chi tiêu</th>
              <th className="py-3 px-3 text-right">Hiển thị</th>
              <th className="py-3 px-3 text-right">CPM</th>
              <th className="py-3 px-3 text-right">CTR</th>
              <th className="py-3 px-3 text-right">Tần suất</th>
              <th className="py-3 px-3 text-right">Tin nhắn</th>
              <th className="py-3 px-3 text-right">Giá / Tin</th>
              <th className="py-3 px-3 text-right">Hook / Hold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {hierarchy.map((cmp) => {
              const cmpOpen = Boolean(expandedCampaigns[cmp.campaignMetaId]);
              return (
                <React.Fragment key={cmp.campaignMetaId}>
                  <tr className="bg-slate-50/70 hover:bg-blue-50/30 font-semibold">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onToggleCampaign(cmp.campaignMetaId)}
                        className="flex items-center gap-2 text-left text-slate-900"
                      >
                        {cmpOpen ? (
                          <ChevronDown className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 mr-1.5">
                            CD
                          </span>
                          {cmp.campaignName}
                          <div className="font-mono text-[10px] font-normal text-slate-500 mt-0.5">
                            {cmp.adAccountMetaId}
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-3 font-mono">{cmp.productCode}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatVnd(cmp.metrics.spend)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {formatNumber(cmp.metrics.impressions)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {formatCompactVnd(cmp.metrics.cpm)}
                    </td>
                    <td className="py-3 px-3 text-right">{cmp.metrics.ctr}%</td>
                    <td className="py-3 px-3 text-right">
                      {cmp.metrics.frequency}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-700">
                      {cmp.metrics.messages}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {cmp.metrics.messages > 0
                        ? formatVnd(cmp.metrics.costPerMessage)
                        : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {cmp.metrics.hookRate}% / {cmp.metrics.holdRate}%
                    </td>
                  </tr>

                  {cmpOpen &&
                    cmp.adsets.map((adset) => {
                      const adsetOpen = Boolean(
                        expandedAdsets[adset.adsetMetaId]
                      );
                      return (
                        <React.Fragment key={adset.adsetMetaId}>
                          <tr className="bg-white hover:bg-slate-50">
                            <td className="py-2.5 pl-10 pr-4">
                              <button
                                onClick={() => onToggleAdset(adset.adsetMetaId)}
                                className="flex items-center gap-1.5 text-left text-slate-800 font-medium"
                              >
                                {adsetOpen ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                  Nhóm
                                </span>
                                <span>{adset.adsetName}</span>
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">—</td>
                            <td className="py-2.5 px-3 text-right font-medium">
                              {formatVnd(adset.metrics.spend)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {formatNumber(adset.metrics.impressions)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {formatCompactVnd(adset.metrics.cpm)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {adset.metrics.ctr}%
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-semibold ${
                                adset.metrics.frequency >= 2.5
                                  ? "text-amber-700"
                                  : ""
                              }`}
                            >
                              {adset.metrics.frequency}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              {adset.metrics.messages}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              {adset.metrics.messages > 0
                                ? formatVnd(adset.metrics.costPerMessage)
                                : "Chưa có tin"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {adset.metrics.hookRate}% /{" "}
                              {adset.metrics.holdRate}%
                            </td>
                          </tr>

                          {adsetOpen &&
                            adset.ads.map((ad) => (
                              <tr
                                key={ad.adMetaId}
                                className="bg-slate-50/40 text-slate-600"
                              >
                                <td className="py-2 pl-16 pr-4">
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 mr-1.5">
                                    QC
                                  </span>
                                  <span className="font-mono text-[11px]">
                                    {ad.adName}
                                  </span>
                                  <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                                    Creative: {ad.creativeCode} • Post ID:{" "}
                                    {ad.effectiveObjectStoryId}
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px]">
                                  {ad.creativeCode}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {formatVnd(ad.metrics.spend)}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {formatNumber(ad.metrics.impressions)}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {formatCompactVnd(ad.metrics.cpm)}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {ad.metrics.ctr}%
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {ad.metrics.frequency}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {ad.metrics.messages}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {ad.metrics.messages > 0
                                    ? formatVnd(ad.metrics.costPerMessage)
                                    : "—"}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {ad.metrics.hookRate}% / {ad.metrics.holdRate}%
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
