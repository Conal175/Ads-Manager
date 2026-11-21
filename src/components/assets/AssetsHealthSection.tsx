"use client";

import React from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Globe,
  Cpu,
  BellRing,
} from "lucide-react";
import {
  formatCompactVnd,
  formatDateTimeVi,
  formatVnd,
  getMetaAccountStatusInfo,
} from "@/lib/format";
import type { MetaAssetDTO } from "@/types/domain";

interface AssetsHealthSectionProps {
  assets: MetaAssetDTO[];
  syncing: boolean;
  onSyncAssets: () => void;
  onToggleMonitor: (asset: MetaAssetDTO) => void;
  onSimulateStatusChange: (asset: MetaAssetDTO, nextStatus: number) => void;
}

export function AssetsHealthSection({
  assets,
  syncing,
  onSyncAssets,
  onToggleMonitor,
  onSimulateStatusChange,
}: AssetsHealthSectionProps) {
  const adAccounts = assets.filter((a) => a.assetType === "ad_account");
  const fanpages = assets.filter((a) => a.assetType === "fanpage");
  const pixels = assets.filter((a) => a.assetType === "pixel");

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Tài khoản Quảng cáo (owned_ad_accounts & client_ad_accounts)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chỉ các tài khoản bật công tắc <strong>Theo dõi</strong> mới được kéo báo cáo định kỳ để tiết kiệm Rate Limit Meta.
            </p>
          </div>
          <button
            onClick={onSyncAssets}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Đang đồng bộ BM..." : "Đồng bộ Tài sản"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Theo dõi</th>
                <th className="py-3 px-4">Tài khoản & ID</th>
                <th className="py-3 px-4">Trạng thái (account_status)</th>
                <th className="py-3 px-4">Thẻ thanh toán (funding_source)</th>
                <th className="py-3 px-4 text-right">Đã chi tiêu / Giới hạn</th>
                <th className="py-3 px-4 text-right">Hạn mức ngày</th>
                <th className="py-3 px-4 text-right">Kiểm thử cảnh báo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {adAccounts.map((acc) => {
                const st = getMetaAccountStatusInfo(acc.accountStatus);
                const isUnhealthy = acc.accountStatus !== 1;
                return (
                  <tr
                    key={acc.id}
                    className={isUnhealthy ? "bg-red-50/40" : "hover:bg-slate-50/80"}
                  >
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onToggleMonitor(acc)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          acc.isMonitored ? "bg-blue-600" : "bg-slate-300"
                        }`}
                        title={
                          acc.isMonitored
                            ? "Đang theo dõi định kỳ"
                            : "Tắt để tiết kiệm Rate Limit"
                        }
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                            acc.isMonitored ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        {acc.name}
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                          {acc.ownershipType}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-500 mt-0.5">
                        {acc.metaId} • Sync: {formatDateTimeVi(acc.syncedAt)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          st.severity === "ok"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : st.severity === "danger"
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {st.severity === "ok" ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {st.label} (={acc.accountStatus})
                      </span>
                      {acc.disableReason !== "NONE" && (
                        <div className="text-[11px] text-red-700 font-mono mt-1">
                          Lý do: {acc.disableReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      {acc.fundingSourceDetails}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      <div className="font-semibold text-slate-900">
                        {formatCompactVnd(acc.amountSpent)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Cap: {formatCompactVnd(acc.spendCap)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-xs font-semibold text-slate-800">
                      {formatVnd(acc.dailySpendLimit)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {acc.accountStatus === 1 ? (
                        <button
                          onClick={() => onSimulateStatusChange(acc, 9)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        >
                          <BellRing className="w-3 h-3" />
                          Giả lập lỗi thẻ
                        </button>
                      ) : (
                        <button
                          onClick={() => onSimulateStatusChange(acc, 1)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        >
                          Khôi phục Active
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-indigo-600" />
            Fanpages thuộc Business Manager ({fanpages.length})
          </h3>
          <div className="space-y-2.5">
            {fanpages.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Page ID: {p.metaId} • {p.fundingSourceDetails}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Sẵn sàng Post ID
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-emerald-600" />
            Meta Pixels & Sự kiện ({pixels.length})
          </h3>
          <div className="space-y-2.5">
            {pixels.map((px) => (
              <div
                key={px.id}
                className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{px.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Pixel ID: {px.metaId} • {px.fundingSourceDetails}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Đang nhận Event
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
