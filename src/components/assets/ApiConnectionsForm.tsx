"use client";

import React from "react";
import {
  CheckCircle2,
  XCircle,
  KeyRound,
  Save,
  PlugZap,
  Sparkles,
} from "lucide-react";
import { GEMINI_MODELS, type SettingsDTO } from "@/types/domain";

interface ApiConnectionsFormProps {
  settings: SettingsDTO;
  saving: boolean;
  testingService: string | null;
  onChange: (next: SettingsDTO) => void;
  onSave: (e: React.FormEvent) => void;
  onTestService: (service: "meta" | "drive" | "sheets" | "telegram" | "ai") => void;
}

export function ApiConnectionsForm({
  settings,
  saving,
  testingService,
  onChange,
  onSave,
  onTestService,
}: ApiConnectionsFormProps) {
  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* 1. Meta Graph API */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                1. Meta Marketing API (System User Token)
              </h2>
              <p className="text-xs text-slate-500">
                Kiểm tra qua <code>/debug_token</code> & <code>/me/permissions</code> xác thực đủ 4 quyền: ads_read, ads_management, pages_read_engagement, pages_show_list.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTestService("meta")}
            disabled={testingService === "meta"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
          >
            <PlugZap className="w-3.5 h-3.5" />
            {testingService === "meta" ? "Đang kiểm tra..." : "Kiểm tra kết nối Meta"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Meta System User Token
            </label>
            <input
              type="text"
              value={settings.metaSystemUserToken}
              onChange={(e) =>
                onChange({ ...settings, metaSystemUserToken: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="EAA..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ID Business Manager (BM ID)
            </label>
            <input
              type="text"
              value={settings.metaBusinessManagerId}
              onChange={(e) =>
                onChange({ ...settings, metaBusinessManagerId: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {settings.connectionStatuses?.meta && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              settings.connectionStatuses.meta.ok
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="font-semibold flex items-center gap-1.5">
              {settings.connectionStatuses.meta.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              {settings.connectionStatuses.meta.message}
            </div>
            {Array.isArray(settings.connectionStatuses.meta.details?.permissions) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(settings.connectionStatuses.meta.details.permissions as string[]).map(
                  (perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 rounded bg-white border border-emerald-200 font-mono text-[11px] text-emerald-700"
                    >
                      ✓ {perm}
                    </span>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Google Drive & Google Sheets */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              2. Google Drive (Kho Creative) & Google Sheets (Đối soát Lợi nhuận)
            </h2>
            <p className="text-xs text-slate-500">
              Xác thực bằng Service Account JSON để quét siêu dữ liệu video và đọc trang tính đơn hàng thực tế.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTestService("drive")}
              disabled={testingService === "drive"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200"
            >
              <PlugZap className="w-3.5 h-3.5" />
              Kiểm tra Drive
            </button>
            <button
              type="button"
              onClick={() => onTestService("sheets")}
              disabled={testingService === "sheets"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200"
            >
              <PlugZap className="w-3.5 h-3.5" />
              Kiểm tra Sheets
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ID Thư mục gốc Google Drive (Kho_Ads)
            </label>
            <input
              type="text"
              value={settings.googleDriveRootFolderId}
              onChange={(e) =>
                onChange({ ...settings, googleDriveRootFolderId: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đường dẫn file Google Sheets đối soát đơn hàng
            </label>
            <input
              type="text"
              value={settings.googleSheetsUrl}
              onChange={(e) =>
                onChange({ ...settings, googleSheetsUrl: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Google Service Account JSON
          </label>
          <textarea
            rows={4}
            value={settings.googleServiceAccountJson}
            onChange={(e) =>
              onChange({ ...settings, googleServiceAccountJson: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(["drive", "sheets"] as const).map((svc) => {
            const st = settings.connectionStatuses?.[svc];
            if (!st) return null;
            return (
              <div
                key={svc}
                className={`p-2.5 rounded-lg text-xs border ${
                  st.ok
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <strong>{svc === "drive" ? "Google Drive" : "Google Sheets"}:</strong>{" "}
                {st.message}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Telegram Bot & 4. Google Gemini AI API */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              3. Telegram Bot (Cảnh báo 2 luồng)
            </h2>
            <button
              type="button"
              onClick={() => onTestService("telegram")}
              disabled={testingService === "telegram"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
            >
              <PlugZap className="w-3.5 h-3.5" />
              Kiểm tra Telegram
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telegram Bot Token
              </label>
              <input
                type="text"
                value={settings.telegramBotToken}
                onChange={(e) =>
                  onChange({ ...settings, telegramBotToken: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telegram Chat ID / Group ID
              </label>
              <input
                type="text"
                value={settings.telegramChatId}
                onChange={(e) =>
                  onChange({ ...settings, telegramChatId: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>
          {settings.connectionStatuses?.telegram && (
            <div className="p-2.5 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-800">
              {settings.connectionStatuses.telegram.message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                4. Google Gemini AI & Trần an toàn ngân sách
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onTestService("ai")}
              disabled={testingService === "ai"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              <PlugZap className="w-3.5 h-3.5" />
              {testingService === "ai" ? "Đang ping Gemini..." : "Kiểm tra Gemini AI"}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô hình AI Briefing (Structured JSON Output)
              </label>
              <select
                value={settings.aiProvider}
                onChange={(e) =>
                  onChange({ ...settings, aiProvider: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Khóa Google Gemini API Key (AIza...)
                </label>
                {settings.envKeyDetected?.gemini && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    ✓ Đã nhận GEMINI_API_KEY từ .env
                  </span>
                )}
              </div>
              <input
                type="password"
                value={settings.aiApiKey}
                onChange={(e) =>
                  onChange({ ...settings, aiApiKey: e.target.value })
                }
                placeholder="AIzaSy... (Lấy tại Google AI Studio — aistudio.google.com)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          {settings.connectionStatuses?.ai && (
            <div
              className={`p-2.5 rounded-lg text-xs border ${
                settings.connectionStatuses.ai.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {settings.connectionStatuses.ai.message}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Trần cảnh báo an toàn ngân sách ngày khi lên Ads (VNĐ)
            </label>
            <input
              type="number"
              value={settings.dailyBudgetSafetyCap}
              onChange={(e) =>
                onChange({
                  ...settings,
                  dailyBudgetSafetyCap: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Đang lưu..." : "Lưu toàn bộ cấu hình API"}
        </button>
      </div>
    </form>
  );
}
