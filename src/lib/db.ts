import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });

// บน Vercel ต้อง reuse client — ไม่งั้นกิน Supabase pool (max 15) แล้ว login 500
globalForPrisma.prisma = prisma;
