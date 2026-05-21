/**
 * สำรองข้อมูลเป็น JSON ในโฟลเดอร์ backups/
 * ใช้: npm run db:backup
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [houses, users, draws, bets, numberLimits] = await Promise.all([
    prisma.house.findMany(),
    prisma.user.findMany(),
    prisma.draw.findMany(),
    prisma.bet.findMany(),
    prisma.numberLimit.findMany(),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: {
      houses: houses.length,
      users: users.length,
      draws: draws.length,
      bets: bets.length,
      limits: numberLimits.length,
    },
    houses,
    users,
    draws,
    bets,
    numberLimits,
  };

  const dir = path.join(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `backup-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Backup saved: ${file}`);
  console.log(
    `Records: ${payload.counts.bets} bets, ${payload.counts.draws} draws`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
