export type PayoutRates = {
  fourStraight: number;
  fourTod: number;
  threeStraight: number;
  threeTod: number;
  threeFront: number;
  twoFront: number;
  twoBack: number;
};

export const DEFAULT_RATES: PayoutRates = {
  fourStraight: 120_000,
  fourTod: 4_000,
  threeStraight: 35_000,
  threeTod: 3_000,
  threeFront: 2_000,
  twoFront: 1_500,
  twoBack: 1_500,
};

export const RATE_LABELS: { key: keyof PayoutRates; label: string; hint: string }[] =
  [
    { key: "fourStraight", label: "4 ตัวตรง", hint: "ตรง 4 หลัก" },
    { key: "fourTod", label: "4 ตัวโต๊ด", hint: "สลับ 4 หลัก" },
    { key: "threeStraight", label: "3 ตัวตรง", hint: "ตรง 3 หลักท้าย" },
    { key: "threeTod", label: "3 ตัวโต๊ด", hint: "สลับ 3 หลักท้าย" },
    { key: "threeFront", label: "3 ตัวหน้า", hint: "3 หลักหน้า" },
    { key: "twoFront", label: "2 ตัวหน้า", hint: "2 หลักหน้า" },
    { key: "twoBack", label: "2 ตัวหลัง", hint: "2 หลักท้าย" },
  ];

export function parseRatesJson(json: string): PayoutRates {
  try {
    return { ...DEFAULT_RATES, ...JSON.parse(json) };
  } catch {
    return DEFAULT_RATES;
  }
}

export function serializeRates(rates: PayoutRates): string {
  return JSON.stringify(rates);
}

export function maxRiskPerSet(rates: PayoutRates): number {
  return rates.fourStraight;
}
