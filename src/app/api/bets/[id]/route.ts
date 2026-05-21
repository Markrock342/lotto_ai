import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getActiveOpenDraw } from "@/lib/draw-context";
import {
  aggregateDraw,
  getHouseConfig,
  getLimitsMap,
  getCapForNumber,
} from "@/lib/house-config";
import { checkAddBets } from "@/lib/validate-bets";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const auth = await requireSession("bets:write");
  if (auth.error) return auth.error;
  const session = auth.session;

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    number?: string;
    amount?: number;
  };

  const bet = await prisma.bet.findFirst({
    where: { id },
    include: { draw: true },
  });

  if (!bet || bet.draw.houseId !== session.houseId) {
    return NextResponse.json({ error: "ไม่พบโพย" }, { status: 404 });
  }
  if (bet.status !== "active") {
    return NextResponse.json({ error: "โพยนี้ยกเลิกแล้ว" }, { status: 400 });
  }
  if (bet.draw.status !== "open") {
    return NextResponse.json({ error: "งวดปิดรับแล้ว" }, { status: 400 });
  }

  const house = await getHouseConfig(session.houseId);
  const rawNum = body.number?.replace(/\D/g, "") ?? bet.number;
  const number = rawNum.padStart(4, "0").slice(-4);
  if (rawNum.length < 2 || rawNum.length > 4) {
    return NextResponse.json({ error: "เลขไม่ถูกต้อง" }, { status: 400 });
  }

  const amount =
    body.amount != null ? Number(body.amount) : bet.amount;
  if (amount <= 0 || Number.isNaN(amount)) {
    return NextResponse.json({ error: "ยอดไม่ถูกต้อง" }, { status: 400 });
  }

  if (number !== bet.number) {
    const current = await aggregateDraw(bet.drawId, house.rates);
    const withoutOld = current.map((c) => {
      if (c.number !== bet.number) return c;
      return { ...c, sets: c.sets - 1, totalAmount: c.totalAmount - bet.amount };
    }).filter((c) => c.sets > 0);

    const limitsMap = await getLimitsMap(session.houseId);
    const { blocked } = checkAddBets(
      [{ number, amount, line: 0 }],
      withoutOld,
      house,
      (n) => getCapForNumber(n, house, limitsMap),
    );
    if (blocked.length > 0) {
      return NextResponse.json({ error: blocked[0].reason ?? "เลขเต็ม" }, { status: 422 });
    }
  }

  const updated = await prisma.bet.update({
    where: { id },
    data: { number, amount },
  });

  return NextResponse.json({ bet: updated });
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const auth = await requireSession("bets:write");
  if (auth.error) return auth.error;
  const session = auth.session;

  const { id } = await ctx.params;
  const bet = await prisma.bet.findFirst({
    where: { id },
    include: { draw: true },
  });

  if (!bet || bet.draw.houseId !== session.houseId) {
    return NextResponse.json({ error: "ไม่พบโพย" }, { status: 404 });
  }
  if (bet.status !== "active") {
    return NextResponse.json({ error: "ยกเลิกแล้ว" }, { status: 400 });
  }
  if (bet.draw.status !== "open") {
    return NextResponse.json({ error: "งวดปิดรับแล้ว" }, { status: 400 });
  }

  await prisma.bet.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ ok: true });
}
