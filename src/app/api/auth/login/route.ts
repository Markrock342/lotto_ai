import { NextResponse } from "next/server";
import { createSession, verifyLogin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    if (!body.username?.trim() || !body.password) {
      return NextResponse.json(
        { error: "กรอกชื่อผู้ใช้และรหัสผ่าน" },
        { status: 400 },
      );
    }

    const user = await verifyLogin(
      body.username.trim().toLowerCase(),
      body.password,
    );
    if (!user) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    await createSession({
      id: user.id,
      houseId: user.houseId,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    return NextResponse.json({
      ok: true,
      user: {
        displayName: user.displayName,
        role: user.role,
        houseName: user.house.name,
      },
    });
  } catch (e) {
    console.error("[POST /api/auth/login]", e);
    const msg = e instanceof Error ? e.message : String(e);

    if (msg.includes("SESSION_SECRET")) {
      return NextResponse.json(
        { error: "Vercel ยังไม่มี SESSION_SECRET — คัดลอกจาก .env แล้ว Redeploy" },
        { status: 503 },
      );
    }
    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: "Vercel ยังไม่มี DATABASE_URL — คัดลอกจาก .env แล้ว Redeploy" },
        { status: 503 },
      );
    }
    if (
      msg.includes("max clients") ||
      msg.includes("EMAXCONNSESSION") ||
      msg.includes("Too many connections")
    ) {
      return NextResponse.json(
        {
          error:
            "DB เต็ม — ปิด npm run dev บน Mac, รอ 2 นาที, ใส่ ?connection_limit=1 ใน DATABASE_URL",
        },
        { status: 503 },
      );
    }
    if (
      msg.includes("Can't reach database") ||
      msg.includes("P1001") ||
      msg.includes("invalid port") ||
      msg.includes("authentication failed")
    ) {
      return NextResponse.json(
        {
          error:
            "DATABASE_URL ผิด — ไป Supabase Connect → URI Session pooler :5432 คัดลอกใหม่ + ?connection_limit=1",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "เซิร์ฟเวอร์ขัดข้อง — เปิด /api/health/db ดูรายละเอียด" },
      { status: 500 },
    );
  }
}
