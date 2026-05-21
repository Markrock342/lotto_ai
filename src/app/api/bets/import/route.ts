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
import { parseSlipText } from "@/lib/parse-slip";
import { checkAddBets } from "@/lib/validate-bets";

export async function POST(request: Request) {
  const auth = await requireSession("bets:write");
  if (auth.error) return auth.error;
  const session = auth.session;

  const body = (await request.json()) as { text?: string };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "ไม่มีข้อความโพย" }, { status: 400 });
  }

  const house = await getHouseConfig(session.houseId);
  const draw = await getActiveOpenDraw(session.houseId);
  if (!draw || draw.status !== "open") {
    return NextResponse.json(
      { error: "งวดนี้ปิดรับแล้ว" },
      { status: 400 },
    );
  }
  const parsed = parseSlipText(body.text, house.pricePerSet);

  if (parsed.entries.length === 0) {
    return NextResponse.json(
      { error: "ไม่พบเลขในโพย", errors: parsed.errors },
      { status: 400 },
    );
  }

  const current = await aggregateDraw(draw.id, house.rates);
  const limitsMap = await getLimitsMap(session.houseId);

  const { allowed, blocked } = checkAddBets(
    parsed.entries,
    current,
    house,
    (number) => getCapForNumber(number, house, limitsMap),
  );

  if (allowed.length === 0) {
    return NextResponse.json(
      {
        error: "เลขที่ส่งมาเต็มหมด ไม่สามารถรับเพิ่มได้",
        blocked,
        parseErrors: parsed.errors,
      },
      { status: 422 },
    );
  }

  await prisma.bet.createMany({
    data: allowed.map((e) => ({
      drawId: draw.id,
      number: e.number,
      amount: e.amount,
      createdById: session.userId,
    })),
  });

  return NextResponse.json({
    ok: true,
    added: allowed.length,
    skipped: parsed.entries.length - allowed.length,
    blocked,
    parseErrors: parsed.errors,
  });
}
