"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, RefreshCw, Film, Flame, DollarSign } from "lucide-react";
import { getDaysAgoIso, getTodayIso } from "@/lib/format";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { HierarchyTreeTable } from "@/components/reports/HierarchyTreeTable";
import { CreativeLeaderboardSection } from "@/components/reports/CreativeLeaderboardSection";
import {
  BreakdownsHeatmapSection,
  type HeatmapDimension,
} from "@/components/reports/BreakdownsHeatmapSection";
import {
  ManualSalesOverrideModal,
  RealProfitSection,
  type SalesOverrideFormState,
} from "@/components/reports/RealProfitSection";
import type {
  BreakdownItem,
  CampaignHierarchyNode,
  CreativeLeaderboardRow,
  RealProfitRow,
} from "@/types/domain";

function ReportsInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<
    "hierarchy" | "creatives" | "breakdowns" | "profit"
  >("hierarchy");
  const [startDate, setStartDate] = useState(getDaysAgoIso(6));
  const [endDate, setEndDate] = useState(getTodayIso());
  const [adAccount, setAdAccount] = useState("ALL");
  const [productCode, setProductCode] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [products, setProducts] = useState<
    Array<{ id: number; code: string; name: string }>
  >([]);
  const [adAccounts, setAdAccounts] = useState<
    Array<{ metaId: string; name: string }>
  >([]);
  const [hierarchy, setHierarchy] = useState<CampaignHierarchyNode[]>([]);
  const [creativeLeaderboard, setCreativeLeaderboard] = useState<
    CreativeLeaderboardRow[]
  >([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownItem[]>([]);
  const [profitRows, setProfitRows] = useState<RealProfitRow[]>([]);

  const [expandedCampaigns, setExpandedCampaigns] = useState<
    Record<string, boolean>
  >({});
  const [expandedAdsets, setExpandedAdsets] = useState<Record<string, boolean>>(
    {}
  );
  const [heatmapDim, setHeatmapDim] = useState<HeatmapDimension>("hour");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const [showSalesModal, setShowSalesModal] = useState(false);
  const [salesForm, setSalesForm] = useState<SalesOverrideFormState>({
    reportDate: getTodayIso(),
    productId: "",
    ordersClosed: 45,
    actualRevenue: 17550000,
    returnedOrders: 4,
    note: "Cập nhật chốt ca tối trên web",
  });

  useEffect(() => {
    const qTab = searchParams.get("tab");
    if (
      qTab === "hierarchy" ||
      qTab === "creatives" ||
      qTab === "breakdowns" ||
      qTab === "profit"
    ) {
      setTab(qTab);
    }
  }, [searchParams]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        startDate,
        endDate,
        adAccount,
        productCode,
        status: statusFilter,
      });
      const res = await fetch(`/api/reports?${qs.toString()}`);
      const json = await res.json();
      setProducts(json.products || []);
      setAdAccounts(json.adAccounts || []);
      setHierarchy(json.hierarchy || []);
      setCreativeLeaderboard(json.creativeLeaderboard || []);
      setBreakdowns(json.breakdowns || []);
      setProfitRows(json.profitRows || []);

      if ((json.hierarchy || []).length > 0) {
        const firstCmp = json.hierarchy[0];
        setExpandedCampaigns((prev) => ({
          ...prev,
          [firstCmp.campaignMetaId]: true,
        }));
        if (firstCmp.adsets.length > 0) {
          setExpandedAdsets((prev) => ({
            ...prev,
            [firstCmp.adsets[0].adsetMetaId]: true,
          }));
        }
      }
      if ((json.products || []).length > 0 && !salesForm.productId) {
        setSalesForm((prev) => ({
          ...prev,
          productId: String(json.products[0].id),
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [
    startDate,
    endDate,
    adAccount,
    productCode,
    statusFilter,
    salesForm.productId,
  ]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleRefreshNow = async () => {
    setRefreshing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh_insights" }),
      });
      const json = await res.json();
      if (res.ok) {
        setBanner(json.message);
        await loadReports();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncSheets = async () => {
    setRefreshing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_sheets" }),
      });
      const json = await res.json();
      if (res.ok) {
        setBanner(json.message);
        await loadReports();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveManualSales = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert_sales",
        ...salesForm,
        productId: Number(salesForm.productId),
      }),
    });
    if (res.ok) {
      setShowSalesModal(false);
      setBanner(
        `Đã lưu đối soát doanh thu thực ngày ${salesForm.reportDate} & tự động tính lại Lợi nhuận ròng.`
      );
      await loadReports();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Trung tâm Báo cáo Đa tầng & Đối soát Lợi nhuận thực
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Truy vấn tức thì từ PostgreSQL nội bộ (không nghẽn Rate Limit Meta). Ghép đúng phiên bản KPI theo từng ngày.
          </p>
        </div>
        <button
          onClick={handleRefreshNow}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-60"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Đang đồng bộ..." : "Làm mới ngay"}
        </button>
      </div>

      <FeedbackBanner message={banner} onClose={() => setBanner(null)} />

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 gap-1">
            {[
              { id: "hierarchy" as const, label: "Insights 3 Cấp", icon: BarChart3 },
              { id: "creatives" as const, label: "Creative Xuyên TK", icon: Film },
              { id: "breakdowns" as const, label: "Heatmap Lát cắt", icon: Flame },
              {
                id: "profit" as const,
                label: "Đối soát Lợi nhuận thực",
                icon: DollarSign,
              },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    tab === t.id
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
            />
            <select
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="ALL">Tất cả SP</option>
              {products.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code}
                </option>
              ))}
            </select>
            <select
              value={adAccount}
              onChange={(e) => setAdAccount(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="ALL">Tất cả TKQC</option>
              {adAccounts.map((a) => (
                <option key={a.metaId} value={a.metaId}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="ACTIVE">Đang chạy</option>
              <option value="PAUSED">Tạm dừng</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-72 bg-white rounded-xl border border-slate-200 animate-pulse" />
      ) : tab === "hierarchy" ? (
        <HierarchyTreeTable
          hierarchy={hierarchy}
          expandedCampaigns={expandedCampaigns}
          expandedAdsets={expandedAdsets}
          onToggleCampaign={(id) =>
            setExpandedCampaigns((prev) => ({ ...prev, [id]: !prev[id] }))
          }
          onToggleAdset={(id) =>
            setExpandedAdsets((prev) => ({ ...prev, [id]: !prev[id] }))
          }
        />
      ) : tab === "creatives" ? (
        <CreativeLeaderboardSection rows={creativeLeaderboard} />
      ) : tab === "breakdowns" ? (
        <BreakdownsHeatmapSection
          breakdowns={breakdowns}
          heatmapDim={heatmapDim}
          onChangeDim={setHeatmapDim}
        />
      ) : (
        <RealProfitSection
          profitRows={profitRows}
          refreshing={refreshing}
          onSyncSheets={handleSyncSheets}
          onOpenManualModal={() => setShowSalesModal(true)}
        />
      )}

      <ManualSalesOverrideModal
        open={showSalesModal}
        products={products}
        form={salesForm}
        onChange={setSalesForm}
        onSubmit={handleSaveManualSales}
        onClose={() => setShowSalesModal(false)}
      />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 bg-white rounded-xl border border-slate-200 animate-pulse" />
      }
    >
      <ReportsInner />
    </Suspense>
  );
}
