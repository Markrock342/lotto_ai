import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_RATES = {
  fourStraight: 120_000,
  fourTod: 4_000,
  threeStraight: 35_000,
  threeTod: 3_000,
  threeFront: 2_000,
  twoFront: 1_500,
  twoBack: 1_500,
};

async function main() {
  await prisma.bet.deleteMany();
  await prisma.draw.deleteMany();
  await prisma.numberLimit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.house.deleteMany();

  const house = await prisma.house.create({
    data: {
      name: "บ้านหวยลาว",
      pricePerSet: 120,
      defaultMaxSets: null,
      defaultMaxRisk: null,
      ratesJson: JSON.stringify(DEFAULT_RATES),
    },
  });

  const hash = await bcrypt.hash("1234", 10);

  await prisma.user.createMany({
    data: [
      {
        houseId: house.id,
        username: "admin",
        passwordHash: hash,
        displayName: "เจ้ามือ",
        role: "admin",
      },
      {
        houseId: house.id,
        username: "staff1",
        passwordHash: hash,
        displayName: "ลูกมือ 1",
        role: "staff",
      },
      {
        houseId: house.id,
        username: "staff2",
        passwordHash: hash,
        displayName: "ลูกมือ 2",
        role: "staff",
      },
      {
        houseId: house.id,
        username: "staff3",
        passwordHash: hash,
        displayName: "ลูกมือ 3",
        role: "staff",
      },
    ],
  });

  await prisma.draw.create({
    data: {
      houseId: house.id,
      label: "งวดเริ่มต้น",
      status: "open",
    },
  });

  console.log("Seed OK — house:", house.name);
  console.log("Login: admin / 1234 (และ staff1, staff2, staff3)");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
