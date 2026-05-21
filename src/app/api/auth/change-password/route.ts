import { NextResponse } from "next/server";
import { changePassword, createSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validatePassword } from "@/lib/password";
import { requireSession } from "@/lib/permissions";

export async function POST(request: Request) {
  const auth = await requireSession("password:change");
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json(
      { error: "กรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่" },
      { status: 400 },
    );
  }

  const pwErr = validatePassword(body.newPassword);
  if (pwErr) {
    return NextResponse.json({ error: pwErr }, { status: 400 });
  }

  if (body.newPassword !== body.confirmPassword) {
    return NextResponse.json(
      { error: "รหัสผ่านใหม่กับยืนยันไม่ตรงกัน" },
      { status: 400 },
    );
  }

  if (body.currentPassword === body.newPassword) {
    return NextResponse.json(
      { error: "รหัสผ่านใหม่ต้องต่างจากรหัสเดิม" },
      { status: 400 },
    );
  }

  const result = await changePassword(
    auth.session.userId,
    body.currentPassword,
    body.newPassword,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.session.userId },
  });

  await destroySession();
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
    message: "เปลี่ยนรหัสผ่านแล้ว — เครื่องอื่นต้อง login ใหม่",
  });
}
