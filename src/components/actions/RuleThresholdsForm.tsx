"use client";

import React from "react";
import { X } from "lucide-react";
import type { RuleConfig } from "@/types/domain";

interface RuleThresholdsFormProps {
  ruleConfig: RuleConfig;
  onChange: (next: RuleConfig) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function RuleThresholdsForm({
  ruleConfig,
  onChange,
  onSubmit,
  onClose,
}: RuleThresholdsFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-xl border-2 border-blue-200 p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-slate-900">
          Cấu hình ngưỡng kích hoạt 4 nhóm quy tắc & Bộ lọc chống nhiễu mẫu nhỏ
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-3 rounded-lg bg-red-50/50 border border-red-200 space-y-2">
          <div className="font-bold text-red-800">1. Cắt lỗ (Kill)</div>
          <div>
            <label className="block text-[11px] text-slate-600">
              % Giá tin trần (0 tin nhắn)
            </label>
            <input
              type="number"
              value={ruleConfig.killMsgCeilingPct}
              onChange={(e) =>
                onChange({
                  ...ruleConfig,
                  killMsgCeilingPct: Number(e.target.value),
                })
              }
              className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 bg-white tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600">
              Chi tiêu tối thiểu chống nhiễu (VNĐ)
            </label>
            <input
              type="number"
              value={ruleConfig.killMinSpend}
              onChange={(e) =>
                onChange({
                  ...ruleConfig,
                  killMinSpend: Number(e.target.value),
                })
              }
              className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 bg-white tabular-nums"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-2">
          <div className="font-bold text-emerald-800">2. Mở rộng (Scale)</div>
          <div>
            <label className="block text-[11px] text-slate-600">
              Rẻ hơn giá trần tối thiểu (%)
            </label>
            <input
              type="number"
              value={ruleConfig.scaleTargetDiscountPct}
              onChange={(e) =>
                onChange({
                  ...ruleConfig,
                  scaleTargetDiscountPct: Number(e.target.value),
                })
              }
              className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 bg-white tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600">
              Sản lượng tin tối thiểu (chống nhiễu)
            </label>
            <input
              type="number"
              value={ruleConfig.scaleMinMessages}
              onChange={(e) =>
                onChange({
                  ...ruleConfig,
                  scaleMinMessages: Number(e.target.value),
                })
              }
              className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 bg-white tabular-nums"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 space-y-2">
          <div className="font-bold text-amber-800">3. Bão hòa Creative</div>
          <div>
            <label className="block text-[11px] text-slate-600">
              Ngưỡng Tần suất (Frequency)
            </label>
            <input
              type="number"
              step="0.1"
              value={ruleConfig.fatigueFrequencyThreshold}
              onChange={(e) =>
                onChange({
                  ...ruleConfig,
                  fatigueFrequencyThreshold: Number(e.target.value),
                })
              }
              className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 bg-white tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600">
              Số ngày CTR giảm liên tiếp
            </label>
            <input
              type="number"
              value={ruleConfig.fatigueCtrDropDays}
              onChange={(e) =>
                onChange({
                  ...ruleConfig,
                  fatigueCtrDropDays: Number(e.target.value),
                })
              }
              className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 bg-white tabular-nums"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-200 space-y-2">
          <div className="font-bold text-purple-800">4. Chặn rò rỉ (Leakage)</div>
          <div>
            <label className="block text-[11px] text-slate-600">
              Tỷ trọng ngân sách tối thiểu (%)
            </label>
            <input
              type="number"
              value={ruleConfig.leakageSpendSharePct}
              onChange={(e) =>
                onChange({
                  ...ruleConfig,
                  leakageSpendSharePct: Number(e.target.value),
                })
              }
              className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 bg-white tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600">
              Hệ số giá cao hơn trung bình (x)
            </label>
            <input
              type="number"
              step="0.1"
              value={ruleConfig.leakageCostMultiplier}
              onChange={(e) =>
                onChange({
                  ...ruleConfig,
                  leakageCostMultiplier: Number(e.target.value),
                })
              }
              className="w-full mt-0.5 px-2.5 py-1.5 rounded border border-slate-300 bg-white tabular-nums"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
        >
          Lưu ngưỡng quy tắc
        </button>
      </div>
    </form>
  );
}
