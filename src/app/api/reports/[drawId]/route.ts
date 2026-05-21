import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getHouseConfig } from "@/lib/house-config";
import { settleDraw } from "@/lib/settlement";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ drawId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { drawId } = await params;
  const draw = await prisma.draw.findFirst({
    where: { id: drawId, houseId: session.houseId },
  });

  if (!draw || !draw.result4) {
    return NextResponse.json({ error: "ไม่พบงวดหรือยังไม่ออกผล" }, { status: 404 });
  }

  const house = await getHouseConfig(session.houseId);
  const bets = await prisma.bet.findMany({ where: { drawId: draw.id } });
  const settlement = settleDraw(bets, { fourDigit: draw.result4 }, house.rates);

  return NextResponse.json({ draw, settlement });
}
