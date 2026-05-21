import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/permissions";

export async function GET() {
  const auth = await requireSession("limits:read");
  if (auth.error) return auth.error;
  const session = auth.session;
  const rows = await prisma.numberLimit.findMany({
    where: { houseId: session.houseId },
    orderBy: { number: "asc" },
  });
  return NextResponse.json({ limits: rows });
}

export async function PUT(request: Request) {
  const auth = await requireSession("limits:write");
  if (auth.error) return auth.error;
  const session = auth.session;

  const body = (await request.json()) as {
    number?: string;
    maxRisk?: number | null;
    maxSets?: number | null;
  };

  const number = body.number?.padStart(4, "0");
  if (!number || !/^\d{4}$/.test(number)) {
    return NextResponse.json({ error: "เลขไม่ถูกต้อง" }, { status: 400 });
  }

  const limit = await prisma.numberLimit.upsert({
    where: {
      houseId_number: { houseId: session.houseId, number },
    },
    create: {
      houseId: session.houseId,
      number,
      maxRisk: body.maxRisk ?? null,
      maxSets: body.maxSets ?? null,
    },
    update: {
      maxRisk: body.maxRisk !== undefined ? body.maxRisk : undefined,
      maxSets: body.maxSets !== undefined ? body.maxSets : undefined,
    },
  });

  return NextResponse.json({ limit });
}

export async function DELETE(request: Request) {
  const auth = await requireSession("limits:write");
  if (auth.error) return auth.error;
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const number = searchParams.get("number")?.padStart(4, "0");
  if (!number) {
    return NextResponse.json({ error: "ระบุเลข" }, { status: 400 });
  }

  await prisma.numberLimit.deleteMany({
    where: { houseId: session.houseId, number },
  });

  return NextResponse.json({ ok: true });
}
