import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getHouseConfig } from "@/lib/house-config";
import { serializeRates, type PayoutRates } from "@/lib/rates";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const house = await getHouseConfig(session.houseId);
  return NextResponse.json({ house });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });
  }

  const body = (await request.json()) as {
    name?: string;
    pricePerSet?: number;
    defaultMaxRisk?: number | null;
    defaultMaxSets?: number | null;
    rates?: PayoutRates;
  };

  const current = await getHouseConfig(session.houseId);

  await prisma.house.update({
    where: { id: session.houseId },
    data: {
      name: body.name?.trim() || current.name,
      pricePerSet:
        body.pricePerSet != null
          ? Math.max(1, body.pricePerSet)
          : current.pricePerSet,
      defaultMaxRisk:
        body.defaultMaxRisk !== undefined ? body.defaultMaxRisk : undefined,
      defaultMaxSets:
        body.defaultMaxSets !== undefined ? body.defaultMaxSets : undefined,
      ratesJson: body.rates ? serializeRates(body.rates) : undefined,
    },
  });

  const house = await getHouseConfig(session.houseId);
  return NextResponse.json({ house });
}
