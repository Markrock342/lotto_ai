import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getDisplayDraw } from "@/lib/draw-context";
import { aggregateDraw, getHouseConfig } from "@/lib/house-config";

export async function GET(request: Request) {
  const auth = await requireSession("reports:read");
  if (auth.error) return auth.error;
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const drawIdParam = searchParams.get("drawId");

  let draw;
  if (drawIdParam) {
    draw = await prisma.draw.findFirst({
      where: { id: drawIdParam, houseId: session.houseId },
    });
  } else {
    draw = await getDisplayDraw(session.houseId);
  }

  if (!draw) {
    return NextResponse.json({ error: "ไม่พบงวด" }, { status: 404 });
  }

  const house = await getHouseConfig(session.houseId);
  const aggregated = await aggregateDraw(draw.id, house.rates);
  const bets = await prisma.bet.findMany({
    where: { drawId: draw.id, status: "active" },
    orderBy: { createdAt: "asc" },
    include: { createdBy: { select: { displayName: true } } },
  });

  const rows = aggregated.map((r) => ({
    number: r.number,
    sets: r.sets,
    totalAmount: r.totalAmount,
  }));

  const totalSets = aggregated.reduce((s, r) => s + r.sets, 0);
  const totalReceived = aggregated.reduce((s, r) => s + r.totalAmount, 0);

  return NextResponse.json({
    houseName: house.name,
    pricePerSet: house.pricePerSet,
    draw: {
      id: draw.id,
      label: draw.label,
      status: draw.status,
      result4: draw.result4,
    },
    rows,
    totalSets,
    totalReceived,
    bets: bets.map((b) => ({
      id: b.id,
      number: b.number,
      amount: b.amount,
      at: b.createdAt,
      by: b.createdBy?.displayName ?? "—",
    })),
    printedAt: new Date().toLocaleString("th-TH"),
  });
}
