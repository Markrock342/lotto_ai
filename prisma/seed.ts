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
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@2026";
  const staffPassword = process.env.SEED_STAFF_PASSWORD ?? "Staff@2026";

  await prisma.bet.deleteMany();
  await prisma.draw.deleteMany();
  await prisma.numberLimit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.house.deleteMany();

  const house = await prisma.house.create({
    data: {
      name: "บ้านหวยลาว",
      pricePerSet: 80,
      defaultMaxSets: null,
      defaultMaxRisk: null,
      ratesJson: JSON.stringify(DEFAULT_RATES),
    },
  });

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const staffHash = await bcrypt.hash(staffPassword, 10);

  await prisma.user.createMany({
    data: [
      {
        houseId: house.id,
        username: "admin",
        passwordHash: adminHash,
        displayName: "เจ้ามือ",
        role: "admin",
      },
      {
        houseId: house.id,
        username: "staff1",
        passwordHash: staffHash,
        displayName: "ลูกมือ 1",
        role: "staff",
      },
      {
        houseId: house.id,
        username: "staff2",
        passwordHash: staffHash,
        displayName: "ลูกมือ 2",
        role: "staff",
      },
      {
        houseId: house.id,
        username: "staff3",
        passwordHash: staffHash,
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
  console.log("  admin  →", adminPassword);
  console.log("  staff* →", staffPassword);
  console.log("  ตั้ง SEED_ADMIN_PASSWORD / SEED_STAFF_PASSWORD ใน .env ก่อน production");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
