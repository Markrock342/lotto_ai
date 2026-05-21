import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveOpenDraw, getDrawForSettlement } from "@/lib/draw-context";
import { getHouseConfig } from "@/lib/house-config";
import { getOrCreateOpenDraw } from "@/lib/house-config";
import { settleDraw } from "@/lib/settlement";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const draw = await getDrawForSettlement(session.houseId);
  const house = await getHouseConfig(session.houseId);

  if (!draw.result4) {
    return NextResponse.json({
      draw: { id: draw.id, label: draw.label, status: draw.status },
      hasResult: false,
    });
  }

  const bets = await prisma.bet.findMany({ where: { drawId: draw.id } });
  const settlement = settleDraw(bets, { fourDigit: draw.result4 }, house.rates);

  return NextResponse.json({
    draw: {
      id: draw.id,
      label: draw.label,
      status: draw.status,
      result4: draw.result4,
      settledAt: draw.settledAt,
    },
    hasResult: true,
    settlement,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { fourDigit?: string };
  const raw = body.fourDigit?.replace(/\D/g, "") ?? "";
  if (raw.length !== 4) {
    return NextResponse.json(
      { error: "กรอกผลหวย 4 หลักให้ครบ" },
      { status: 400 },
    );
  }

  const fourDigit = raw.padStart(4, "0");
  const draw = await getActiveOpenDraw(session.houseId);
  if (!draw) {
    return NextResponse.json({ error: "ไม่มีงวดที่เปิดรับอยู่" }, { status: 400 });
  }

  const betCount = await prisma.bet.count({ where: { drawId: draw.id } });
  if (betCount === 0) {
    return NextResponse.json({ error: "ยังไม่มีโพยในงวดนี้" }, { status: 400 });
  }

  const house = await getHouseConfig(session.houseId);
  const bets = await prisma.bet.findMany({ where: { drawId: draw.id } });
  const settlement = settleDraw(bets, { fourDigit }, house.rates);

  await prisma.draw.update({
    where: { id: draw.id },
    data: {
      result4: fourDigit,
      status: "settled",
      settledAt: new Date(),
      totalReceived: settlement.totalReceived,
      totalPayout: settlement.totalPayout,
    },
  });

  await getOrCreateOpenDraw(session.houseId);

  return NextResponse.json({
    ok: true,
    draw: { id: draw.id, label: draw.label, result4: fourDigit },
    settlement,
  });
}
