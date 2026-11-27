"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Play, Rocket, Plus } from "lucide-react";
import { formatDuration, LIFECYCLE_LABELS } from "@/lib/format";
import type { CreativeDTO } from "@/types/domain";

interface DriveCreativeGridProps {
  creatives: CreativeDTO[];
  allCreativesCount: number;
  sizeWarningCount: number;
  productsList: Array<{ id: number; code: string; name: string }>;
  filterProduct: string;
  filterStatus: string;
  search: string;
  filterType: string;
  filterSize: string;
  sort: string;
  onSearch: (val: string) => void;
  onChangeFilterType: (val: string) => void;
  onChangeFilterSize: (val: string) => void;
  onChangeSort: (val: string) => void;
  onResetFilters: () => void;
  onChangeFilterProduct: (val: string) => void;
  onChangeFilterStatus: (val: string) => void;
  onChangeLifecycle: (creativeId: number, status: string) => void;
  onOpenPreview: (creative: CreativeDTO) => void;
  onOpenAddModal: () => void;
}

export function DriveCreativeGrid({
  creatives,
  allCreativesCount,
  sizeWarningCount,
  productsList,
  filterProduct,
  filterStatus,
  search, filterType, filterSize, sort, onSearch, onChangeFilterType, onChangeFilterSize, onChangeSort, onResetFilters,
  onChangeFilterProduct,
  onChangeFilterStatus,
  onChangeLifecycle,
  onOpenPreview,
  onOpenAddModal,
}: DriveCreativeGridProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <input aria-label="Tìm media" placeholder="Tìm mã, tên, thư mục..." value={search} onChange={e=>onSearch(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white" />
          <select aria-label="Lọc sản phẩm"
            value={filterProduct}
            onChange={(e) => onChangeFilterProduct(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white"
          >
            <option value="ALL">Tất cả sản phẩm</option>
            {productsList.map((p) => (
              <option key={p.id} value={p.code}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
          <select aria-label="Lọc trạng thái vòng đời"
            value={filterStatus}
            onChange={(e) => onChangeFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white"
          >
            <option value="ALL">Tất cả trạng thái vòng đời</option>
            <option value="cho_test">Chờ test</option>
            <option value="dang_chay">Đang chạy</option>
            <option value="winning">Winning</option>
            <option value="bao_hoa">Bão hòa</option>
          </select>
          <select aria-label="Lọc loại media" value={filterType} onChange={e=>onChangeFilterType(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"><option value="ALL">Tất cả loại</option><option value="video">Video</option><option value="image">Ảnh</option></select>
          <select aria-label="Lọc dung lượng" value={filterSize} onChange={e=>onChangeFilterSize(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"><option value="ALL">Mọi dung lượng</option><option value="large">≥ 80 MB</option><option value="normal">Dưới 80 MB</option></select>
          <select aria-label="Sắp xếp media" value={sort} onChange={e=>onChangeSort(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"><option value="newest">Mới nhập trước</option><option value="oldest">Nhập cũ trước</option><option value="code_asc">Mã A–Z</option><option value="code_desc">Mã Z–A</option><option value="name_asc">Tên A–Z</option><option value="size_desc">Dung lượng lớn trước</option><option value="size_asc">Dung lượng nhỏ trước</option></select>
          <button type="button" onClick={onResetFilters} className="text-xs font-semibold text-blue-700">Xóa bộ lọc</button>
          <span className="text-xs text-slate-500" aria-live="polite">Hiển thị {creatives.length}/{allCreativesCount} media</span>
          <span className="text-xs text-slate-500 flex items-center gap-1.5 ml-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            {sizeWarningCount} video ≥ 80MB cần nén
          </span>
        </div>

        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm Drive File ID
        </button>
      </div>

      {creatives.length === 0 && <p className="rounded-xl bg-white border border-slate-200 p-6 text-sm text-slate-500">Không có media phù hợp với bộ lọc.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {creatives.map((cr) => {
          const statusMeta =
            LIFECYCLE_LABELS[cr.lifecycleStatus] ?? LIFECYCLE_LABELS.cho_test;

          return (
            <div
              key={cr.id}
              className={`bg-white rounded-xl border overflow-hidden shadow-xs flex flex-col ${
                cr.sizeWarning ? "border-amber-300" : "border-slate-200"
              }`}
            >
              <div
                onClick={() => onOpenPreview(cr)}
                className="relative h-40 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 p-4 flex flex-col justify-between cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-black/50 text-white backdrop-blur-xs">
                    {cr.creativeCode}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white/15 text-white backdrop-blur-xs tabular-nums">
                    {formatDuration(cr.durationSec)} • {cr.fileSizeMb} MB
                  </span>
                </div>

                <div className="self-center w-11 h-11 rounded-full bg-white/20 group-hover:bg-blue-600 text-white flex items-center justify-center transition-colors backdrop-blur-xs">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono truncate">
                  <span className="truncate">{cr.driveFolderPath}</span>
                  <span>{cr.product?.code}</span>
                </div>
              </div>

              {cr.sizeWarning && (
                <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cảnh báo vàng ({cr.fileSizeMb} MB ≥ 80MB):</strong>{" "}
                    Nên nén lại trước khi đẩy qua <code>file_url</code> để tránh Drive chèn trang quét virus mốc 100MB.
                  </span>
                </div>
              )}

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <select
                      value={cr.lifecycleStatus}
                      onChange={(e) => onChangeLifecycle(cr.id, e.target.value)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer ${statusMeta.badgeClass}`}
                    >
                      <option value="cho_test">Chờ test</option>
                      <option value="dang_chay">Đang chạy</option>
                      <option value="winning">Winning</option>
                      <option value="bao_hoa">Bão hòa</option>
                    </select>
                    <span className="text-[11px] text-slate-500">
                      {cr.mediaCache.length} TK Cache • {cr.posts.length} Post ID
                    </span>
                  </div>
                  <div
                    className="text-xs font-bold text-slate-900 truncate"
                    title={cr.fileName}
                  >
                    {cr.fileName}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    <strong className="text-slate-700">Hook/Angle:</strong>{" "}
                    {cr.hookAngle}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenPreview(cr)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Xem video & Chi tiết
                  </button>
                  <Link
                    href={`/launcher?flow=flow1_drive&creativeId=${cr.id}&product=${
                      cr.product?.code || ""
                    }`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-900 text-white hover:bg-slate-800"
                  >
                    <Rocket className="w-3 h-3" />
                    Đẩy Ads
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
