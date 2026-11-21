"use client";

import React from "react";
import { FileSpreadsheet, Edit3 } from "lucide-react";
import { formatCompactVnd, formatVnd } from "@/lib/format";
import { ModalShell } from "@/components/ui/ModalShell";
import type { RealProfitRow } from "@/types/domain";

export interface SalesOverrideFormState {
  reportDate: string;
  productId: string;
  ordersClosed: number;
  actualRevenue: number;
  returnedOrders: number;
  note: string;
}

export function RealProfitSection({
  profitRows,
  refreshing,
  onSyncSheets,
  onOpenManualModal,
}: {
  profitRows: RealProfitRow[];
  refreshing: boolean;
  onSyncSheets: () => void;
  onOpenManualModal: () => void;
}) {
  const totalProfitSpend = profitRows.reduce((s, r) => s + r.adSpend, 0);
  const totalProfitRev = profitRows.reduce((s, r) => s + r.actualRevenue, 0);
  const totalProfitNet = profitRows.reduce((s, r) => s + r.estNetProfit, 0);
  const totalProfitOrders = profitRows.reduce((s, r) => s + r.ordersClosed, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Tổng Chi tiêu Ads</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums mt-1">
            {formatCompactVnd(totalProfitSpend)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Tổng Doanh thu thực</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums mt-1">
            {formatCompactVnd(totalProfitRev)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Tổng Đơn chốt / CIR</div>
          <div className="text-xl font-bold text-blue-700 tabular-nums mt-1">
            {totalProfitOrders} đơn •{" "}
            {totalProfitRev > 0
              ? ((totalProfitSpend / totalProfitRev) * 100).toFixed(1)
              : 0}
            %
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Lợi nhuận ròng ước tính</div>
          <div
            className={`text-xl font-bold tabular-nums mt-1 ${
              totalProfitNet >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {totalProfitNet >= 0 ? "+" : ""}
            {formatCompactVnd(totalProfitNet)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Bảng Đối soát Lợi nhuận thực theo khóa [Ngày + Mã Sản phẩm]
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động ghép đúng phiên bản KPI có hiệu lực tại từng ngày báo cáo để lãi/lỗ quá khứ không bị sai lệch.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSyncSheets}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Đồng bộ Google Sheets
            </button>
            <button
              onClick={onOpenManualModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Nhập nhanh / Ghi đè cuối ngày
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
                <th className="py-3 px-4">Ngày / SP</th>
                <th className="py-3 px-3">KPI Áp dụng (Versioning)</th>
                <th className="py-3 px-3 text-right">Chi tiêu Ads</th>
                <th className="py-3 px-3 text-right">Tin / Đơn chốt</th>
                <th className="py-3 px-3 text-right">Tỷ lệ chốt</th>
                <th className="py-3 px-3 text-right">CPO thực tế</th>
                <th className="py-3 px-3 text-right">Doanh thu / CIR</th>
                <th className="py-3 px-3 text-right">Hoàn (%)</th>
                <th className="py-3 px-4 text-right">Lợi nhuận ròng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {profitRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900">
                      {row.reportDate} • {row.productCode}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {row.source === "manual_override"
                        ? "Ghi đè thủ công trên web"
                        : "Google Sheets"}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                      {row.kpiVersionUsed}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Hòa vốn: {formatCompactVnd(row.breakevenCpoAtDate)}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold">
                    {formatVnd(row.adSpend)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {row.messages} tin / <strong>{row.ordersClosed}</strong> đơn
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-blue-700">
                    {row.actualCloseRatePct}%
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-bold ${
                      row.actualCpo > row.breakevenCpoAtDate
                        ? "text-red-600"
                        : "text-emerald-700"
                    }`}
                  >
                    {formatVnd(row.actualCpo)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="font-semibold">
                      {formatCompactVnd(row.actualRevenue)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      CIR: {row.cirPct}%
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-amber-700">
                    {row.actualReturnRatePct}%
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-bold ${
                      row.estNetProfit >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {row.estNetProfit >= 0 ? "+" : ""}
                    {formatVnd(row.estNetProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ManualSalesOverrideModal({
  open,
  products,
  form,
  onChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  products: Array<{ id: number; code: string; name: string }>;
  form: SalesOverrideFormState;
  onChange: (next: SalesOverrideFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title="Nhập nhanh / Ghi đè số liệu bán hàng thực tế"
    >
      <form onSubmit={onSubmit} className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ngày báo cáo
            </label>
            <input
              type="date"
              required
              value={form.reportDate}
              onChange={(e) =>
                onChange({ ...form, reportDate: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Sản phẩm
            </label>
            <select
              value={form.productId}
              onChange={(e) => onChange({ ...form, productId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Số đơn chốt thực tế
            </label>
            <input
              type="number"
              required
              value={form.ordersClosed}
              onChange={(e) =>
                onChange({ ...form, ordersClosed: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 tabular-nums"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Số đơn hoàn dự kiến / thực tế
            </label>
            <input
              type="number"
              required
              value={form.returnedOrders}
              onChange={(e) =>
                onChange({ ...form, returnedOrders: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 tabular-nums"
            />
          </div>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Doanh thu thực tế (VNĐ)
          </label>
          <input
            type="number"
            required
            value={form.actualRevenue}
            onChange={(e) =>
              onChange({ ...form, actualRevenue: Number(e.target.value) })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 tabular-nums"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Ghi chú
          </label>
          <input
            value={form.note}
            onChange={(e) => onChange({ ...form, note: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            Lưu & Tính lại Lợi nhuận
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
