import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getDisplayDraw } from "@/lib/draw-context";
import { getHouseConfig } from "@/lib/house-config";

export async function GET(request: Request) {
  const auth = await requireSession("reports:read");
  if (auth.error) return auth.error;
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const drawIdParam = searchParams.get("drawId");
  const slipIdParam = searchParams.get("slipId");

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
  let slip: { id: string; customerName: string | null } | null = null;
  if (slipIdParam) {
    slip = await prisma.slip.findFirst({
      where: { id: slipIdParam, drawId: draw.id },
      select: { id: true, customerName: true },
    });
    if (!slip) {
      return NextResponse.json({ error: "ไม่พบบิลนี้" }, { status: 404 });
    }
  }

  const bets = await prisma.bet.findMany({
    where: {
      drawId: draw.id,
      status: "active",
      ...(slip ? { slipId: slip.id } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { createdBy: { select: { displayName: true } } },
  });

  const slips = await prisma.slip.findMany({
    where: { drawId: draw.id },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { bets: { where: { status: "active" } } } } },
  });

  const byNumber = new Map<string, { sets: number; totalAmount: number }>();
  for (const b of bets) {
    const row = byNumber.get(b.number) ?? { sets: 0, totalAmount: 0 };
    row.sets += 1;
    row.totalAmount += b.amount;
    byNumber.set(b.number, row);
  }

  const rows = Array.from(byNumber.entries())
    .map(([number, r]) => ({
      number,
      sets: r.sets,
      totalAmount: r.totalAmount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const totalSets = rows.reduce((s, r) => s + r.sets, 0);
  const totalReceived = rows.reduce((s, r) => s + r.totalAmount, 0);

  return NextResponse.json({
    houseName: house.name,
    pricePerSet: house.pricePerSet,
    customerName: slip?.customerName ?? null,
    draw: {
      id: draw.id,
      label: draw.label,
      status: draw.status,
      result4: draw.result4,
    },
    slipId: slip?.id ?? null,
    slips: slips.map((s) => ({
      id: s.id,
      customerName: s.customerName,
      betCount: s._count.bets,
    })),
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
