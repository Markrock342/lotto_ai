import type { Bet } from "@prisma/client";
import {
  checkWinsForNumber,
  totalPayoutForWins,
  type DrawResultInput,
  type WinLine,
  type WinType,
} from "./check-prizes";
import type { PayoutRates } from "./rates";
import { RATE_LABELS } from "./rates";

export type BetSettlement = {
  betId: string;
  number: string;
  amount: number;
  wins: WinLine[];
  payout: number;
  slipId?: string | null;
  customerName?: string | null;
};

export type PrizeTypeSummary = {
  type: WinType;
  label: string;
  rate: number;
  count: number;
  payout: number;
};

export type SlipSettlement = {
  slipId: string | null;
  customerName: string | null;
  totalReceived: number;
  totalPayout: number;
  profit: number;
  totalBets: number;
  winningBets: number;
  byPrizeType: PrizeTypeSummary[];
};

export type DrawSettlement = {
  result: DrawResultInput;
  totalReceived: number;
  totalPayout: number;
  profit: number;
  totalBets: number;
  winningBets: number;
  lines: BetSettlement[];
  byNumber: {
    number: string;
    sets: number;
    received: number;
    payout: number;
    wins: WinLine[];
  }[];
  byPrizeType: PrizeTypeSummary[];
  bySlip: SlipSettlement[];
};

type BetInput = Pick<Bet, "id" | "number" | "amount"> & {
  slipId?: string | null;
};

type SlipMeta = {
  id: string;
  customerName: string | null;
};

function emptyPrizeMap(rates: PayoutRates): Map<WinType, PrizeTypeSummary> {
  const map = new Map<WinType, PrizeTypeSummary>();
  for (const { key, label } of RATE_LABELS) {
    map.set(key, {
      type: key,
      label,
      rate: rates[key],
      count: 0,
      payout: 0,
    });
  }
  return map;
}

function recordWin(
  prizeMap: Map<WinType, PrizeTypeSummary>,
  wins: WinLine[],
): void {
  for (const w of wins) {
    const row = prizeMap.get(w.type);
    if (!row) continue;
    row.count += 1;
    row.payout += w.payout;
  }
}

function prizeMapToSortedList(
  map: Map<WinType, PrizeTypeSummary>,
): PrizeTypeSummary[] {
  return Array.from(map.values())
    .filter((p) => p.count > 0)
    .sort((a, b) => b.payout - a.payout);
}

function settleBetsCore(
  bets: BetInput[],
  result: DrawResultInput,
  rates: PayoutRates,
): {
  lines: BetSettlement[];
  byNumber: DrawSettlement["byNumber"];
  totalReceived: number;
  totalPayout: number;
  winningBets: number;
  prizeMap: Map<WinType, PrizeTypeSummary>;
} {
  const lines: BetSettlement[] = [];
  const numberMap = new Map<
    string,
    { sets: number; received: number; payout: number; wins: WinLine[] }
  >();
  const prizeMap = emptyPrizeMap(rates);

  let totalReceived = 0;
  let totalPayout = 0;
  let winningBets = 0;

  for (const bet of bets) {
    totalReceived += bet.amount;
    const wins = checkWinsForNumber(bet.number, result, rates);
    const payout = totalPayoutForWins(wins);
    if (payout > 0) winningBets += 1;
    totalPayout += payout;
    recordWin(prizeMap, wins);

    lines.push({
      betId: bet.id,
      number: bet.number,
      amount: bet.amount,
      wins,
      payout,
      slipId: bet.slipId ?? null,
    });

    const agg = numberMap.get(bet.number) ?? {
      sets: 0,
      received: 0,
      payout: 0,
      wins: [],
    };
    agg.sets += 1;
    agg.received += bet.amount;
    agg.payout += payout;
    if (wins.length > 0) agg.wins = wins;
    numberMap.set(bet.number, agg);
  }

  const byNumber = Array.from(numberMap.entries())
    .map(([number, v]) => ({ number, ...v }))
    .sort((a, b) => b.payout - a.payout);

  return {
    lines,
    byNumber,
    totalReceived,
    totalPayout,
    winningBets,
    prizeMap,
  };
}

export function settleDraw(
  bets: BetInput[],
  result: DrawResultInput,
  rates: PayoutRates,
  slipMeta: SlipMeta[] = [],
): DrawSettlement {
  const core = settleBetsCore(bets, result, rates);

  const metaById = new Map(slipMeta.map((s) => [s.id, s.customerName] as const));

  const slipGroups = new Map<string | null, BetInput[]>();
  for (const bet of bets) {
    const key = bet.slipId ?? null;
    const list = slipGroups.get(key) ?? [];
    list.push(bet);
    slipGroups.set(key, list);
  }

  const bySlip: SlipSettlement[] = Array.from(slipGroups.entries())
    .map(([slipId, group]) => {
      const sub = settleBetsCore(group, result, rates);
      const totalReceived = sub.totalReceived;
      const totalPayout = sub.totalPayout;
      return {
        slipId,
        customerName: slipId ? (metaById.get(slipId) ?? null) : null,
        totalReceived,
        totalPayout,
        profit: totalReceived - totalPayout,
        totalBets: group.length,
        winningBets: sub.winningBets,
        byPrizeType: prizeMapToSortedList(sub.prizeMap),
      };
    })
    .sort((a, b) => {
      if (a.customerName && !b.customerName) return -1;
      if (!a.customerName && b.customerName) return 1;
      return (a.customerName ?? "").localeCompare(b.customerName ?? "", "th");
    });

  return {
    result,
    totalReceived: core.totalReceived,
    totalPayout: core.totalPayout,
    profit: core.totalReceived - core.totalPayout,
    totalBets: bets.length,
    winningBets: core.winningBets,
    lines: core.lines
      .filter((l) => l.payout > 0)
      .map((l) => ({
        ...l,
        customerName: l.slipId ? (metaById.get(l.slipId) ?? null) : null,
      })),
    byNumber: core.byNumber,
    byPrizeType: prizeMapToSortedList(core.prizeMap),
    bySlip,
  };
}
