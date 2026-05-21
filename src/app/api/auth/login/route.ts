import { NextResponse } from "next/server";
import { createSession, verifyLogin } from "@/lib/auth";

export async function POST(request: Request) {
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

  const user = await verifyLogin(body.username.trim().toLowerCase(), body.password);
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
}
