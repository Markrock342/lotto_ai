import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getHouseConfig } from "@/lib/house-config";
import { settleDraw } from "@/lib/settlement";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ drawId: string }> },
) {
  const auth = await requireSession("reports:read");
  if (auth.error) return auth.error;
  const session = auth.session;

  const { drawId } = await params;
  const draw = await prisma.draw.findFirst({
    where: { id: drawId, houseId: session.houseId },
  });

  if (!draw || !draw.result4) {
    return NextResponse.json({ error: "ไม่พบงวดหรือยังไม่ออกผล" }, { status: 404 });
  }

  const house = await getHouseConfig(session.houseId);
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

  return NextResponse.json({ draw, settlement });
}
