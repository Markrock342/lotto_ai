import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  listPermissions,
  PERMISSION_LABELS,
  ROLE_LABELS,
  type Permission,
} from "@/lib/roles";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = listPermissions(session.role);

  return NextResponse.json({
    user: session,
    roleLabel: ROLE_LABELS[session.role as keyof typeof ROLE_LABELS] ?? session.role,
    permissions,
    permissionLabels: Object.fromEntries(
      permissions.map((p) => [p, PERMISSION_LABELS[p as Permission]]),
    ) as Record<Permission, string>,
  });
}
