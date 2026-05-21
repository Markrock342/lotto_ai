import type { BetEntry, NumberSummary } from "./types";

export function aggregateByNumber(entries: BetEntry[]): NumberSummary[] {
  const map = new Map<string, NumberSummary>();

  for (const { number, amount } of entries) {
    const existing = map.get(number);
    if (existing) {
      existing.sets += 1;
      existing.totalAmount += amount;
    } else {
      map.set(number, { number, sets: 1, totalAmount: amount });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

export function computeTotals(entries: BetEntry[]) {
  const uniqueNumbers = new Set(entries.map((e) => e.number)).size;
  const totalSets = entries.length;
  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
  return { uniqueNumbers, totalSets, totalAmount };
}
