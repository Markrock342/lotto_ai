import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getOrCreateOpenDraw } from "@/lib/house-config";

export async function GET() {
  const auth = await requireSession("bets:read");
  if (auth.error) return auth.error;
  const session = auth.session;

  const draw = await getOrCreateOpenDraw(session.houseId);
  const betCount = await prisma.bet.count({
    where: { drawId: draw.id, status: "active" },
  });

  return NextResponse.json({
    draw: {
      id: draw.id,
      label: draw.label,
      status: draw.status,
      betCount,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireSession("draw:manage");
  if (auth.error) return auth.error;
  const session = auth.session;

  const body = (await request.json()) as { action?: string };
  if (body.action === "new") {
    await prisma.draw.updateMany({
      where: { houseId: session.houseId, status: "open" },
      data: { status: "closed" },
    });
    const label = new Date().toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const draw = await prisma.draw.create({
      data: {
        houseId: session.houseId,
        label: `งวด ${label}`,
        status: "open",
      },
    });
    return NextResponse.json({ draw });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
