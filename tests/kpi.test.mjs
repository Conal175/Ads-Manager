import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveKpiForDate, computeProductKpis } from '../src/lib/kpi.ts';
import { parseKpiInput, isValidDate } from '../src/lib/kpi-validation.ts';

test('KPI never applies before effective date and resolves by date then version', () => {
  const versions = [{effectiveFrom: '2026-01-01', versionNumber: 1}, {effectiveFrom: '2026-03-01', versionNumber: 2}, {effectiveFrom: '2026-03-01', versionNumber: 3}];
  assert.equal(resolveKpiForDate(versions, '2025-12-31'), null);
  assert.equal(resolveKpiForDate(versions, '2026-02-01').versionNumber, 1);
  assert.equal(resolveKpiForDate(versions, '2026-03-01').versionNumber, 3);
});
test('validate financial inputs, dates and formula', () => {
  const input = {avgSellingPrice: 100000, cogs: 30000, shippingPackingFee: 10000, otherCost: 0, expectedReturnRatePct: 0, targetNetMarginPct: 10, targetCloseRatePct: 20};
  assert.equal(computeProductKpis(parseKpiInput(input)).targetCpo, 50000);
  for (const value of [-1, 101, null, '', 'NaN']) assert.equal(parseKpiInput({...input, targetCloseRatePct: value}), null);
  assert.equal(parseKpiInput({...input, cogs: 1.2}), null);
  assert.equal(isValidDate('2026-02-29'), false); assert.equal(isValidDate('2024-02-29'), true);
});
