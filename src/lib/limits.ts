import type { PayoutRates } from "./rates";
import { maxRiskPerSet } from "./rates";
import type { NumberSummary } from "./types";

export type NumberCap = {
  maxRisk: number | null;
  maxSets: number | null;
};

export type RiskLimitsConfig = {
  /** เพดานความเสี่ยงจ่ายต่อเลข (ทั้งบ้าน) — null = ไม่จำกัด */
  defaultMaxRisk: number | null;
  /** จำกัดจำนวนชุดต่อเลข — null = ไม่จำกัด */
  defaultMaxSets: number | null;
  /** ตั้งเฉพาะเลข */
  perNumber: Record<string, NumberCap>;
};

export const DEFAULT_LIMITS: RiskLimitsConfig = {
  defaultMaxRisk: null,
  defaultMaxSets: null,
  perNumber: {},
};

export type LimitStatus = "ok" | "warning" | "full" | "unlimited";

export type NumberSummaryWithLimit = {
  number: string;
  sets: number;
  totalAmount: number;
  maxPayout: number;
  capRisk: number | null;
  capSets: number | null;
  status: LimitStatus;
  riskPercent: number | null;
  setsPercent: number | null;
  remainingRisk: number | null;
  remainingSets: number | null;
  isCustomCap: boolean;
};

export function getCapForNumber(
  number: string,
  limits: RiskLimitsConfig,
): NumberCap {
  const custom = limits.perNumber[number];
  return {
    maxRisk: custom?.maxRisk ?? limits.defaultMaxRisk,
    maxSets: custom?.maxSets ?? limits.defaultMaxSets,
  };
}

export function attachLimits(
  rows: NumberSummary[],
  maxPayoutByNumber: Map<string, number>,
  limits: RiskLimitsConfig,
): NumberSummaryWithLimit[] {
  return rows.map((row) => {
    const maxPayout = maxPayoutByNumber.get(row.number) ?? 0;
    const cap = getCapForNumber(row.number, limits);
    const isCustomCap = Boolean(limits.perNumber[row.number]);

    let status: LimitStatus = "unlimited";
    let riskPercent: number | null = null;
    let setsPercent: number | null = null;

    if (cap.maxRisk != null && cap.maxRisk > 0) {
      riskPercent = Math.min(100, (maxPayout / cap.maxRisk) * 100);
      if (maxPayout >= cap.maxRisk) status = "full";
      else if (riskPercent >= 80) status = "warning";
      else status = "ok";
    } else if (cap.maxSets != null && cap.maxSets > 0) {
      setsPercent = Math.min(100, (row.sets / cap.maxSets) * 100);
      if (row.sets >= cap.maxSets) status = "full";
      else if (setsPercent >= 80) status = "warning";
      else status = "ok";
    }

    if (
      cap.maxRisk != null &&
      cap.maxSets != null &&
      (maxPayout >= cap.maxRisk || row.sets >= cap.maxSets)
    ) {
      status = "full";
    }

    return {
      number: row.number,
      sets: row.sets,
      totalAmount: row.totalAmount,
      maxPayout,
      capRisk: cap.maxRisk,
      capSets: cap.maxSets,
      status,
      riskPercent,
      setsPercent,
      remainingRisk:
        cap.maxRisk != null ? Math.max(0, cap.maxRisk - maxPayout) : null,
      remainingSets:
        cap.maxSets != null ? Math.max(0, cap.maxSets - row.sets) : null,
      isCustomCap,
    };
  });
}

/** ชุดที่รับได้เพิ่มก่อนชนเพดานความเสี่ยง */
export function maxAdditionalSets(
  currentSets: number,
  capRisk: number | null,
  capSets: number | null,
  rates: PayoutRates,
): number | null {
  const perSetRisk = maxRiskPerSet(rates);
  const limits: number[] = [];

  if (capSets != null) {
    limits.push(Math.max(0, capSets - currentSets));
  }
  if (capRisk != null && perSetRisk > 0) {
    const currentRisk = currentSets * perSetRisk;
    limits.push(Math.floor(Math.max(0, capRisk - currentRisk) / perSetRisk));
  }

  if (limits.length === 0) return null;
  return Math.min(...limits);
}
