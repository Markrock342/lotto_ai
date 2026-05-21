import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getActiveOpenDraw } from "@/lib/draw-context";

export async function POST(request: Request) {
  const auth = await requireSession("bets:write");
  if (auth.error) return auth.error;
  const session = auth.session;

  const body = (await request.json()) as {
    ids?: string[];
    numbers?: string[];
  };

  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  const numbers = Array.isArray(body.numbers)
    ? body.numbers.map((n) => n.replace(/\D/g, "").padStart(4, "0").slice(-4))
    : [];

  if (ids.length === 0 && numbers.length === 0) {
    return NextResponse.json({ error: "ไม่ได้เลือกรายการ" }, { status: 400 });
  }

  const draw = await getActiveOpenDraw(session.houseId);
  if (!draw || draw.status !== "open") {
    return NextResponse.json({ error: "งวดปิดรับแล้ว" }, { status: 400 });
  }

  const where = {
    drawId: draw.id,
    status: "active" as const,
    draw: { houseId: session.houseId },
    OR: [
      ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
      ...(numbers.length > 0 ? [{ number: { in: numbers } }] : []),
    ],
  };

  if (where.OR.length === 0) {
    return NextResponse.json({ error: "ไม่ได้เลือกรายการ" }, { status: 400 });
  }

  const result = await prisma.bet.updateMany({
    where: {
      drawId: draw.id,
      status: "active",
      OR: where.OR,
    },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ ok: true, cancelled: result.count });
}
