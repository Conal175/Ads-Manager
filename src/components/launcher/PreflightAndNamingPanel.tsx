"use client";

import React from "react";
import {
  Bookmark,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Save,
  Rocket,
} from "lucide-react";
import type { PreflightCheckItem, TranslatedMetaError } from "@/lib/meta-errors";

interface PreflightAndNamingPanelProps {
  generatedCampaignName: string;
  generatedAdsetName: string;
  generatedAdName: string;
  preflightChecks: PreflightCheckItem[];
  canLaunch: boolean;
  translatedError: TranslatedMetaError | null;
  launching: boolean;
  launchSteps: Array<{ step: string; status: string; detail: string }>;
  onSaveDraft: () => void;
  onLaunchPaused: () => void;
}

export function PreflightAndNamingPanel({
  generatedCampaignName,
  generatedAdsetName,
  generatedAdName,
  preflightChecks,
  canLaunch,
  translatedError,
  launching,
  launchSteps,
  onSaveDraft,
  onLaunchPaused,
}: PreflightAndNamingPanelProps) {
  return (
    <div className="lg:col-span-5 space-y-5">
      <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5" />
          Tự động đặt tên chuẩn (Auto-Naming Real-time)
        </div>
        <div className="space-y-2 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400">CAMPAIGN NAME</div>
            <div className="text-emerald-300 break-all">
              {generatedCampaignName}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">AD SET NAME</div>
            <div className="text-blue-200 break-all">{generatedAdsetName}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">AD NAME</div>
            <div className="text-amber-200 break-all">{generatedAdName}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Kiểm tra an toàn (Pre-flight Check)
          </h3>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              canLaunch
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {canLaunch ? "Đủ điều kiện đẩy" : "Có lỗi cần sửa"}
          </span>
        </div>

        <div className="space-y-2">
          {preflightChecks.map((chk) => (
            <div
              key={chk.id}
              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                chk.level === "error"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : chk.level === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-emerald-50/40 border-emerald-200/70 text-slate-800"
              }`}
            >
              {chk.level === "error" ? (
                <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              ) : chk.level === "warning" ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">{chk.title}</div>
                <div className="text-[11px] opacity-85 mt-0.5">{chk.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {translatedError && (
          <div className="p-3.5 rounded-xl bg-red-50 border-2 border-red-300 text-xs text-red-900 space-y-1">
            <div className="font-bold text-red-800">
              Biên dịch lỗi Meta API (Code {translatedError.code}
              {translatedError.subcode
                ? ` / Subcode ${translatedError.subcode}`
                : ""}
              ): {translatedError.title}
            </div>
            <div>
              <strong>Nguyên nhân:</strong> {translatedError.cause}
            </div>
            <div>
              <strong>Hướng xử lý:</strong> {translatedError.fix}
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onSaveDraft}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200"
          >
            <Save className="w-4 h-4" />
            Lưu bản nháp
          </button>
          <button
            type="button"
            onClick={onLaunchPaused}
            disabled={launching}
            className="flex-[1.5] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-60"
          >
            <Rocket className="w-4 h-4" />
            {launching
              ? "Đang đẩy lên Meta..."
              : "Đẩy Ads (status = PAUSED)"}
          </button>
        </div>
      </div>

      {launchSteps.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2.5">
          <div className="text-xs font-bold text-emerald-900">
            Nhật ký chuỗi lệnh Meta Marketing API vừa thực thi:
          </div>
          {launchSteps.map((s, idx) => (
            <div
              key={idx}
              className="text-xs bg-white p-2.5 rounded-lg border border-emerald-100"
            >
              <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {s.step}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">{s.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
