"use client";

import React from "react";
import { Layers, Film, Sparkles } from "lucide-react";
import type {
  AdPresetDTO,
  CreativeDTO,
  LauncherFlowType,
  MetaAssetDTO,
  MetaPostDTO,
} from "@/types/domain";

export interface LauncherBuilderFormProps {
  flowType: LauncherFlowType;
  onChangeFlowType: (flow: LauncherFlowType) => void;
  productsList: Array<{ id: number; code: string; name: string }>;
  productCode: string;
  onChangeProductCode: (code: string) => void;
  objective: "MESSAGES" | "CONVERSIONS" | "TRAFFIC";
  onChangeObjective: (obj: "MESSAGES" | "CONVERSIONS" | "TRAFFIC") => void;
  dailyBudget: number;
  onChangeDailyBudget: (val: number) => void;
  adAccounts: MetaAssetDTO[];
  adAccountMetaId: string;
  onChangeAdAccountMetaId: (val: string) => void;
  multiAccountIds: string[];
  onToggleMultiAccount: (metaId: string) => void;
  fanpages: MetaAssetDTO[];
  pageMetaId: string;
  onChangePageMetaId: (val: string) => void;
  ctaType: string;
  onChangeCtaType: (val: string) => void;
  postsList: MetaPostDTO[];
  effectiveObjectStoryId: string;
  onChangeEffectiveObjectStoryId: (val: string) => void;
  creativesList: CreativeDTO[];
  creativeId: string;
  onChangeCreativeId: (val: string) => void;
  copyVersion: string;
  onChangeCopyVersion: (val: string) => void;
  headline: string;
  onChangeHeadline: (val: string) => void;
  primaryText: string;
  onChangePrimaryText: (val: string) => void;
  targetPresets: AdPresetDTO[];
  selectedTargetCodes: string[];
  onToggleTargetPreset: (code: string) => void;
  messagePresets: AdPresetDTO[];
  messagePresetCode: string;
  onChangeMessagePresetCode: (code: string) => void;
  rightPanel: React.ReactNode;
}

