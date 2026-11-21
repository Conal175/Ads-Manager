import type { UnitEconomicsInput } from "./kpi";

export function parseKpiInput(body: Record<string, unknown>): UnitEconomicsInput | null {
  const limits = { avgSellingPrice: 1_000_000_000_000, cogs: 1_000_000_000_000, shippingPackingFee: 1_000_000_000_000, otherCost: 1_000_000_000_000, expectedReturnRatePct: 90, targetNetMarginPct: 95, targetCloseRatePct: 100 } as const;
  const values: Record<string, number> = {};
  for (const [key, max] of Object.entries(limits)) {
    const raw = key === "otherCost" ? body[key] ?? 0 : body[key];
    if ((typeof raw !== "number" && typeof raw !== "string") || (typeof raw === "string" && !raw.trim())) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > max) return null;
    if (["avgSellingPrice", "cogs", "shippingPackingFee", "otherCost"].includes(key) && !Number.isSafeInteger(value)) return null;
    values[key] = value;
  }
  return values as unknown as UnitEconomicsInput;
}
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
