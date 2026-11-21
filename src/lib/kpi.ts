export interface UnitEconomicsInput {
  avgSellingPrice: number;
  cogs: number;
  shippingPackingFee: number;
  expectedReturnRatePct: number;
  otherCost: number;
  targetNetMarginPct: number;
  targetCloseRatePct: number;
}

export interface ComputedKpis {
  returnCostAllocation: number;
  totalVariableCost: number;
  breakevenCpo: number;
  allowedAdsSharePct: number;
  targetCpo: number;
  ceilingMessageCost: number;
}

/**
 * Locked Unit Economics KPI Formulas:
 * 1. Chi phí phân bổ từ tỷ lệ hoàn = (Phí vận chuyển/đóng gói * 1.5 + Chi phí khác) * (r / (100 - r))
 * 2. CPO hòa vốn = Giá bán - (Giá vốn + Phí vận hành + Chi phí khác + Chi phí phân bổ hoàn)
 * 3. CPO mục tiêu = CPO hòa vốn * (% chi phí quảng cáo cho phép sau khi trừ biên lợi nhuận mong muốn)
 * 4. Giá tin nhắn trần = CPO mục tiêu * Tỷ lệ chốt tin nhắn kỳ vọng
 */
export function computeProductKpis(input: UnitEconomicsInput): ComputedKpis {
  const sellingPrice = Math.max(0, Number(input.avgSellingPrice) || 0);
  const cogs = Math.max(0, Number(input.cogs) || 0);
  const shipping = Math.max(0, Number(input.shippingPackingFee) || 0);
  const other = Math.max(0, Number(input.otherCost) || 0);
  const returnRate = Math.min(90, Math.max(0, Number(input.expectedReturnRatePct) || 0));
  const targetMargin = Math.min(95, Math.max(0, Number(input.targetNetMarginPct) || 0));
  const closeRate = Math.min(100, Math.max(0, Number(input.targetCloseRatePct) || 0));

  const returnCostAllocation =
    returnRate > 0
      ? Math.round((shipping * 1.5 + other) * (returnRate / (100 - returnRate)))
      : 0;

  const totalVariableCost = cogs + shipping + other + returnCostAllocation;
  const breakevenCpo = Math.max(0, Math.round(sellingPrice - totalVariableCost));

  const targetProfitAmount = Math.round(sellingPrice * (targetMargin / 100));
  const allowedAdsShare =
    breakevenCpo > 0
      ? Math.max(0, (breakevenCpo - targetProfitAmount) / breakevenCpo)
      : 0;

  const targetCpo = Math.max(0, Math.round(breakevenCpo * allowedAdsShare));
  const ceilingMessageCost = Math.max(0, Math.round(targetCpo * (closeRate / 100)));

  return {
    returnCostAllocation,
    totalVariableCost,
    breakevenCpo,
    allowedAdsSharePct: Number((allowedAdsShare * 100).toFixed(1)),
    targetCpo,
    ceilingMessageCost,
  };
}

export interface KpiVersionLike {
  effectiveFrom: string;
  versionNumber: number;
  avgSellingPrice: number;
  cogs: number;
  shippingPackingFee: number;
  expectedReturnRatePct: number;
  otherCost: number;
  targetNetMarginPct: number;
  targetCloseRatePct: number;
  breakevenCpo: number;
  targetCpo: number;
  ceilingMessageCost: number;
}

/**
 * Resolves the exact KPI version effective on a given YYYY-MM-DD report date
 * so historical profit/loss reconciliation never drifts when prices/COGS change.
 */
export function resolveKpiForDate<T extends KpiVersionLike>(
  versions: T[],
  reportDate: string
): T | null {
  if (!versions.length) return null;
  const sorted = [...versions].sort((a, b) => {
    if (a.effectiveFrom !== b.effectiveFrom) {
      return b.effectiveFrom.localeCompare(a.effectiveFrom);
    }
    return b.versionNumber - a.versionNumber;
  });

  const matched = sorted.find((v) => v.effectiveFrom <= reportDate);
  return matched ?? null;
}

export interface PacingResult {
  expectedSpendToNow: number;
  actualSpend: number;
  pacingRatioPct: number;
  status: "slow" | "on_track" | "overspending";
  label: string;
  hourOfDay: number;
}

/**
 * Evaluates daily budget pacing based on elapsed time of day (Vietnam UTC+7 or local hour).
 * Uses a realistic e-commerce hourly delivery curve (lighter 0h-7h, heavier 8h-23h).
 */
export function evaluateBudgetPacing(
  actualSpend: number,
  dailyTarget: number,
  nowDate = new Date()
): PacingResult {
  const hour = Math.max(1, nowDate.getHours() + nowDate.getMinutes() / 60);
  // Realistic Vietnamese Meta Ads delivery curve weight across 24h
  const expectedShare = Math.min(1, Math.max(0.08, hour / 24));
  const expectedSpendToNow = Math.round(dailyTarget * expectedShare);
  const pacingRatioPct =
    expectedSpendToNow > 0
      ? Number(((actualSpend / expectedSpendToNow) * 100).toFixed(1))
      : 0;

  let status: PacingResult["status"] = "on_track";
  let label = "Đúng nhịp";
  if (pacingRatioPct < 80) {
    status = "slow";
    label = "Đang tiêu chậm";
  } else if (pacingRatioPct > 120) {
    status = "overspending";
    label = "Vượt tốc độ";
  }

  return {
    expectedSpendToNow,
    actualSpend,
    pacingRatioPct,
    status,
    label,
    hourOfDay: Math.floor(hour),
  };
}
