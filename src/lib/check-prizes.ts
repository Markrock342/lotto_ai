import type { PayoutRates } from "./rates";
import { RATE_LABELS } from "./rates";

export type DrawResultInput = {
  fourDigit: string;
};

export type WinType = keyof PayoutRates;

export type WinLine = {
  type: WinType;
  label: string;
  payout: number;
};

function pad4(n: string): string {
  return n.replace(/\D/g, "").padStart(4, "0").slice(-4);
}

function sortDigits(s: string): string {
  return s.split("").sort().join("");
}

function isPermutation(a: string, b: string): boolean {
  return a.length === b.length && sortDigits(a) === sortDigits(b);
}

/** ตรวจรางวัล 1 ชุด (เลข 4 หลัก) กับผลออก — ถูกได้หลายประเภทพร้อมกัน */
export function checkWinsForNumber(
  betNumber: string,
  result: DrawResultInput,
  rates: PayoutRates,
): WinLine[] {
  const b = pad4(betNumber);
  const r = pad4(result.fourDigit);
  const wins: WinLine[] = [];
  const label = (t: WinType) =>
    RATE_LABELS.find((x) => x.key === t)?.label ?? t;

  if (b === r) {
    wins.push({
      type: "fourStraight",
      label: label("fourStraight"),
      payout: rates.fourStraight,
    });
  } else if (isPermutation(b, r)) {
    wins.push({
      type: "fourTod",
      label: label("fourTod"),
      payout: rates.fourTod,
    });
  }

  const b3 = b.slice(-3);
  const r3 = r.slice(-3);
  if (b3 === r3) {
    wins.push({
      type: "threeStraight",
      label: label("threeStraight"),
      payout: rates.threeStraight,
    });
  } else if (isPermutation(b3, r3)) {
    wins.push({
      type: "threeTod",
      label: label("threeTod"),
      payout: rates.threeTod,
    });
  }

  if (b.slice(0, 3) === r.slice(0, 3)) {
    wins.push({
      type: "threeFront",
      label: label("threeFront"),
      payout: rates.threeFront,
    });
  }
  if (b.slice(0, 2) === r.slice(0, 2)) {
    wins.push({
      type: "twoFront",
      label: label("twoFront"),
      payout: rates.twoFront,
    });
  }
  if (b.slice(-2) === r.slice(-2)) {
    wins.push({
      type: "twoBack",
      label: label("twoBack"),
      payout: rates.twoBack,
    });
  }

  return wins;
}

export function totalPayoutForWins(wins: WinLine[]): number {
  return wins.reduce((s, w) => s + w.payout, 0);
}
