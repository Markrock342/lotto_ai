import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const openDraw = await prisma.draw.findFirst({
      where: { status: "open" },
    });

    if (!openDraw) {
      return NextResponse.json({ error: "No open draw found" });
    }

    const bets = await prisma.bet.findMany({
      where: { drawId: openDraw.id, status: "active" },
      orderBy: { createdAt: "asc" },
    });

    const grouped = new Map<string, typeof bets>();
    for (const bet of bets) {
      const key = `${bet.slipId || "no-slip"}_${bet.number}_${bet.amount}`;
      const group = grouped.get(key) || [];
      group.push(bet);
      grouped.set(key, group);
    }

    const toDeleteIds: string[] = [];
    for (const group of grouped.values()) {
      if (group.length > 1) {
        const [, ...duplicates] = group;
        toDeleteIds.push(...duplicates.map((b) => b.id));
      }
    }

    if (toDeleteIds.length > 0) {
      await prisma.bet.deleteMany({
        where: { id: { in: toDeleteIds } },
      });
      return NextResponse.json({
        ok: true,
        message: `Deleted ${toDeleteIds.length} duplicate bets.`,
      });
    }

    return NextResponse.json({ ok: true, message: "No duplicate bets found." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
