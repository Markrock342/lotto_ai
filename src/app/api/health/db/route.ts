import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** ทด DB บน Vercel — เปิด /api/health/db */
export async function GET() {
  const checks: Record<string, string> = {
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
    SESSION_SECRET: process.env.SESSION_SECRET ? "set" : "MISSING",
  };

  try {
    const count = await prisma.user.count();
    return NextResponse.json({ ok: true, checks, userCount: count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, checks, error: msg.slice(0, 300) },
      { status: 503 },
    );
  }
}
