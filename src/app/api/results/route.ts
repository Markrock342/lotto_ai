import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getActiveOpenDraw, getDrawForSettlement } from "@/lib/draw-context";
import { getHouseConfig } from "@/lib/house-config";
import { getOrCreateOpenDraw } from "@/lib/house-config";
import { settleDraw } from "@/lib/settlement";

export async function GET(request: Request) {
  const auth = await requireSession("results:read");
  if (auth.error) return auth.error;
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const drawId = searchParams.get("drawId");

  const house = await getHouseConfig(session.houseId);
  let draw;

  if (drawId) {
    draw = await prisma.draw.findFirst({
      where: { id: drawId, houseId: session.houseId },
    });
  } else {
    draw = await getDrawForSettlement(session.houseId);
  }

  if (!draw) {
    return NextResponse.json({ error: "ไม่พบงวด" }, { status: 404 });
  }

  if (!draw.result4) {
    return NextResponse.json({
      draw: { id: draw.id, label: draw.label, status: draw.status },
      hasResult: false,
    });
  }

  const bets = await prisma.bet.findMany({
    where: { drawId: draw.id, status: "active" },
  });
  const slips = await prisma.slip.findMany({
    where: { drawId: draw.id },
    select: { id: true, customerName: true },
  });
  const settlement = settleDraw(
    bets,
    { fourDigit: draw.result4 },
    house.rates,
    slips,
  );

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
  const auth = await requireSession("results:settle");
  if (auth.error) return auth.error;
  const session = auth.session;

  const body = (await request.json()) as { fourDigit?: string; drawId?: string };
  const raw = body.fourDigit?.replace(/\D/g, "") ?? "";
  if (raw.length !== 4) {
    return NextResponse.json(
      { error: "กรอกผลหวย 4 หลักให้ครบ" },
      { status: 400 },
    );
  }

  const fourDigit = raw.padStart(4, "0");
  
  let draw;
  if (body.drawId) {
    draw = await prisma.draw.findFirst({
      where: { id: body.drawId, houseId: session.houseId },
    });
  } else {
    draw = await getActiveOpenDraw(session.houseId);
  }

  if (!draw) {
    return NextResponse.json({ error: "ไม่พบงวดที่จะออกผล" }, { status: 400 });
  }

  const betCount = await prisma.bet.count({
    where: { drawId: draw.id, status: "active" },
  });
  if (betCount === 0) {
    return NextResponse.json({ error: "ยังไม่มีโพยในงวดนี้" }, { status: 400 });
  }

  const house = await getHouseConfig(session.houseId);
  const bets = await prisma.bet.findMany({
    where: { drawId: draw.id, status: "active" },
  });
  const slips = await prisma.slip.findMany({
    where: { drawId: draw.id },
    select: { id: true, customerName: true },
  });
  const settlement = settleDraw(bets, { fourDigit }, house.rates, slips);

  await prisma.draw.update({
    where: { id: draw.id },
    data: {
      result4: fourDigit,
      status: "settled",
      settledAt: draw.status === "settled" ? draw.settledAt : new Date(),
      totalReceived: settlement.totalReceived,
      totalPayout: settlement.totalPayout,
    },
  });

  if (draw.status === "open") {
    await getOrCreateOpenDraw(session.houseId);
  }

  return NextResponse.json({
    ok: true,
    draw: {
      id: draw.id,
      label: draw.label,
      result4: fourDigit,
      status: "settled",
      settledAt: draw.status === "settled" ? draw.settledAt : new Date(),
    },
    settlement,
  });
}
