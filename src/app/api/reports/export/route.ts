import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getPeriodRange, type ReportPeriod } from "@/lib/date-period";
import { billToCsvRows, rowsToCsv } from "@/lib/format-bill";

const PERIODS = new Set(["today", "week", "month", "all"]);

export async function GET(request: Request) {
  const auth = await requireSession("reports:read");
  if (auth.error) return auth.error;
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") ?? "all") as ReportPeriod;
  const drawId = searchParams.get("drawId");
  const includeCancelled = searchParams.get("includeCancelled") === "1";

  if (!PERIODS.has(period)) {
    return NextResponse.json({ error: "ช่วงเวลาไม่ถูกต้อง" }, { status: 400 });
  }

  const { from, to } = getPeriodRange(period);

  const bets = await prisma.bet.findMany({
    where: {
      draw: { houseId: session.houseId },
      ...(drawId ? { drawId } : {}),
      ...(includeCancelled ? {} : { status: "active" }),
      ...(from ? { createdAt: { gte: from, lte: to } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10_000,
    include: {
      draw: { select: { label: true } },
      createdBy: { select: { displayName: true } },
    },
  });

  const csv = rowsToCsv(
    billToCsvRows(
      bets.map((b) => ({
        at: b.createdAt,
        drawLabel: b.draw.label,
        number: b.number,
        amount: b.amount,
        by: b.createdBy?.displayName ?? "—",
        status: b.status,
      })),
    ),
  );

  const filename = `รายงานโพย_${period}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
