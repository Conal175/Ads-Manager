"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { DriveCreativeGrid } from "@/components/creatives/DriveCreativeGrid";
import { PostIdAndCacheSection } from "@/components/creatives/PostIdAndCacheSection";
import {
  AddDriveCreativeModal,
  DriveVideoPreviewModal,
  PullFanpagePostModal,
  type NewCreativeFormState,
} from "@/components/creatives/CreativeModals";
import type { CreativeDTO, MediaCacheDTO, MetaPostDTO } from "@/types/domain";
import type { DriveSelection } from "@/lib/drive-import-plan";

export default function CreativesHubPage() {
  const [tab, setTab] = useState<"drive" | "cache_posts">("drive");
  const [creativesList, setCreativesList] = useState<CreativeDTO[]>([]);
  const [allPosts, setAllPosts] = useState<MetaPostDTO[]>([]);
  const [allCache, setAllCache] = useState<MediaCacheDTO[]>([]);
  const [productsList, setProductsList] = useState<
    Array<{ id: number; code: string; name: string }>
  >([]);
  const [fanpages, setFanpages] = useState<
    Array<{ metaId: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [previewingDrive, setPreviewingDrive] = useState(false);
  const [drivePreview, setDrivePreview] = useState<{files: Array<DriveSelection & {status:string}>; warnings:string[]; counts:Record<string, number>} | null>(null);
  const [selectedDriveIds, setSelectedDriveIds] = useState<string[]>([]);
  const [importingDrive, setImportingDrive] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const [filterProduct, setFilterProduct] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [previewCreative, setPreviewCreative] = useState<CreativeDTO | null>(
    null
  );
  const [showPullPostModal, setShowPullPostModal] = useState(false);
  const [showAddCreativeModal, setShowAddCreativeModal] = useState(false);

  const [pullForm, setPullForm] = useState({
    pageMetaId: "109283746501",
    creativeId: "",
    copyVersion: "Bài Page Công Khai",
    ctaType: "SEND_MESSAGE",
  });

  const [newCreative, setNewCreative] = useState<NewCreativeFormState>({
    creativeCode: "",
    productId: "",
    driveFileId: "",
    driveFolderPath: `Kho_Ads/SP01/${new Date().toISOString().slice(0, 7)}`,
    fileName: "",
    fileSizeMb: 45,
    durationSec: 35,
    hookAngle: "",
  });

  const loadData = useCallback(async () => {
    try {
      const [crRes, assetsRes] = await Promise.all([
        fetch("/api/creatives"),
        fetch("/api/assets"),
      ]);
      const crJson = await crRes.json();
      const assetsJson = await assetsRes.json();
      setCreativesList(crJson.creatives || []);
      setAllPosts(crJson.posts || []);
      setAllCache(crJson.mediaCache || []);
      setProductsList(crJson.products || []);
      const pages = (assetsJson.assets || []).filter(
        (a: { assetType: string }) => a.assetType === "fanpage"
      );
      setFanpages(pages);
      if (pages.length > 0) {
        setPullForm((prev) => ({ ...prev, pageMetaId: pages[0].metaId }));
      }
      if ((crJson.products || []).length > 0) {
        setNewCreative((prev) => ({
          ...prev,
          productId: String(crJson.products[0].id),
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const driveStatusLabel: Record<string, string> = {new:"Mới", existing:"Đã có", unknown_product:"Chưa có sản phẩm", product_conflict:"Khác sản phẩm đã lưu", duplicate_file:"Trùng ID file", ambiguous_product:"Mã sản phẩm không duy nhất"};
  const handlePreviewDrive = async () => {
    setPreviewingDrive(true); setBanner(null); setDrivePreview(null); setSelectedDriveIds([]);
    try {
      const res = await fetch("/api/creatives", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"preview_drive"})});
      const json = await res.json();
      if (!res.ok) setBanner(json.error || "Không thể xem trước Drive.");
      else { setDrivePreview(json); setBanner(json.message); }
    } catch { setBanner("Không thể kết nối để xem trước Drive."); }
    finally { setPreviewingDrive(false); }
  };

  const handleImportDrive = async () => {
    if (!drivePreview || importingDrive || !selectedDriveIds.length) return;
    const selected = drivePreview.files.filter(f => selectedDriveIds.includes(f.id));
    if (!window.confirm(`Nhập metadata của ${selected.length} media đã chọn vào kho? File vẫn nằm trên Drive; không ghi Sheet hoặc Meta.`)) return;
    setImportingDrive(true); setBanner(null);
    try {
      const res = await fetch('/api/creatives/import-drive', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({confirm:true, selected}) });
      const json = await res.json();
      if (!res.ok) { setBanner(json.error || 'Không thể nhập metadata.'); return; }
      setDrivePreview(null); setSelectedDriveIds([]); setBanner(json.message); await loadData();
    } catch { setBanner('Không thể xác nhận kết quả. Hãy tải lại kho và xem trước Drive để kiểm tra trước khi thử lại.'); }
    finally { setImportingDrive(false); }
  };

  const handleLifecycleChange = async (
    creativeId: number,
    lifecycleStatus: string
  ) => {
    const res = await fetch("/api/creatives", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: creativeId, lifecycleStatus }),
    });
    if (res.ok) {
      setCreativesList((prev) =>
        prev.map((c) => (c.id === creativeId ? { ...c, lifecycleStatus } : c))
      );
      setBanner("Đã cập nhật trạng thái vòng đời Creative.");
    }
  };

  const handlePullFromFanpage = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/meta-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "pull_from_fanpage",
        pageMetaId: pullForm.pageMetaId,
        creativeId: pullForm.creativeId ? Number(pullForm.creativeId) : null,
        copyVersion: pullForm.copyVersion,
        ctaType: pullForm.ctaType,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setShowPullPostModal(false);
      setBanner(json.message);
      await loadData();
    }
  };

  const handleAddManualCreative = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/creatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCreative),
    });
    if (res.ok) {
      setShowAddCreativeModal(false);
      setBanner("Đã thêm siêu dữ liệu Creative Drive vào PostgreSQL.");
      await loadData();
    }
  };

  const filteredCreatives = creativesList.filter((c) => {
    if (filterProduct !== "ALL" && c.product?.code !== filterProduct)
      return false;
    if (filterStatus !== "ALL" && c.lifecycleStatus !== filterStatus)
      return false;
    return true;
  });

  const creativeMapById = new Map(creativesList.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kho Creative Google Drive & Kho Post ID (Cơ chế Lai)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ads Manager là nguồn dữ liệu chính. CSV là bản chụp để nhập vào Sheets, không tự đồng bộ. PostgreSQL chỉ lưu siêu dữ liệu (0 byte video). Quản lý Bộ đệm Video (<code>meta_media_cache</code>) & Kho bài viết (<code>meta_posts</code>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-200/70 p-1">
            <button
              onClick={() => setTab("drive")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                tab === "drive"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Kho Drive ({creativesList.length})
            </button>
            <button
              onClick={() => setTab("cache_posts")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                tab === "cache_posts"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Cache & Post ID ({allPosts.length})
            </button>
          </div>
          <a href="/creatives/sheet-preview" className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700">Đối chiếu Sheet media</a>
          <a href="/api/creatives/export" download="danh-muc-media.csv"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
            Xuất danh mục CSV
          </a>
          <button onClick={handlePreviewDrive} disabled={previewingDrive || importingDrive}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            {previewingDrive ? "Đang đọc Drive..." : "Xem trước Drive"}
          </button>
        </div>
      </div>

      <FeedbackBanner message={banner} onClose={() => setBanner(null)} />
      {drivePreview && <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex justify-between gap-3"><h2 className="font-semibold">Xem trước Drive: {drivePreview.files.length} file — chưa nhập dữ liệu</h2><button onClick={() => setDrivePreview(null)} className="text-blue-700">Đóng</button></div>
        <p className="mt-2 text-slate-500">Chỉ hiển thị 100 file đầu. Ảnh và video theo cấu trúc mã sản phẩm/tháng; không thay đổi file hoặc cơ sở dữ liệu.</p>
        <p className="mt-2 text-slate-600">{Object.entries(drivePreview.counts).map(([status,count]) => `${driveStatusLabel[status] ?? status}: ${count}`).join(" · ")}</p>
        <ul className="mt-3 max-h-64 overflow-auto divide-y divide-slate-100">{drivePreview.files.slice(0, 100).map((f,i) => <li key={`${f.id}-${i}`} className="py-2 break-all"><label><input type="checkbox" className="mr-2" disabled={f.status !== 'new' || importingDrive || (!selectedDriveIds.includes(f.id) && selectedDriveIds.length >= 50)} checked={selectedDriveIds.includes(f.id)} onChange={e => setSelectedDriveIds(current => e.target.checked ? [...current, f.id] : current.filter(id => id !== f.id))} />{f.productCode} / {f.month} / {f.name} <span className="text-slate-400">({f.mimeType})</span> — {driveStatusLabel[f.status] ?? f.status}{f.sizeBytes && Number(f.sizeBytes) >= 80_000_000 ? ' · ≥ 80 MB' : ''}</label></li>)}</ul>
        <p className="mt-3 text-slate-500">Chọn tối đa 50 file mới mỗi lần. Tên file phải bắt đầu bằng mã media duy nhất, ví dụ M001_ten.mp4. Nếu có file đổi hoặc trùng, toàn bộ lượt nhập sẽ dừng.</p>
        <button type="button" onClick={handleImportDrive} disabled={!selectedDriveIds.length || importingDrive || previewingDrive} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{importingDrive ? 'Đang nhập…' : `Nhập metadata đã chọn (${selectedDriveIds.length})`}</button>
        {drivePreview.warnings.length > 0 && <details className="mt-3 text-amber-700"><summary>{drivePreview.warnings.length} mục bị bỏ qua</summary><ul className="max-h-40 overflow-auto">{drivePreview.warnings.slice(0,100).map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
      </section>}


      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : tab === "drive" ? (
        <DriveCreativeGrid
          creatives={filteredCreatives}
          allCreativesCount={creativesList.length}
          sizeWarningCount={creativesList.filter((c) => c.sizeWarning).length}
          productsList={productsList}
          filterProduct={filterProduct}
          filterStatus={filterStatus}
          onChangeFilterProduct={setFilterProduct}
          onChangeFilterStatus={setFilterStatus}
          onChangeLifecycle={handleLifecycleChange}
          onOpenPreview={setPreviewCreative}
          onOpenAddModal={() => setShowAddCreativeModal(true)}
        />
      ) : (
        <PostIdAndCacheSection
          allPosts={allPosts}
          allCache={allCache}
          creativeMapById={creativeMapById}
          onOpenPullModal={() => setShowPullPostModal(true)}
          onCopyPostId={(id) => {
            navigator.clipboard?.writeText(id);
            setBanner(`Đã sao chép Post ID ${id}`);
          }}
        />
      )}

      <DriveVideoPreviewModal
        creative={previewCreative}
        onClose={() => setPreviewCreative(null)}
      />

      <PullFanpagePostModal
        open={showPullPostModal}
        fanpages={fanpages}
        creativesList={creativesList}
        form={pullForm}
        onChange={setPullForm}
        onSubmit={handlePullFromFanpage}
        onClose={() => setShowPullPostModal(false)}
      />

      <AddDriveCreativeModal
        open={showAddCreativeModal}
        productsList={productsList}
        form={newCreative}
        onChange={setNewCreative}
        onSubmit={handleAddManualCreative}
        onClose={() => setShowAddCreativeModal(false)}
      />
    </div>
  );
}
