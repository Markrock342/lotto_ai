import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validatePassword, validateUsername } from "@/lib/password";
import { requireSession } from "@/lib/permissions";

export async function GET() {
  const auth = await requireSession("users:manage");
  if (auth.error) return auth.error;
  const session = auth.session;

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
  const auth = await requireSession("users:manage");
  if (auth.error) return auth.error;
  const session = auth.session;

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

  const username = body.username?.trim().toLowerCase() ?? "";
  const userErr = validateUsername(username);
  if (userErr) {
    return NextResponse.json({ error: userErr }, { status: 400 });
  }
  const pwErr = body.password ? validatePassword(body.password) : "กรอกรหัสผ่าน";
  if (pwErr) {
    return NextResponse.json({ error: pwErr }, { status: 400 });
  }

  const role = body.role === "admin" ? "admin" : "staff";
  if (role === "admin") {
    const adminCount = await prisma.user.count({
      where: { houseId: session.houseId, role: "admin" },
    });
    if (adminCount >= 2) {
      return NextResponse.json(
        { error: "มีบัญชีเจ้ามือครบแล้ว (สูงสุด 2)" },
        { status: 400 },
      );
    }
  }

  const exists = await prisma.user.findFirst({
    where: { houseId: session.houseId, username },
  });
  if (exists) {
    return NextResponse.json({ error: "ชื่อผู้ใช้ซ้ำ" }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      houseId: session.houseId,
      username,
      passwordHash: await hashPassword(body.password!),
      displayName: body.displayName?.trim() || username,
      role,
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
