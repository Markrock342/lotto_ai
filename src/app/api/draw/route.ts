import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateOpenDraw } from "@/lib/house-config";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const draw = await getOrCreateOpenDraw(session.houseId);
  const betCount = await prisma.bet.count({ where: { drawId: draw.id } });

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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
