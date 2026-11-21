"use client";

import React, { useMemo } from "react";
import { Calculator, History } from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";
import { formatCompactVnd, formatVnd } from "@/lib/format";
import { computeProductKpis } from "@/lib/kpi";
import type { ProductWithKpiDTO } from "@/types/domain";

export interface ProductFormState {
  code: string;
  name: string;
  category: string;
  effectiveFrom: string;
  avgSellingPrice: number;
  cogs: number;
  shippingPackingFee: number;
  expectedReturnRatePct: number;
  otherCost: number;
  targetNetMarginPct: number;
  targetCloseRatePct: number;
  dailyBudgetTarget: number;
  note: string;
}

export function KpiUpsertModal({
  open,
  editingProduct,
  form,
  onChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  editingProduct: ProductWithKpiDTO | null;
  form: ProductFormState;
  onChange: (next: ProductFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  const livePreview = useMemo(() => computeProductKpis(form), [form]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      title={
        <>
          <Calculator className="w-5 h-5 text-blue-600" />
          <span>
            {editingProduct
              ? `Tạo phiên bản KPI mới cho ${editingProduct.code} (KPI Versioning)`
              : "Khai báo Sản phẩm & Bộ thước đo KPI mới"}
          </span>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {editingProduct && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
            <strong>Bảo toàn lịch sử lãi/lỗ:</strong> Hệ thống sẽ tạo bản ghi KPI mới gắn ngày hiệu lực <code>effective_from</code> mà không ghi đè bản ghi cũ. Báo cáo các tháng trước vẫn ghép đúng mức KPI tại thời điểm đó.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {!editingProduct && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã SP (vd: SP04)
                </label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => onChange({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên sản phẩm
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => onChange({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  placeholder="Ví dụ: Quạt Tích Điện Mini Gấp Gọn"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ngày bắt đầu hiệu lực (effective_from)
            </label>
            <input
              type="date"
              required
              value={form.effectiveFrom}
              onChange={(e) =>
                onChange({ ...form, effectiveFrom: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Giá bán TB (VNĐ)
            </label>
            <input
              type="number"
              required
              value={form.avgSellingPrice}
              onChange={(e) =>
                onChange({ ...form, avgSellingPrice: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Giá vốn COGS (VNĐ)
            </label>
            <input
              type="number"
              required
              value={form.cogs}
              onChange={(e) =>
                onChange({ ...form, cogs: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phí vận chuyển / đóng gói
            </label>
            <input
              type="number"
              required
              value={form.shippingPackingFee}
              onChange={(e) =>
                onChange({
                  ...form,
                  shippingPackingFee: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tỷ lệ hoàn dự kiến (%)
            </label>
            <input
              type="number"
              step="0.5"
              required
              value={form.expectedReturnRatePct}
              onChange={(e) =>
                onChange({
                  ...form,
                  expectedReturnRatePct: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chi phí khác (VNĐ)
            </label>
            <input
              type="number"
              value={form.otherCost}
              onChange={(e) =>
                onChange({ ...form, otherCost: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Biên LN ròng mong muốn (%)
            </label>
            <input
              type="number"
              step="0.5"
              required
              value={form.targetNetMarginPct}
              onChange={(e) =>
                onChange({
                  ...form,
                  targetNetMarginPct: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tỷ lệ chốt tin nhắn (%)
            </label>
            <input
              type="number"
              step="0.5"
              required
              value={form.targetCloseRatePct}
              onChange={(e) =>
                onChange({
                  ...form,
                  targetCloseRatePct: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs tabular-nums"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú phiên bản
            </label>
            <input
              value={form.note}
              onChange={(e) => onChange({ ...form, note: e.target.value })}
              placeholder="Ví dụ: Đàm phán giá nhập xưởng mới tháng 5"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Xem trước 3 chỉ số tự động tính & khóa (Phân bổ hoàn:{" "}
            {formatVnd(livePreview.returnCostAllocation)} • % CP Ads cho phép:{" "}
            {livePreview.allowedAdsSharePct}%)
          </div>
          <div className="grid grid-cols-3 gap-3 tabular-nums">
            <div className="p-2.5 rounded-lg bg-slate-800">
              <div className="text-[11px] text-slate-400">CPO hòa vốn</div>
              <div className="text-base font-bold text-white mt-0.5">
                {formatVnd(livePreview.breakevenCpo)}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-900/60 border border-blue-500/40">
              <div className="text-[11px] text-blue-200">CPO mục tiêu</div>
              <div className="text-base font-bold text-blue-300 mt-0.5">
                {formatVnd(livePreview.targetCpo)}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-900/60 border border-emerald-500/40">
              <div className="text-[11px] text-emerald-200">Giá tin nhắn trần</div>
              <div className="text-base font-bold text-emerald-300 mt-0.5">
                {formatVnd(livePreview.ceilingMessageCost)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            {editingProduct ? "Lưu phiên bản KPI mới" : "Tạo sản phẩm & Khóa KPI"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function KpiHistoryModal({
  product,
  onClose,
}: {
  product: ProductWithKpiDTO | null;
  onClose: () => void;
}) {
  return (
    <ModalShell
      open={Boolean(product)}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      title={
        <>
          <History className="w-5 h-5 text-blue-600" />
          <span>
            Lịch sử phiên bản KPI — {product?.code} ({product?.name})
          </span>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase">
              <th className="py-2.5 px-3">Phiên bản</th>
              <th className="py-2.5 px-3">Hiệu lực từ</th>
              <th className="py-2.5 px-3 text-right">Giá bán / COGS</th>
              <th className="py-2.5 px-3 text-right">CPO hòa vốn</th>
              <th className="py-2.5 px-3 text-right">CPO mục tiêu</th>
              <th className="py-2.5 px-3 text-right">Giá tin trần</th>
              <th className="py-2.5 px-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {product?.kpiVersions.map((v) => (
              <tr key={v.id}>
                <td className="py-3 px-3 font-bold text-blue-700">
                  v{v.versionNumber}
                </td>
                <td className="py-3 px-3 font-mono">{v.effectiveFrom}</td>
                <td className="py-3 px-3 text-right">
                  {formatCompactVnd(v.avgSellingPrice)} /{" "}
                  {formatCompactVnd(v.cogs)}
                </td>
                <td className="py-3 px-3 text-right font-semibold">
                  {formatVnd(v.breakevenCpo)}
                </td>
                <td className="py-3 px-3 text-right font-semibold text-blue-700">
                  {formatVnd(v.targetCpo)}
                </td>
                <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                  {formatVnd(v.ceilingMessageCost)}
                </td>
                <td className="py-3 px-3 text-slate-600">{v.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}

export function BudgetPacingModal({
  product,
  budgetForm,
  onChange,
  onSubmit,
  onClose,
}: {
  product: ProductWithKpiDTO | null;
  budgetForm: {
    dailyBudgetTarget: number;
    weeklyBudgetTarget: number;
    monthlyBudgetTarget: number;
  };
  onChange: (next: {
    dailyBudgetTarget: number;
    weeklyBudgetTarget: number;
    monthlyBudgetTarget: number;
  }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      open={Boolean(product)}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title={`Định mức ngân sách — ${product?.code ?? ""}`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mục tiêu chi tiêu NGÀY (VNĐ)
          </label>
          <input
            type="number"
            value={budgetForm.dailyBudgetTarget}
            onChange={(e) => {
              const d = Number(e.target.value);
              onChange({
                dailyBudgetTarget: d,
                weeklyBudgetTarget: d * 7,
                monthlyBudgetTarget: d * 30,
              });
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mục tiêu chi tiêu TUẦN (VNĐ)
          </label>
          <input
            type="number"
            value={budgetForm.weeklyBudgetTarget}
            onChange={(e) =>
              onChange({
                ...budgetForm,
                weeklyBudgetTarget: Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mục tiêu chi tiêu THÁNG (VNĐ)
          </label>
          <input
            type="number"
            value={budgetForm.monthlyBudgetTarget}
            onChange={(e) =>
              onChange({
                ...budgetForm,
                monthlyBudgetTarget: Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            Lưu định mức Pacing
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
