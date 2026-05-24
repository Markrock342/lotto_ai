import { prisma } from './src/lib/db';

async function main() {
  const draw = await prisma.draw.findFirst({ where: { status: 'open' } });
  if (!draw) return console.log("No open draw");
  const bets = await prisma.bet.findMany({ where: { drawId: draw.id, status: 'active' } });
  console.log(`Total active bets: ${bets.length}`);
  
  const map2Front = new Map();
  const map2Back = new Map();
  
  for (const b of bets) {
    const front = b.number.slice(0, 2);
    const back = b.number.slice(-2);
    map2Front.set(front, (map2Front.get(front) || 0) + 1);
    map2Back.set(back, (map2Back.get(back) || 0) + 1);
  }
  
  console.log(`Total sets in 2 Front:`, Array.from(map2Front.values()).reduce((a,b)=>a+b,0));
  console.log(`Total sets in 2 Back:`, Array.from(map2Back.values()).reduce((a,b)=>a+b,0));
  
  // Show top 5 for 2 Front
  const topFront = Array.from(map2Front.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 5);
  console.log("Top 5 2-Front:", topFront);
}
main();