export function LauncherFormSection(props: LauncherBuilderFormProps) {
  const {
    flowType,
    onChangeFlowType,
    productsList,
    productCode,
    onChangeProductCode,
    objective,
    onChangeObjective,
    dailyBudget,
    onChangeDailyBudget,
    adAccounts,
    adAccountMetaId,
    onChangeAdAccountMetaId,
    multiAccountIds,
    onToggleMultiAccount,
    fanpages,
    pageMetaId,
    onChangePageMetaId,
    ctaType,
    onChangeCtaType,
    postsList,
    effectiveObjectStoryId,
    onChangeEffectiveObjectStoryId,
    creativesList,
    creativeId,
    onChangeCreativeId,
    copyVersion,
    onChangeCopyVersion,
    headline,
    onChangeHeadline,
    primaryText,
    onChangePrimaryText,
    targetPresets,
    selectedTargetCodes,
    onToggleTargetPreset,
    messagePresets,
    messagePresetCode,
    onChangeMessagePresetCode,
    rightPanel,
  } = props;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            id: "flow1_drive" as const,
            title: "Luồng 1 — Video mới từ Drive",
            desc: "Meta tự kéo file_url từ Drive → Poll mã hóa 5s → Lưu cache → Khóa tắt Advantage+ & Lưu Post ID.",
            icon: Film,
          },
          {
            id: "flow2_post_id" as const,
            title: "Luồng 2 — Scale đa TK bằng Post ID",
            desc: "Bỏ qua Drive & mã hóa video. Chọn nhiều TKQC + nhiều Target Preset đẩy trong vài giây, dồn tương tác 1 bài.",
            icon: Layers,
          },
          {
            id: "flow3_video_id" as const,
            title: "Luồng 3 — Test chữ mới trên Video cũ",
            desc: "Tái sử dụng meta_video_id từ meta_media_cache (0ms đụng Drive) → Sinh Post ID bản chữ mới để A/B test.",
            icon: Sparkles,
          },
        ].map((f) => {
          const Icon = f.icon;
          const active = flowType === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChangeFlowType(f.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                active
                  ? "bg-blue-50/60 border-blue-600 shadow-xs"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Icon
                  className={`w-4 h-4 ${
                    active ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                {f.title}
              </div>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {f.desc}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sản phẩm
            </label>
            <select
              value={productCode}
              onChange={(e) => onChangeProductCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium"
            >
              {productsList.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mục tiêu chiến dịch
            </label>
            <select
              value={objective}
              onChange={(e) =>
                onChangeObjective(
                  e.target.value as "MESSAGES" | "CONVERSIONS" | "TRAFFIC"
                )
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium"
            >
              <option value="MESSAGES">Tin nhắn (OUTCOME_ENGAGEMENT)</option>
              <option value="CONVERSIONS">Chuyển đổi (OUTCOME_SALES)</option>
              <option value="TRAFFIC">Lưu lượng (OUTCOME_TRAFFIC)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ngân sách ngày / nhóm (VNĐ)
            </label>
            <input
              type="number"
              step={50000}
              value={dailyBudget}
              onChange={(e) => onChangeDailyBudget(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {flowType === "flow2_post_id"
                ? "Chọn nhiều Tài khoản Quảng cáo đích (Scale đa TK)"
                : "Tài khoản Quảng cáo đích"}
            </label>
            {flowType === "flow2_post_id" ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 rounded-lg border border-slate-200 bg-slate-50">
                {adAccounts.map((acc) => (
                  <label
                    key={acc.metaId}
                    className="flex items-center justify-between gap-2 text-xs p-1.5 rounded hover:bg-white cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={multiAccountIds.includes(acc.metaId)}
                        onChange={() => onToggleMultiAccount(acc.metaId)}
                      />
                      <span className="font-medium text-slate-800">
                        {acc.name}
                      </span>
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        acc.accountStatus === 1
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {acc.accountStatus === 1
                        ? "Active"
                        : `Lỗi #${acc.accountStatus}`}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <select
                value={adAccountMetaId}
                onChange={(e) => onChangeAdAccountMetaId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              >
                {adAccounts.map((acc) => (
                  <option key={acc.metaId} value={acc.metaId}>
                    {acc.name} ({acc.metaId}){" "}
                    {acc.accountStatus !== 1 ? "— [LỖI]" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fanpage chạy quảng cáo
              </label>
              <select
                value={pageMetaId}
                onChange={(e) => onChangePageMetaId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              >
                {fanpages.map((p) => (
                  <option key={p.metaId} value={p.metaId}>
                    {p.name} ({p.metaId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nút kêu gọi hành động (CTA)
              </label>
              <select
                value={ctaType}
                onChange={(e) => onChangeCtaType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              >
                <option value="SEND_MESSAGE">
                  SEND_MESSAGE (Gửi tin nhắn)
                </option>
                <option value="SHOP_NOW">SHOP_NOW (Mua ngay)</option>
                <option value="LEARN_MORE">LEARN_MORE (Tìm hiểu thêm)</option>
              </select>
            </div>
          </div>
        </div>

        {flowType === "flow2_post_id" ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800">
              Chọn Post ID từ Kho meta_posts (hoặc dán tay {"{page_id}_{post_id}"})
            </div>
            <select
              value={effectiveObjectStoryId}
              onChange={(e) => {
                const val = e.target.value;
                onChangeEffectiveObjectStoryId(val);
                const found = postsList.find(
                  (p) => p.effectiveObjectStoryId === val
                );
                if (found) {
                  onChangePageMetaId(found.pageMetaId);
                  onChangeCtaType(found.ctaType);
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
            >
              {postsList.map((p) => (
                <option key={p.id} value={p.effectiveObjectStoryId}>
                  [{p.copyVersion}] {p.effectiveObjectStoryId} — {p.headline}
                </option>
              ))}
            </select>
            <input
              value={effectiveObjectStoryId}
              onChange={(e) => onChangeEffectiveObjectStoryId(e.target.value)}
              placeholder="Hoặc dán tay mã {page_id}_{post_id}..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono bg-white"
            />
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {flowType === "flow3_video_id"
                    ? "Chọn Creative đã có trong meta_media_cache"
                    : "Chọn Video từ Kho Google Drive"}
                </label>
                <select
                  value={creativeId}
                  onChange={(e) => onChangeCreativeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  {creativesList.map((c) => {
                    const hasCache = c.mediaCache.some(
                      (m) => m.adAccountMetaId === adAccountMetaId
                    );
                    return (
                      <option key={c.id} value={c.id}>
                        {c.creativeCode} ({c.fileSizeMb} MB){" "}
                        {hasCache ? "✓ [Có Video ID Cache]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhãn phiên bản nội dung chữ
                </label>
                <input
                  value={copyVersion}
                  onChange={(e) => onChangeCopyVersion(e.target.value)}
                  placeholder="Ví dụ: BanChuB"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tiêu đề quảng cáo (Headline)
              </label>
              <input
                value={headline}
                onChange={(e) => onChangeHeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nội dung chính (Primary Text)
              </label>
              <textarea
                rows={3}
                value={primaryText}
                onChange={(e) => onChangePrimaryText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mẫu Target (1-click Preset —{" "}
              {flowType === "flow2_post_id"
                ? "chọn được nhiều mẫu"
                : "chọn 1 mẫu"}
              )
            </label>
            <div className="space-y-1.5">
              {targetPresets.map((tp) => {
                const active = selectedTargetCodes.includes(tp.code);
                return (
                  <button
                    key={tp.id}
                    type="button"
                    onClick={() => onToggleTargetPreset(tp.code)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      active
                        ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-mono text-[11px]">{tp.code}</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      {tp.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mẫu Tin nhắn chào & Câu hỏi gợi ý
            </label>
            <select
              value={messagePresetCode}
              onChange={(e) => onChangeMessagePresetCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs mb-2"
            >
              {messagePresets.map((mp) => (
                <option key={mp.id} value={mp.code}>
                  {mp.code} — {mp.name}
                </option>
              ))}
            </select>
            {messagePresets.find((m) => m.code === messagePresetCode) && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                {String(
                  messagePresets.find((m) => m.code === messagePresetCode)
                    ?.configJson?.greeting_text || ""
                )}
              </div>
            )}
          </div>
        </div>
        </div>
        {rightPanel}
      </div>
    </div>
  );
}
