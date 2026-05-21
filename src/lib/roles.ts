export const ROLES = ["admin", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSION_LABELS = {
  "bets:write": "คีย์ / แก้ / ยกเลิกโพย",
  "bets:read": "ดูโพยและสรุปยอด",
  "reports:read": "ดูรายงาน / บิลย้อนหลัง",
  "results:read": "ดูผลออกและตรวจรางวัล",
  "results:settle": "บันทึกผลออก / ปิดงวด",
  "draw:manage": "เปิดงวดใหม่",
  "limits:read": "ดูเพดานเลข",
  "limits:write": "ตั้งเพดานเลข",
  "settings:read": "ดูตั้งค่าเรท",
  "settings:write": "แก้เรทและตั้งค่าบ้าน",
  "users:manage": "จัดการผู้ใช้ / รีเซ็ตรหัส",
  "password:change": "เปลี่ยนรหัสผ่านตัวเอง",
} as const;

export type Permission = keyof typeof PERMISSION_LABELS;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    "bets:write",
    "bets:read",
    "reports:read",
    "results:read",
    "results:settle",
    "draw:manage",
    "limits:read",
    "limits:write",
    "settings:read",
    "settings:write",
    "users:manage",
    "password:change",
  ],
  staff: [
    "bets:write",
    "bets:read",
    "reports:read",
    "results:read",
    "limits:read",
    "settings:read",
    "password:change",
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "เจ้ามือ",
  staff: "ลูกมือ",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin:
    "ตั้งค่าเรท · ออกผล · จัดการผู้ใช้ — ใช้บัญชีเดียว ไม่แชร์ให้ลูกมือ",
  staff:
    "คีย์โพย · ดูยอด/รายงาน — 1 iPad ต่อ 1 บัญชี (staff1, staff2 …)",
};

export function isRole(value: string): value is Role {
  return value === "admin" || value === "staff";
}

export function hasPermission(role: string, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function listPermissions(role: string): Permission[] {
  if (!isRole(role)) return [];
  return [...ROLE_PERMISSIONS[role]];
}
