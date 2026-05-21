import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getDisplayDraw } from "@/lib/draw-context";

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

  const slips = await prisma.slip.findMany({
    where: { drawId: draw.id },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { bets: { where: { status: "active" } } } },
      bets: {
        where: { status: "active" },
        select: { amount: true },
      },
    },
  });

  return NextResponse.json({
    draw: { id: draw.id, label: draw.label, result4: draw.result4 },
    slips: slips.map((s) => ({
      id: s.id,
      customerName: s.customerName,
      betCount: s._count.bets,
      totalReceived: s.bets.reduce((sum, b) => sum + b.amount, 0),
    })),
  });
}
