import { prisma } from "./db";
import { getOrCreateOpenDraw } from "./house-config";

/** งวดที่กำลังรับโพย (open) */
export async function getActiveOpenDraw(houseId: string) {
  return prisma.draw.findFirst({
    where: { houseId, status: "open" },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * งวดที่แสดงบนหน้าคีย์/แดชบอร์ด
 * ไม่สร้างงวด open ใหม่หลังออกผล — ต้องกด「งวดใหม่」ก่อน
 */
export async function getDisplayDraw(houseId: string) {
  const open = await getActiveOpenDraw(houseId);
  if (open) return open;

  const latest = await prisma.draw.findFirst({
    where: { houseId },
    orderBy: { createdAt: "desc" },
  });
  if (latest) return latest;

  return getOrCreateOpenDraw(houseId);
}

/** งวดล่าสุดที่มีโพย — สำหรับออกผล */
export async function getDrawForSettlement(houseId: string) {
  const open = await getActiveOpenDraw(houseId);
  if (open) {
    const count = await prisma.bet.count({
      where: { drawId: open.id, status: "active" },
    });
    if (count > 0) return open;
  }

  const lastSettled = await prisma.draw.findFirst({
    where: { houseId, status: "settled", result4: { not: null } },
    orderBy: { settledAt: "desc" },
  });
  if (lastSettled) return lastSettled;

  return getOrCreateOpenDraw(houseId);
}
