"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Lock } from "lucide-react";
import { getTodayIso } from "@/lib/format";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { ProductKpiCard } from "@/components/products/ProductKpiCard";
import {
  BudgetPacingModal,
  KpiHistoryModal,
  KpiUpsertModal,
  type ProductFormState,
} from "@/components/products/ProductKpiModals";
import type { ProductWithKpiDTO } from "@/types/domain";

export default function ProductsKpiPage() {
  const [items, setItems] = useState<ProductWithKpiDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithKpiDTO | null>(null);
  const [editForm, setEditForm] = useState({ code: "", name: "", category: "" });
  const [editError, setEditError] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editingKpiProduct, setEditingKpiProduct] =
    useState<ProductWithKpiDTO | null>(null);
  const [historyProduct, setHistoryProduct] =
    useState<ProductWithKpiDTO | null>(null);
  const [editingBudgetProduct, setEditingBudgetProduct] =
    useState<ProductWithKpiDTO | null>(null);

  const [form, setForm] = useState<ProductFormState>({
    code: "",
    name: "",
    category: "Thời trang / Gia dụng",
    effectiveFrom: getTodayIso(),
    avgSellingPrice: 350000,
    cogs: 120000,
    shippingPackingFee: 32000,
    expectedReturnRatePct: 10,
    otherCost: 8000,
    targetNetMarginPct: 20,
    targetCloseRatePct: 25,
    dailyBudgetTarget: 3000000,
    note: "",
  });

  const [budgetForm, setBudgetForm] = useState({
    dailyBudgetTarget: 0,
    weeklyBudgetTarget: 0,
    monthlyBudgetTarget: 0,
  });

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      const json = await res.json();
      setItems(json.products || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openEditProduct = (prod: ProductWithKpiDTO) => {
    setEditingProduct(prod);
    setEditForm({ code: prod.code, name: prod.name, category: prod.category });
    setEditError("");
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || editBusy) return;
    setEditBusy(true);
    setEditError("");
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, expectedCode: editingProduct.code }),
      });
      const json = await res.json();
      if (!res.ok) { setEditError(json.error || "Không thể cập nhật sản phẩm."); return; }
      setEditingProduct(null);
      setBanner(`Đã cập nhật sản phẩm ${json.product.code}.`);
      await loadProducts();
    } catch { setEditError("Không thể kết nối. Vui lòng thử lại."); }
    finally { setEditBusy(false); }
  };

  const openEditKpi = (prod: ProductWithKpiDTO) => {
    const cur = prod.currentKpi;
    setForm({
      code: prod.code,
      name: prod.name,
      category: prod.category,
      effectiveFrom: getTodayIso(),
      avgSellingPrice: cur?.avgSellingPrice ?? 350000,
      cogs: cur?.cogs ?? 120000,
      shippingPackingFee: cur?.shippingPackingFee ?? 32000,
      expectedReturnRatePct: cur?.expectedReturnRatePct ?? 10,
      otherCost: cur?.otherCost ?? 8000,
      targetNetMarginPct: cur?.targetNetMarginPct ?? 20,
      targetCloseRatePct: cur?.targetCloseRatePct ?? 25,
      dailyBudgetTarget: prod.dailyBudgetTarget,
      note: "",
    });
    setEditingKpiProduct(prod);
  };

  const openEditBudget = (prod: ProductWithKpiDTO) => {
    setBudgetForm({
      dailyBudgetTarget: prod.dailyBudgetTarget,
      weeklyBudgetTarget: prod.weeklyBudgetTarget,
      monthlyBudgetTarget: prod.monthlyBudgetTarget,
    });
    setEditingBudgetProduct(prod);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (res.ok) {
      setShowNewProductModal(false);
      setBanner(`Đã thêm sản phẩm ${json.product.code} và khóa bộ 3 chỉ số KPI v1.`);
      await loadProducts();
    } else {
      setBanner(json.error || "Không thể tạo sản phẩm.");
    }
  };

  const handleCreateKpiVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKpiProduct) return;
    const res = await fetch(`/api/products/${editingKpiProduct.id}/kpi-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (res.ok) {
      setEditingKpiProduct(null);
      setBanner(json.message);
      await loadProducts();
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudgetProduct) return;
    const res = await fetch(
      `/api/products/${editingBudgetProduct.id}/kpi-version`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetForm),
      }
    );
    if (res.ok) {
      setEditingBudgetProduct(null);
      setBanner(
        `Đã cập nhật định mức ngân sách (Budget Pacing) cho ${editingBudgetProduct.code}.`
      );
      await loadProducts();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản trị Sản phẩm & Bộ thước đo KPI Tài chính
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Khóa 3 chỉ số chuẩn (CPO hòa vốn, CPO mục tiêu, Giá tin nhắn trần), lưu lịch sử phiên bản KPI theo ngày hiệu lực và theo dõi Budget Pacing.
          </p>
        </div>
        <button
          onClick={() => {
            setForm({
              code: `SP0${items.length + 1}`,
              name: "",
              category: "Sản phẩm chủ lực",
              effectiveFrom: getTodayIso(),
              avgSellingPrice: 350000,
              cogs: 120000,
              shippingPackingFee: 32000,
              expectedReturnRatePct: 10,
              otherCost: 8000,
              targetNetMarginPct: 20,
              targetCloseRatePct: 25,
              dailyBudgetTarget: 3000000,
              note: "Khởi tạo KPI v1",
            });
            setShowNewProductModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Khai báo Sản phẩm mới
        </button>
      </div>

      <FeedbackBanner message={banner} onClose={() => setBanner(null)} />

      <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            1. CPO hòa vốn
          </div>
          <p className="text-slate-600 mt-1">
            Giá bán − (Giá vốn + Phí vận chuyển/đóng gói + Chi phí khác + Phân bổ tỷ lệ hoàn).
          </p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200/70">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            2. CPO mục tiêu
          </div>
          <p className="text-slate-600 mt-1">
            CPO hòa vốn × (% chi phí quảng cáo cho phép sau khi trừ Biên lợi nhuận ròng mong muốn).
          </p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/70">
          <div className="font-bold text-emerald-900 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            3. Giá tin nhắn trần
          </div>
          <p className="text-slate-600 mt-1">
            CPO mục tiêu × Tỷ lệ chốt tin nhắn kỳ vọng (làm chuẩn cho toàn bộ Action Center).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-52 bg-white rounded-xl border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((prod) => (
            <ProductKpiCard
              key={prod.id}
              prod={prod}
              onEditProduct={openEditProduct}
              onOpenHistory={setHistoryProduct}
              onOpenBudget={openEditBudget}
              onOpenNewVersion={openEditKpi}
            />
          ))}
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-product-title">
          <form onSubmit={saveProduct} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 id="edit-product-title" className="text-lg font-bold">Chỉnh sửa sản phẩm</h2>
            <p className="text-sm text-slate-600">Đổi mã không tự sửa tên trên Meta, Sheet hoặc Drive. Mã có dữ liệu liên quan sẽ bị chặn để tránh sai lệch. KPI và ngân sách chỉnh ở mục riêng.</p>
            {([['code', 'Mã sản phẩm'], ['name', 'Tên sản phẩm'], ['category', 'Danh mục']] as const).map(([key, label]) => (
              <label key={key} className="block text-sm font-medium text-slate-700">{label}<input required maxLength={key === 'code' ? 40 : 200} value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            ))}
            {editError && <p role="alert" className="text-sm text-red-700">{editError}</p>}
            <div className="flex justify-end gap-2"><button type="button" disabled={editBusy} onClick={() => setEditingProduct(null)} className="rounded-lg border px-4 py-2 text-sm">Hủy</button><button disabled={editBusy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{editBusy ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>
          </form>
        </div>
      )}

      <KpiUpsertModal
        open={showNewProductModal || Boolean(editingKpiProduct)}
        editingProduct={editingKpiProduct}
        form={form}
        onChange={setForm}
        onSubmit={
          editingKpiProduct ? handleCreateKpiVersion : handleCreateProduct
        }
        onClose={() => {
          setShowNewProductModal(false);
          setEditingKpiProduct(null);
        }}
      />

      <KpiHistoryModal
        product={historyProduct}
        onClose={() => setHistoryProduct(null)}
      />

      <BudgetPacingModal
        product={editingBudgetProduct}
        budgetForm={budgetForm}
        onChange={setBudgetForm}
        onSubmit={handleSaveBudget}
        onClose={() => setEditingBudgetProduct(null)}
      />
    </div>
  );
}
