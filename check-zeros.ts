import { prisma } from './src/lib/db';

async function main() {
  const draw = await prisma.draw.findFirst({ where: { status: 'open' } });
  const bets = await prisma.bet.findMany({ where: { drawId: draw!.id, status: 'active' } });
  const startsWith0 = bets.filter(b => b.number.startsWith('0')).length;
  const startsWith00 = bets.filter(b => b.number.startsWith('00')).length;
  const startsWith000 = bets.filter(b => b.number.startsWith('000')).length;
  console.log(`Starts with 0: ${startsWith0}`);
  console.log(`Starts with 00: ${startsWith00}`);
  console.log(`Starts with 000: ${startsWith000}`);
}
main();
