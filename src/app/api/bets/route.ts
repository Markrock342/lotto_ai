import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getPeriodRange, type ReportPeriod } from "@/lib/date-period";
import { getOrCreateOpenDraw } from "@/lib/house-config";

export async function GET(request: Request) {
  const auth = await requireSession("bets:read");
  if (auth.error) return auth.error;
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const drawIdParam = searchParams.get("drawId");

  let drawId = drawIdParam;
  if (!drawId) {
    const draw = await getOrCreateOpenDraw(session.houseId);
    drawId = draw.id;
  } else {
    const draw = await prisma.draw.findFirst({
      where: { id: drawId, houseId: session.houseId },
    });
    if (!draw) {
      return NextResponse.json({ error: "ไม่พบงวด" }, { status: 404 });
    }
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "active";
  const period = url.searchParams.get("period");
  const limit = url.searchParams.get("limit");
  let createdAtFilter: { gte: Date; lte: Date } | undefined;
  if (period && period !== "all") {
    const { from, to } = getPeriodRange(period as ReportPeriod);
    if (from) createdAtFilter = { gte: from, lte: to };
  }

  const bets = await prisma.bet.findMany({
    where: {
      drawId: drawId!,
      ...(status === "all" ? {} : { status }),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    ...(limit === "all" ? {} : { take: 500 }),
    include: {
      createdBy: { select: { displayName: true, username: true } },
      slip: { select: { customerName: true } },
    },
  });

  return NextResponse.json({
    bets: bets.map((b) => ({
      id: b.id,
      number: b.number,
      amount: b.amount,
      status: b.status,
      at: b.createdAt,
      by: b.createdBy?.displayName ?? "—",
      customerName: b.slip?.customerName ?? null,
    })),
  });
}
