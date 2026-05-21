import type { Bet } from "@prisma/client";
import {
  checkWinsForNumber,
  totalPayoutForWins,
  type DrawResultInput,
  type WinLine,
} from "./check-prizes";
import type { PayoutRates } from "./rates";

export type BetSettlement = {
  betId: string;
  number: string;
  amount: number;
  wins: WinLine[];
  payout: number;
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
};

export function settleDraw(
  bets: Pick<Bet, "id" | "number" | "amount">[],
  result: DrawResultInput,
  rates: PayoutRates,
): DrawSettlement {
  const lines: BetSettlement[] = [];
  const numberMap = new Map<
    string,
    { sets: number; received: number; payout: number; wins: WinLine[] }
  >();

  let totalReceived = 0;
  let totalPayout = 0;
  let winningBets = 0;

  for (const bet of bets) {
    totalReceived += bet.amount;
    const wins = checkWinsForNumber(bet.number, result, rates);
    const payout = totalPayoutForWins(wins);
    if (payout > 0) winningBets += 1;
    totalPayout += payout;

    lines.push({
      betId: bet.id,
      number: bet.number,
      amount: bet.amount,
      wins,
      payout,
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
    result,
    totalReceived,
    totalPayout,
    profit: totalReceived - totalPayout,
    totalBets: bets.length,
    winningBets,
    lines: lines.filter((l) => l.payout > 0),
    byNumber,
  };
}
