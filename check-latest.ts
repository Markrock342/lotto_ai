import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestBet = await prisma.bet.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (latestBet) {
    console.log(`Latest bet created at: ${latestBet.createdAt.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
  } else {
    console.log("No bets found.");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
