import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching active bets for the current open draw...");
  
  const openDraw = await prisma.draw.findFirst({
    where: { status: 'open' }
  });

  if (!openDraw) {
    console.log("No open draw found.");
    return;
  }

  const bets = await prisma.bet.findMany({
    where: {
      drawId: openDraw.id,
      status: 'active'
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${bets.length} active bets.`);

  // Group by slipId, number, and amount
  const grouped = new Map<string, typeof bets>();
  for (const bet of bets) {
    const key = `${bet.slipId || 'no-slip'}_${bet.number}_${bet.amount}`;
    const group = grouped.get(key) || [];
    group.push(bet);
    grouped.set(key, group);
  }

  let deletedCount = 0;
  const toDeleteIds: string[] = [];

  for (const [key, group] of grouped.entries()) {
    if (group.length > 1) {
      // Keep the first one, delete the rest
      const [, ...duplicates] = group;
      toDeleteIds.push(...duplicates.map(b => b.id));
    }
  }

  if (toDeleteIds.length > 0) {
    console.log(`Found ${toDeleteIds.length} duplicate bets to delete.`);
    
    // Batch delete
    const result = await prisma.bet.deleteMany({
      where: {
        id: { in: toDeleteIds }
      }
    });
    
    console.log(`Deleted ${result.count} duplicate bets.`);
  } else {
    console.log("No duplicate bets found.");
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
