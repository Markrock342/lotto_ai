import { NextResponse } from "next/server";
import { adminResetPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/permissions";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireSession("users:manage");
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as { newPassword?: string };

  if (!body.newPassword) {
    return NextResponse.json({ error: "กรอกรหัสผ่านใหม่" }, { status: 400 });
  }

  if (id === auth.session.userId) {
    return NextResponse.json(
      { error: "เปลี่ยนรหัสตัวเองที่ ตั้งค่า → เปลี่ยนรหัสผ่าน" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findFirst({
    where: { id, houseId: auth.session.houseId },
  });
  if (!target) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  }

  const result = await adminResetPassword(
    id,
    auth.session.houseId,
    body.newPassword,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: `รีเซ็ตรหัส @${target.username} แล้ว — ต้อง login ใหม่ทุกเครื่อง`,
  });
}
