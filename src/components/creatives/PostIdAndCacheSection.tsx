"use client";

import React from "react";
import Link from "next/link";
import { Layers, Download, Copy, Rocket, Database } from "lucide-react";
import type { CreativeDTO, MediaCacheDTO, MetaPostDTO } from "@/types/domain";

interface PostIdAndCacheSectionProps {
  allPosts: MetaPostDTO[];
  allCache: MediaCacheDTO[];
  creativeMapById: Map<number, CreativeDTO>;
  onOpenPullModal: () => void;
  onCopyPostId: (postId: string) => void;
}

export function PostIdAndCacheSection({
  allPosts,
  allCache,
  creativeMapById,
  onOpenPullModal,
  onCopyPostId,
}: PostIdAndCacheSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Kho Bài viết Post ID (<code>meta_posts</code>)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Post ID (<code>{"{page_id}_{post_id}"}</code>) thuộc sở hữu của Fanpage — mọi TKQC có quyền trên Page đều tái sử dụng ngay để dồn tương tác.
            </p>
          </div>
          <button
            onClick={onOpenPullModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Download className="w-3.5 h-3.5" />
            Kéo bài từ Fanpage
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase">
                <th className="py-3 px-4">Creative gốc</th>
                <th className="py-3 px-4">effective_object_story_id</th>
                <th className="py-3 px-4">Phiên bản chữ & Nội dung</th>
                <th className="py-3 px-4">Fanpage & CTA</th>
                <th className="py-3 px-4 text-right">Thao tác nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPosts.map((post) => {
                const cr = post.creativeId
                  ? creativeMapById.get(post.creativeId)
                  : null;
                return (
                  <tr key={post.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900">
                        {cr?.creativeCode || "Chưa gán"}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {post.source === "fanpage_pull"
                          ? "Kéo từ Page"
                          : post.source === "launcher_flow3"
                          ? "Luồng 3 (Test chữ)"
                          : "Luồng 1 (Bài ẩn)"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-blue-700">
                          {post.effectiveObjectStoryId}
                        </code>
                        <button
                          onClick={() => onCopyPostId(post.effectiveObjectStoryId)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Sao chép Post ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {post.advantagePlusDisabled && (
                        <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          Advantage+ Creative: OFF (Khóa Post ID)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <span className="inline-block font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 mb-1">
                        {post.copyVersion}
                      </span>
                      <div className="font-semibold text-slate-900">
                        {post.headline}
                      </div>
                      <p className="text-slate-600 line-clamp-2 mt-0.5">
                        {post.primaryText}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {post.pageName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                        CTA: {post.ctaType}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/launcher?flow=flow2_post_id&postId=${encodeURIComponent(
                          post.effectiveObjectStoryId
                        )}&product=${cr?.product?.code || ""}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Rocket className="w-3.5 h-3.5" />
                        Scale Luồng 2
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            Bộ đệm Video (<code>meta_media_cache</code>)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ánh xạ <code>[creative_id + ad_account_id → meta_video_id]</code> đảm bảo mỗi video chỉ tải từ Google Drive sang 1 tài khoản quảng cáo duy nhất 1 lần.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase">
                <th className="py-2.5 px-4">Mã Creative</th>
                <th className="py-2.5 px-4">Tài khoản Quảng cáo đích</th>
                <th className="py-2.5 px-4">meta_video_id</th>
                <th className="py-2.5 px-4">Trạng thái mã hóa</th>
                <th className="py-2.5 px-4 text-right">Test chữ mới</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allCache.map((m) => {
                const cr = creativeMapById.get(m.creativeId);
                return (
                  <tr key={m.id}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {cr?.creativeCode || `#${m.creativeId}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {m.adAccountMetaId}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                      {m.metaVideoId}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        {m.encodingStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/launcher?flow=flow3_video_id&creativeId=${
                          m.creativeId
                        }&adAccount=${m.adAccountMetaId}&product=${
                          cr?.product?.code || ""
                        }`}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Dùng lại Video ID (Luồng 3) →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
