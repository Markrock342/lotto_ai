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

  const blockedNumbers = new Set(blocked.map((b) => b.number));

  const sectionAllowed = parsed.sections.map((section) => ({
    section,
    entries: section.entries.filter((e) => !blockedNumbers.has(e.number)),
  }));

  const toImport =
    sectionAllowed.filter((s) => s.entries.length > 0).length > 0
      ? sectionAllowed
      : [{ section: { customerName: null, entries: allowed }, entries: allowed }];

  let slipOrder = await prisma.slip.count({ where: { drawId: draw.id } });
  const slipsCreated: { id: string; customerName: string | null; betCount: number }[] = [];

  for (const { section, entries } of toImport) {
    if (entries.length === 0) continue;
    const slip = await prisma.slip.create({
      data: {
        drawId: draw.id,
        customerName: section.customerName,
        sortOrder: slipOrder++,
      },
    });
    await prisma.bet.createMany({
      data: entries.map((e) => ({
        drawId: draw.id,
        slipId: slip.id,
        number: e.number,
        amount: e.amount,
        createdById: session.userId,
      })),
    });
    slipsCreated.push({
      id: slip.id,
      customerName: slip.customerName,
      betCount: entries.length,
    });
  }

  return NextResponse.json({
    ok: true,
    added: allowed.length,
    skipped: parsed.entries.length - allowed.length,
    blocked,
    parseErrors: parsed.errors,
    slips: slipsCreated,
    sectionCount: slipsCreated.length,
  });
}
