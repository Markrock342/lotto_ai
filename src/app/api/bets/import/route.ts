import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  aggregateDraw,
  getHouseConfig,
  getLimitsMap,
  getOrCreateOpenDraw,
  getCapForNumber,
} from "@/lib/house-config";
import { parseSlipText } from "@/lib/parse-slip";
import { checkAddBets } from "@/lib/validate-bets";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { text?: string };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "ไม่มีข้อความโพย" }, { status: 400 });
  }

  const house = await getHouseConfig(session.houseId);
  const draw = await getOrCreateOpenDraw(session.houseId);
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
