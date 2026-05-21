import type { BetEntry } from "./types";
import type { HouseConfig, NumberCap } from "./house-config";
import { maxRiskPerSet } from "./rates";
import type { AggregatedNumber } from "./house-config";

export type LimitCheck = {
  number: string;
  currentSets: number;
  addingSets: number;
  capSets: number | null;
  capRisk: number | null;
  currentPayout: number;
  afterPayout: number;
  blocked: boolean;
  reason?: string;
};

export function checkAddBets(
  entries: BetEntry[],
  current: AggregatedNumber[],
  house: HouseConfig,
  getCap: (number: string) => NumberCap,
): { allowed: BetEntry[]; blocked: LimitCheck[] } {
  const perSetRisk = maxRiskPerSet(house.rates);
  const currentMap = new Map(current.map((c) => [c.number, c]));

  const adding = new Map<string, number>();
  for (const e of entries) {
    adding.set(e.number, (adding.get(e.number) ?? 0) + 1);
  }

  const blocked: LimitCheck[] = [];
  const blockedNumbers = new Set<string>();

  for (const [number, addCount] of adding) {
    const cur = currentMap.get(number);
    const currentSets = cur?.sets ?? 0;
    const afterSets = currentSets + addCount;
    const currentPayout = currentSets * perSetRisk;
    const afterPayout = afterSets * perSetRisk;
    const cap = getCap(number);

    let isBlocked = false;
    let reason: string | undefined;

    if (cap.maxSets != null && afterSets > cap.maxSets) {
      isBlocked = true;
      reason = `เลข ${number} รับได้ไม่เกิน ${cap.maxSets} ชุด (ตอนนี้ ${currentSets} + จะเพิ่ม ${addCount})`;
    }
    if (cap.maxRisk != null && afterPayout > cap.maxRisk) {
      isBlocked = true;
      reason = `เลข ${number} ความเสี่ยงเกินเพดาน ${cap.maxRisk.toLocaleString()} บาท`;
    }

    if (isBlocked) {
      blockedNumbers.add(number);
      blocked.push({
        number,
        currentSets,
        addingSets: addCount,
        capSets: cap.maxSets,
        capRisk: cap.maxRisk,
        currentPayout,
        afterPayout,
        blocked: true,
        reason,
      });
    }
  }

  const allowed = entries.filter((e) => !blockedNumbers.has(e.number));
  return { allowed, blocked };
}
