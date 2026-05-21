import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getDisplayDraw } from "@/lib/draw-context";
import {
  aggregateDraw,
  getHouseConfig,
  getLimitsMap,
} from "@/lib/house-config";
import { attachLimits } from "@/lib/limits";
import type { RiskLimitsConfig } from "@/lib/limits";

export async function GET() {
  const auth = await requireSession("bets:read");
  if (auth.error) return auth.error;
  const session = auth.session;

  const house = await getHouseConfig(session.houseId);
  const draw = await getDisplayDraw(session.houseId);
  const aggregated = await aggregateDraw(draw.id, house.rates);
  const limitsMap = await getLimitsMap(session.houseId);

  const limitsConfig: RiskLimitsConfig = {
    defaultMaxRisk: house.defaultMaxRisk,
    defaultMaxSets: house.defaultMaxSets,
    perNumber: Object.fromEntries(
      [...limitsMap.entries()].map(([n, c]) => [
        n,
        { maxRisk: c.maxRisk, maxSets: c.maxSets },
      ]),
    ),
  };

  const payoutMap = new Map(
    aggregated.map((r) => [r.number, r.maxPayout]),
  );
  const rows = attachLimits(
    aggregated.map((r) => ({
      number: r.number,
      sets: r.sets,
      totalAmount: r.totalAmount,
      line: 0,
    })),
    payoutMap,
    limitsConfig,
  ).map((r) => ({
    ...r,
    isCustomCap: Boolean(limitsMap.get(r.number)),
  }));

  const totalSets = aggregated.reduce((s, r) => s + r.sets, 0);
  const totalReceived = aggregated.reduce((s, r) => s + r.totalAmount, 0);
  const totalRisk = aggregated.reduce((s, r) => s + r.maxPayout, 0);
  const fullCount = rows.filter((r) => r.status === "full").length;

  return NextResponse.json({
    draw: { id: draw.id, label: draw.label, status: draw.status },
    house: { name: house.name, pricePerSet: house.pricePerSet },
    totals: {
      totalSets,
      totalReceived,
      totalRisk,
      uniqueNumbers: aggregated.length,
      fullCount,
    },
    rows,
  });
}
