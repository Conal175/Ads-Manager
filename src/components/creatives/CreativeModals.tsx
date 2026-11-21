"use client";

import React from "react";
import { Film, Play, HardDrive } from "lucide-react";
import { ModalShell } from "@/components/ui/ModalShell";
import { formatDuration } from "@/lib/format";
import type { CreativeDTO } from "@/types/domain";

export function DriveVideoPreviewModal({
  creative,
  onClose,
}: {
  creative: CreativeDTO | null;
  onClose: () => void;
}) {
  return (
    <ModalShell
      open={Boolean(creative)}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      title={
        <>
          <Film className="w-5 h-5 text-blue-600" />
          <span>
            {creative?.creativeCode} — {creative?.fileName}
          </span>
        </>
      }
      subtitle={
        creative ? `Drive Embed: /file/d/${creative.driveFileId}/preview` : ""
      }
    >
      {creative && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex flex-col items-center justify-center text-center p-6 relative">
            {creative.driveFileId.startsWith("1Drive") ? (
              <div className="space-y-3 max-w-md">
                <div className="w-14 h-14 mx-auto rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                </div>
                <div className="text-sm font-bold text-white">
                  Khung phát nhúng trực tiếp từ Google Drive
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  URL nhúng:{" "}
                  <code className="text-blue-300">
                    https://drive.google.com/file/d/{creative.driveFileId}/preview
                  </code>
                  <br />
                  (Khi gắn Google Drive File ID thật, khung <code>iframe</code> phát trực tiếp từ máy chủ Google mà không tốn băng thông server web).
                </p>
                <div className="inline-flex items-center gap-3 text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700">
                  <span>Thời lượng: {formatDuration(creative.durationSec)}</span>
                  <span>•</span>
                  <span>Dung lượng: {creative.fileSizeMb} MB</span>
                </div>
              </div>
            ) : (
              <iframe
                src={`https://drive.google.com/file/d/${creative.driveFileId}/preview`}
                className="w-full h-full border-0"
                allow="autoplay"
                title={creative.fileName}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-800">
                Bộ đệm Video (meta_media_cache): {creative.mediaCache.length} tài khoản
              </div>
              {creative.mediaCache.length === 0 ? (
                <div className="text-slate-500">
                  Chưa đẩy lên tài khoản quảng cáo nào.
                </div>
              ) : (
                creative.mediaCache.map((m) => (
                  <div key={m.id} className="font-mono text-slate-700">
                    • {m.adAccountMetaId} →{" "}
                    <strong className="text-blue-700">{m.metaVideoId}</strong>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-800">
                Post ID đã tạo (meta_posts): {creative.posts.length} bài viết
              </div>
              {creative.posts.length === 0 ? (
                <div className="text-slate-500">
                  Chưa có Post ID nào gắn với video này.
                </div>
              ) : (
                creative.posts.map((p) => (
                  <div key={p.id} className="font-mono text-slate-700">
                    • <strong>{p.copyVersion}</strong>:{" "}
                    {p.effectiveObjectStoryId}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

export function PullFanpagePostModal({
  open,
  fanpages,
  creativesList,
  form,
  onChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  fanpages: Array<{ metaId: string; name: string }>;
  creativesList: CreativeDTO[];
  form: {
    pageMetaId: string;
    creativeId: string;
    copyVersion: string;
    ctaType: string;
  };
  onChange: (next: {
    pageMetaId: string;
    creativeId: string;
    copyVersion: string;
    ctaType: string;
  }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title="Kéo bài từ Fanpage (/promotable_posts)"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Chọn Fanpage nguồn
          </label>
          <select
            value={form.pageMetaId}
            onChange={(e) => onChange({ ...form, pageMetaId: e.target.value })}
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
            Gắn vào mã Creative gốc (để gom báo cáo xuyên TK)
          </label>
          <select
            value={form.creativeId}
            onChange={(e) => onChange({ ...form, creativeId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
          >
            <option value="">— Chọn Creative gốc —</option>
            {creativesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.creativeCode} — {c.fileName}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nhãn phiên bản chữ
            </label>
            <input
              value={form.copyVersion}
              onChange={(e) =>
                onChange({ ...form, copyVersion: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nút CTA bài viết
            </label>
            <select
              value={form.ctaType}
              onChange={(e) => onChange({ ...form, ctaType: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            >
              <option value="SEND_MESSAGE">SEND_MESSAGE</option>
              <option value="SHOP_NOW">SHOP_NOW</option>
              <option value="LEARN_MORE">LEARN_MORE</option>
            </select>
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
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Kéo bài & Lưu Kho Post ID
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export interface NewCreativeFormState {
  creativeCode: string;
  productId: string;
  driveFileId: string;
  driveFolderPath: string;
  fileName: string;
  fileSizeMb: number;
  durationSec: number;
  hookAngle: string;
}

export function AddDriveCreativeModal({
  open,
  productsList,
  form,
  onChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  productsList: Array<{ id: number; code: string; name: string }>;
  form: NewCreativeFormState;
  onChange: (next: NewCreativeFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      title={
        <>
          <HardDrive className="w-4 h-4 text-blue-600" />
          <span>Nạp siêu dữ liệu Creative Google Drive</span>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mã Creative (vd: CR-SP01-09)
            </label>
            <input
              required
              value={form.creativeCode}
              onChange={(e) =>
                onChange({ ...form, creativeCode: e.target.value })
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
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Google Drive File ID
            </label>
            <input
              required
              value={form.driveFileId}
              onChange={(e) =>
                onChange({ ...form, driveFileId: e.target.value })
              }
              placeholder="Dán ID từ link drive.google.com/file/d/{ID}/view"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>
          <div className="col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Tên file
            </label>
            <input
              required
              value={form.fileName}
              onChange={(e) => onChange({ ...form, fileName: e.target.value })}
              placeholder="CR-SP01-09_Hook_Moi.mp4"
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Dung lượng (MB — cảnh báo ≥ 80MB)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.fileSizeMb}
              onChange={(e) =>
                onChange({ ...form, fileSizeMb: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Thời lượng (giây)
            </label>
            <input
              type="number"
              value={form.durationSec}
              onChange={(e) =>
                onChange({ ...form, durationSec: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div className="col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Góc tiếp cận (Hook / Angle)
            </label>
            <input
              value={form.hookAngle}
              onChange={(e) => onChange({ ...form, hookAngle: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
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
            Lưu vào Kho Creative
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
