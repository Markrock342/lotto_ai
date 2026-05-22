import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getHouseConfig } from "@/lib/house-config";
import { requireSession } from "@/lib/permissions";
import { serializeRates, type PayoutRates } from "@/lib/rates";

export async function GET() {
  const auth = await requireSession("settings:read");
  if (auth.error) return auth.error;

  const house = await getHouseConfig(auth.session.houseId);
  return NextResponse.json({ house });
}

export async function PATCH(request: Request) {
  const auth = await requireSession("settings:write");
  if (auth.error) return auth.error;
  const session = auth.session;

  const body = (await request.json()) as {
    name?: string;
    pricePerSet?: number;
    defaultMaxRisk?: number | null;
    defaultMaxSets?: number | null;
    rates?: PayoutRates;
    customerList?: string[];
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
      customerListJson: body.customerList !== undefined
        ? JSON.stringify(body.customerList.filter((n) => typeof n === "string" && n.trim()))
        : undefined,
    },
  });

  const house = await getHouseConfig(session.houseId);
  return NextResponse.json({ house });
}
