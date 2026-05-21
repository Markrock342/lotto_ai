export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัว`;
  }
  if (!/[a-zA-Zก-๙]/.test(password)) {
    return "รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว";
  }
  if (!/\d/.test(password)) {
    return "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว";
  }
  return null;
}

export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (u.length < 3 || u.length > 20) {
    return "ชื่อผู้ใช้ต้องยาว 3–20 ตัว";
  }
  if (!/^[a-z0-9_]+$/.test(u)) {
    return "ชื่อผู้ใช้ใช้ a-z, 0-9, _ เท่านั้น";
  }
  return null;
}
