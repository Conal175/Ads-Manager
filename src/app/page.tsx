"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Target,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Bell,
  Code2,
  ShieldAlert,
  Clock,
} from "lucide-react";
import {
  formatCompactVnd,
  formatDateTimeVi,
  formatVnd,
  getMetaAccountStatusInfo,
} from "@/lib/format";

interface DashboardData {
  briefing: {
    id: number;
    briefingDate: string;
    summaryHeadline: string;
    winsJson: Array<{ title: string; metric: string; detail: string }>;
    lossesJson: Array<{
      title: string;
      metric: string;
      detail: string;
      actionPath?: string;
    }>;
    budgetPlanJson: Array<{
      productCode: string;
      currentBudget: number;
      recommendedBudget: number;
      rationale: string;
    }>;
    compactInputJson: Record<string, unknown>;
    providerUsed: string;
    sentToTelegram: boolean;
    createdAt: string;
  } | null;
  summary: {
    totalSpend7d: number;
    todaySpendTotal: number;
    totalRevenue7d: number;
    totalOrders7d: number;
    totalMessages7d: number;
    totalNetProfit7d: number;
    actualCpo7d: number;
    cirPct7d: number;
  };
  pacingByProduct: Array<{
    productId: number;
    productCode: string;
    productName: string;
    dailyBudgetTarget: number;
    expectedSpendToNow: number;
    actualSpend: number;
    pacingRatioPct: number;
    status: "slow" | "on_track" | "overspending";
    label: string;
    hourOfDay: number;
  }>;
  actionCounts: {
    total: number;
    kill: number;
    scale: number;
    fatigue: number;
    leakage: number;
  };
  topActions: Array<{
    id: number;
    category: string;
    title: string;
    description: string;
    productCode: string;
    wastedSpend: number;
  }>;
  unhealthyAccounts: Array<{
    id: number;
    metaId: string;
    name: string;
    accountStatus: number;
    disableReason: string;
    fundingSourceDetails: string;
  }>;
  monitoredAccountsCount: number;
  totalAccountsCount: number;
  systemHealth: {
    metaRateLimitPct: number;
    throttleMode: boolean;
  };
  recentAlerts: Array<{
    id: number;
    streamType: string;
    title: string;
    deepLinkPath: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showCompactJson, setShowCompactJson] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không thể tải dữ liệu.");
      setData(json);
      setLoadError(null);
    } catch {
      setLoadError("Không thể tải dữ liệu. Vui lòng kiểm tra kết nối cơ sở dữ liệu rồi thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRegenerateBriefing = async () => {
    setRegenerating(true);
    setToast(null);
    try {
      const res = await fetch("/api/briefings", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setToast(json.message || "Đã tạo mới Bản tin AI Briefing.");
        await loadDashboard();
      } else {
        setToast(json.error || "Không thể tạo bản tin AI.");
      }
    } catch {
      setToast("Không thể kết nối để tạo bản tin AI.");
    } finally {
      setRegenerating(false);
    }
  };

  if (!loading && (loadError || !data)) {
    return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{loadError || "Không có dữ liệu."} <button className="ml-2 underline" onClick={() => { setLoading(true); void loadDashboard(); }}>Thử lại</button></div>;
  }

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 rounded-lg" />
        <div className="h-56 bg-white border border-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { briefing, summary, pacingByProduct, actionCounts, unhealthyAccounts } = data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Trung tâm Điều hành & AI Briefing
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Theo dõi lợi nhuận thực, tốc độ tiêu ngân sách (Budget Pacing) và đề xuất hành động hàng ngày.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/system"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              data.systemHealth.throttleMode
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            API Meta: <strong className="tabular-nums">{data.systemHealth.metaRateLimitPct}%</strong>
          </Link>
          <Link
            href="/launcher"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            Lên Ads mới (PAUSED)
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {toast && (
        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {toast}
          </span>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Critical Unhealthy Ad Account Strip */}
      {unhealthyAccounts.length > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-red-900">
                Cảnh báo đỏ: {unhealthyAccounts.length} Tài khoản quảng cáo đang gặp sự cố (account_status ≠ 1)
              </div>
              <div className="text-xs text-red-700 mt-1 space-y-0.5">
                {unhealthyAccounts.map((acc) => {
                  const st = getMetaAccountStatusInfo(acc.accountStatus);
                  return (
                    <div key={acc.id}>
                      • <strong>{acc.name}</strong> ({acc.metaId}):{" "}
                      <span className="font-semibold">{st.label}</span> — {acc.fundingSourceDetails}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <Link
            href="/assets"
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
          >
            Xử lý Tài sản ngay
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 4 Primary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Chi tiêu Ads (7 ngày)</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
            {formatCompactVnd(summary.totalSpend7d)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
            <span>Hôm nay: <strong className="text-slate-700 tabular-nums">{formatCompactVnd(summary.todaySpendTotal)}</strong></span>
            <span>{data.monitoredAccountsCount}/{data.totalAccountsCount} TK</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Doanh thu thực (Sheets 7d)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
            {formatCompactVnd(summary.totalRevenue7d)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
            <span>{summary.totalOrders7d} đơn chốt</span>
            <span className="font-medium text-blue-700">CIR: {summary.cirPct7d}%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Lợi nhuận ròng ước tính (7d)</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div
            className={`text-2xl font-bold tabular-nums mt-2 ${
              summary.totalNetProfit7d >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {summary.totalNetProfit7d >= 0 ? "+" : ""}
            {formatCompactVnd(summary.totalNetProfit7d)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Khớp đúng phiên bản KPI lịch sử từng ngày
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>CPO thực tế & Đề xuất mở</span>
            <Target className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-2">
            {formatVnd(summary.actualCpo7d)}
          </div>
          <div className="text-xs mt-1.5 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold">
              {actionCounts.kill} Cắt lỗ
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
              {actionCounts.scale} Scale
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
              {actionCounts.fatigue + actionCounts.leakage} Tối ưu
            </span>
          </div>
        </div>
      </div>

      {/* AI Morning Briefing Hero Section */}
      {briefing && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/40 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Bản tin nhận định AI đầu ngày (07:30)
                  </h2>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {briefing.providerUsed}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Cập nhật: {formatDateTimeVi(briefing.createdAt)} • Đã gửi bản sao Telegram
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCompactJson(!showCompactJson)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
              >
                <Code2 className="w-3.5 h-3.5" />
                {showCompactJson ? "Ẩn gói JSON tinh gọn" : "Xem gói JSON gửi AI"}
              </button>
              <button
                onClick={handleRegenerateBriefing}
                disabled={regenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                {regenerating ? "Đang tổng hợp..." : "Tạo lại bản tin"}
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 text-sm text-slate-800 leading-relaxed font-medium">
              {briefing.summaryHeadline}
            </div>

            {showCompactJson && (
              <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
                <div className="text-slate-400 mb-1.5">
                  // Gói JSON tinh gọn gửi sang AI API (loại bỏ dữ liệu thô dư thừa để tiết kiệm token & tăng độ chính xác)
                </div>
                <pre>{JSON.stringify(briefing.compactInputJson, null, 2)}</pre>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 3 Wins */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  3 Điểm đang thắng lớn nhất
                </div>
                <div className="space-y-3">
                  {briefing.winsJson.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white border border-emerald-100 shadow-2xs"
                    >
                      <div className="text-xs font-bold text-slate-900">{w.title}</div>
                      <div className="text-[11px] font-semibold text-emerald-700 mt-0.5 tabular-nums">
                        {w.metric}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {w.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 Losses */}
              <div className="rounded-xl border border-red-200/80 bg-red-50/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-red-800">
                  <XCircle className="w-4 h-4 text-red-600" />
                  3 Điểm lỗ cần xử lý ngay
                </div>
                <div className="space-y-3">
                  {briefing.lossesJson.map((l, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white border border-red-100 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-bold text-slate-900">{l.title}</div>
                        {l.actionPath && (
                          <Link
                            href={l.actionPath}
                            className="shrink-0 text-[11px] font-semibold text-red-600 hover:underline"
                          >
                            Xử lý →
                          </Link>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-red-700 mt-0.5 tabular-nums">
                        {l.metric}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {l.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget Allocation Plan */}
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
                  <Target className="w-4 h-4 text-blue-600" />
                  Đề xuất phân bổ ngân sách hôm nay
                </div>
                <div className="space-y-3">
                  {briefing.budgetPlanJson.map((bp, idx) => {
                    const diffPct =
                      bp.currentBudget > 0
                        ? Math.round(
                            ((bp.recommendedBudget - bp.currentBudget) /
                              bp.currentBudget) *
                              100
                          )
                        : 0;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-white border border-blue-100 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            {bp.productCode}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                              diffPct > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : diffPct < 0
                                ? "bg-red-50 text-red-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 mt-1 tabular-nums">
                          {formatCompactVnd(bp.currentBudget)} →{" "}
                          <strong className="text-blue-700">
                            {formatCompactVnd(bp.recommendedBudget)}/ngày
                          </strong>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {bp.rationale}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bottom 2-Column Grid: Budget Pacing + Action Center & Telegram Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Budget Pacing */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Định mức ngân sách hôm nay (Budget Pacing)
              </h2>
              <p className="text-xs text-slate-500">
                So sánh chi tiêu lũy kế đến giờ hiện tại với đường định mức chuẩn trong ngày
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Chỉnh định mức →
            </Link>
          </div>

          <div className="space-y-4">
            {pacingByProduct.map((p) => {
              const spendPctOfDaily =
                p.dailyBudgetTarget > 0
                  ? Math.min(100, Math.round((p.actualSpend / p.dailyBudgetTarget) * 100))
                  : 0;
              const expectedPctOfDaily =
                p.dailyBudgetTarget > 0
                  ? Math.min(
                      100,
                      Math.round((p.expectedSpendToNow / p.dailyBudgetTarget) * 100)
                    )
                  : 0;
              const badgeClass =
                p.status === "overspending"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : p.status === "slow"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200";
              const barColor =
                p.status === "overspending"
                  ? "bg-red-500"
                  : p.status === "slow"
                  ? "bg-amber-500"
                  : "bg-emerald-500";

              return (
                <div
                  key={p.productId}
                  className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 mr-2">
                        {p.productCode}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {p.productName}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}`}
                    >
                      {p.label} ({p.pacingRatioPct}%)
                    </span>
                  </div>

                  {/* Progress bar with elapsed-hour marker */}
                  <div className="relative h-2.5 bg-slate-200 rounded-full overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${spendPctOfDaily}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-900"
                      style={{ left: `${expectedPctOfDaily}%` }}
                      title={`Định mức chuẩn đến ${p.hourOfDay}h: ${formatVnd(p.expectedSpendToNow)}`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 tabular-nums">
                    <span>
                      Đã tiêu: <strong className="text-slate-900">{formatVnd(p.actualSpend)}</strong>
                    </span>
                    <span>
                      Chuẩn đến {p.hourOfDay}h: <strong>{formatVnd(p.expectedSpendToNow)}</strong> / Mục tiêu ngày:{" "}
                      <strong>{formatVnd(p.dailyBudgetTarget)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Action Center Preview + Telegram Feed */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Đề xuất Hành động đang mở ({actionCounts.total})
              </h2>
              <Link
                href="/actions"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Xem tất cả →
              </Link>
            </div>
            <div className="space-y-2.5">
              {data.topActions.map((act) => {
                const catStyle: Record<string, string> = {
                  kill: "bg-red-50 text-red-700 border-red-200",
                  scale: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  fatigue: "bg-amber-50 text-amber-800 border-amber-200",
                  leakage: "bg-purple-50 text-purple-700 border-purple-200",
                };
                const catLabel: Record<string, string> = {
                  kill: "Cắt lỗ",
                  scale: "Mở rộng",
                  fatigue: "Bão hòa",
                  leakage: "Rò rỉ",
                };
                return (
                  <Link
                    key={act.id}
                    href="/actions"
                    className="block p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          catStyle[act.category] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {catLabel[act.category] || act.category} • {act.productCode}
                      </span>
                      {act.wastedSpend > 0 && (
                        <span className="text-xs font-bold text-red-600 tabular-nums">
                          -{formatCompactVnd(act.wastedSpend)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mt-1.5 line-clamp-1">
                      {act.title}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                Nhật ký Telegram gần nhất
              </h2>
              <Link
                href="/system"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Chi tiết →
              </Link>
            </div>
            <div className="space-y-2">
              {data.recentAlerts.slice(0, 3).map((al) => (
                <Link
                  key={al.id}
                  href={al.deepLinkPath || "/"}
                  className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {al.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {al.streamType === "realtime" ? "Luồng khẩn cấp" : "Luồng định kỳ"} •{" "}
                      {formatDateTimeVi(al.createdAt)}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
