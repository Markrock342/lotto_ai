import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  aggregateDraw,
  getHouseConfig,
  getLimitsMap,
  getOrCreateOpenDraw,
} from "@/lib/house-config";
import { attachLimits } from "@/lib/limits";
import type { RiskLimitsConfig } from "@/lib/limits";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const house = await getHouseConfig(session.houseId);
  const draw = await getOrCreateOpenDraw(session.houseId);
  const bets = await prisma.bet.findMany({ where: { drawId: draw.id } });
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
    aggregated.map((r) => [r.number, r.sets * house.rates.fourStraight]),
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
  );

  const totalReceived = aggregated.reduce((s, r) => s + r.totalAmount, 0);
  const totalRisk = aggregated.reduce(
    (s, r) => s + r.sets * house.rates.fourStraight,
    0,
  );
  const fullCount = rows.filter((r) => r.status === "full").length;

  const recentDraws = await prisma.draw.findMany({
    where: { houseId: session.houseId, status: "settled" },
    orderBy: { settledAt: "desc" },
    take: 5,
  });

  const top10 = [...aggregated]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  return NextResponse.json({
    house: { name: house.name, pricePerSet: house.pricePerSet },
    draw: {
      id: draw.id,
      label: draw.label,
      status: draw.status,
      result4: draw.result4,
    },
    live: {
      totalBets: bets.length,
      totalReceived,
      totalRisk,
      uniqueNumbers: aggregated.length,
      fullCount,
    },
    top10,
    recentDraws: recentDraws.map((d) => ({
      id: d.id,
      label: d.label,
      result4: d.result4,
      totalReceived: d.totalReceived,
      totalPayout: d.totalPayout,
      profit: (d.totalReceived ?? 0) - (d.totalPayout ?? 0),
      settledAt: d.settledAt,
    })),
  });
}
