import { prisma } from "./db";
import { getOrCreateOpenDraw } from "./house-config";

/** งวดที่กำลังรับโพย (open) */
export async function getActiveOpenDraw(houseId: string) {
  return prisma.draw.findFirst({
    where: { houseId, status: "open" },
    orderBy: { createdAt: "desc" },
  });
}

/** งวดล่าสุดที่มีโพย — สำหรับออกผล */
export async function getDrawForSettlement(houseId: string) {
  const open = await getActiveOpenDraw(houseId);
  if (open) {
    const count = await prisma.bet.count({ where: { drawId: open.id } });
    if (count > 0) return open;
  }

  const lastSettled = await prisma.draw.findFirst({
    where: { houseId, status: "settled", result4: { not: null } },
    orderBy: { settledAt: "desc" },
  });
  if (lastSettled) return lastSettled;

  return getOrCreateOpenDraw(houseId);
}
