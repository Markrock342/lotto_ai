import { prisma } from "./db";
import { DEFAULT_RATES, maxRiskPerSet, parseRatesJson } from "./rates";
import type { PayoutRates } from "./rates";

export type HouseConfig = {
  id: string;
  name: string;
  pricePerSet: number;
  defaultMaxRisk: number | null;
  defaultMaxSets: number | null;
  rates: PayoutRates;
  customerList: string[];
};

export async function getHouseConfig(houseId: string): Promise<HouseConfig> {
  const house = await prisma.house.findUniqueOrThrow({ where: { id: houseId } });
  let customerList: string[] = [];
  try {
    const parsed = JSON.parse(house.customerListJson || "[]");
    if (Array.isArray(parsed)) customerList = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    customerList = [];
  }
  return {
    id: house.id,
    name: house.name,
    pricePerSet: house.pricePerSet,
    defaultMaxRisk: house.defaultMaxRisk,
    defaultMaxSets: house.defaultMaxSets,
    rates: parseRatesJson(house.ratesJson),
    customerList,
  };
}

export type NumberCap = {
  maxRisk: number | null;
  maxSets: number | null;
};

export async function getLimitsMap(houseId: string) {
  const rows = await prisma.numberLimit.findMany({ where: { houseId } });
  const map = new Map<string, NumberCap>();
  for (const r of rows) {
    map.set(r.number, { maxRisk: r.maxRisk, maxSets: r.maxSets });
  }
  return map;
}

export function getCapForNumber(
  number: string,
  house: HouseConfig,
  limitsMap: Map<string, NumberCap>,
): NumberCap {
  const custom = limitsMap.get(number);
  return {
    maxRisk: custom?.maxRisk ?? house.defaultMaxRisk,
    maxSets: custom?.maxSets ?? house.defaultMaxSets,
  };
}

export type AggregatedNumber = {
  number: string;
  sets: number;
  totalAmount: number;
  maxPayout: number;
};

function maxRiskForNumber(num: string, rates: PayoutRates): number {
  if (num.length === 2) return Math.max(rates.twoFront, rates.twoBack);
  if (num.length === 3) return Math.max(rates.threeStraight, rates.threeTod);
  return Math.max(rates.fourStraight, rates.fourTod, rates.threeStraight, rates.threeTod, rates.twoFront, rates.twoBack);
}

export async function aggregateDraw(drawId: string, rates: PayoutRates) {
  const bets = await prisma.bet.findMany({
    where: { drawId, status: "active" },
  });
  const map = new Map<string, AggregatedNumber>();

  for (const b of bets) {
    const perSet = maxRiskForNumber(b.number, rates);
    const existing = map.get(b.number);
    if (existing) {
      existing.sets += 1;
      existing.totalAmount += b.amount;
      existing.maxPayout = existing.sets * perSet;
    } else {
      map.set(b.number, {
        number: b.number,
        sets: 1,
        totalAmount: b.amount,
        maxPayout: perSet,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

export async function getOrCreateOpenDraw(houseId: string) {
  let draw = await prisma.draw.findFirst({
    where: { houseId, status: "open" },
    orderBy: { createdAt: "desc" },
  });
  if (!draw) {
    const label = new Date().toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    draw = await prisma.draw.create({
      data: { houseId, label: `งวด ${label}`, status: "open" },
    });
  }
  return draw;
}
