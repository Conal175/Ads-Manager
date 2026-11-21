"use client";

import React from "react";
import { Trash2, Plus } from "lucide-react";
import type { AdPresetDTO } from "@/types/domain";

interface PresetsManagerSectionProps {
  presetsList: AdPresetDTO[];
  newPreset: {
    presetType: "target" | "message";
    code: string;
    name: string;
    configJson: string;
  };
  onChangeNewPreset: (next: {
    presetType: "target" | "message";
    code: string;
    name: string;
    configJson: string;
  }) => void;
  onCreatePreset: (e: React.FormEvent) => void;
  onDeletePreset: (id: number) => void;
}

export function PresetsManagerSection({
  presetsList,
  newPreset,
  onChangeNewPreset,
  onCreatePreset,
  onDeletePreset,
}: PresetsManagerSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-4">
        {presetsList.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded mr-2 ${
                    p.presetType === "target"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-purple-50 text-purple-700"
                  }`}
                >
                  {p.presetType === "target" ? "Mẫu Target" : "Mẫu Tin nhắn"}
                </span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {p.code}
                </span>
                <span className="text-xs text-slate-600 ml-2">— {p.name}</span>
              </div>
              <button
                onClick={() => onDeletePreset(p.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                title="Xóa mẫu"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
              {JSON.stringify(p.configJson, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs h-fit">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-blue-600" />
          Tạo Mẫu cấu hình mới (Meta API JSON)
        </h3>
        <form onSubmit={onCreatePreset} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Loại mẫu
            </label>
            <select
              value={newPreset.presetType}
              onChange={(e) =>
                onChangeNewPreset({
                  ...newPreset,
                  presetType: e.target.value as "target" | "message",
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            >
              <option value="target">
                Mẫu Nhắm chọn đối tượng (Target Preset)
              </option>
              <option value="message">
                Mẫu Tin nhắn chào & Câu hỏi gợi ý
              </option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mã Preset (dùng ghép Auto-Naming)
            </label>
            <input
              required
              value={newPreset.code}
              onChange={(e) =>
                onChangeNewPreset({ ...newPreset, code: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tên hiển thị
            </label>
            <input
              required
              value={newPreset.name}
              onChange={(e) =>
                onChangeNewPreset({ ...newPreset, name: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Cấu trúc JSON chuẩn Meta Marketing API
            </label>
            <textarea
              rows={8}
              value={newPreset.configJson}
              onChange={(e) =>
                onChangeNewPreset({ ...newPreset, configJson: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            Lưu vào Thư viện Presets
          </button>
        </form>
      </div>
    </div>
  );
}
