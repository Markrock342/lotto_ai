import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getPeriodRange, type ReportPeriod } from "@/lib/date-period";

const PERIODS = new Set(["today", "week", "month", "all"]);

export async function GET(request: Request) {
  const auth = await requireSession("reports:read");
  if (auth.error) return auth.error;
  const session = auth.session;

  const period = (new URL(request.url).searchParams.get("period") ??
    "all") as ReportPeriod;
  const { from, to } = PERIODS.has(period)
    ? getPeriodRange(period)
    : getPeriodRange("all");

  const draws = await prisma.draw.findMany({
    where: {
      houseId: session.houseId,
      ...(from ? { createdAt: { gte: from, lte: to } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: {
        select: {
          bets: { where: { status: "active" } },
        },
      },
    },
  });

  return NextResponse.json({
    draws: draws.map((d) => ({
      id: d.id,
      label: d.label,
      status: d.status,
      result4: d.result4,
      totalReceived: d.totalReceived,
      totalPayout: d.totalPayout,
      betCount: d._count.bets,
      createdAt: d.createdAt,
      settledAt: d.settledAt,
      profit: (d.totalReceived ?? 0) - (d.totalPayout ?? 0),
    })),
  });
}
