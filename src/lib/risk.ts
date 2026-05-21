import type { NumberSummary } from "./types";
import type { PayoutRates } from "./rates";
import { maxRiskPerSet } from "./rates";

export type NumberSummaryWithRisk = NumberSummary & {
  maxPayout: number;
};

export function attachRisk(
  rows: NumberSummary[],
  rates: PayoutRates,
): NumberSummaryWithRisk[] {
  const perSet = maxRiskPerSet(rates);
  return rows.map((r) => ({
    ...r,
    maxPayout: r.sets * perSet,
  }));
}

export function totalMaxRisk(rows: NumberSummaryWithRisk[]): number {
  return rows.reduce((s, r) => s + r.maxPayout, 0);
}
