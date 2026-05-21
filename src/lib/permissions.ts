import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { getSession } from "@/lib/auth";
import { type Permission, hasPermission } from "@/lib/roles";

export async function requireSession(
  permission?: Permission,
): Promise<
  | { session: SessionUser; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 }),
    };
  }
  if (permission && !hasPermission(session.role, permission)) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "ไม่มีสิทธิ์ทำรายการนี้ (เฉพาะเจ้ามือ)" },
        { status: 403 },
      ),
    };
  }
  return { session, error: null };
}
