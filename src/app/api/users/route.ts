import { NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { houseId: session.houseId },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users, maxUsers: 5 });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });
  }

  const count = await prisma.user.count({
    where: { houseId: session.houseId },
  });
  if (count >= 5) {
    return NextResponse.json(
      { error: "รองรับสูงสุด 5 บัญชี (เจ้า + ลูกมือ 3–4 + สำรอง)" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as {
    username?: string;
    password?: string;
    displayName?: string;
    role?: string;
  };

  if (!body.username?.trim() || !body.password || body.password.length < 4) {
    return NextResponse.json(
      { error: "กรอกชื่อผู้ใช้และรหัสผ่าน (อย่างน้อย 4 ตัว)" },
      { status: 400 },
    );
  }

  const exists = await prisma.user.findFirst({
    where: { houseId: session.houseId, username: body.username.trim() },
  });
  if (exists) {
    return NextResponse.json({ error: "ชื่อผู้ใช้ซ้ำ" }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      houseId: session.houseId,
      username: body.username.trim(),
      passwordHash: await hashPassword(body.password),
      displayName: body.displayName?.trim() || body.username.trim(),
      role: body.role === "admin" ? "admin" : "staff",
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
    },
  });

  return NextResponse.json({ user });
}
