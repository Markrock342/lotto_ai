import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { validatePassword } from "./password";

const COOKIE = "lotto_session";

export type SessionUser = {
  userId: string;
  houseId: string;
  username: string;
  displayName: string;
  role: string;
  houseName: string;
};

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createSession(user: {
  id: string;
  houseId: string;
  username: string;
  displayName: string;
  role: string;
  tokenVersion: number;
}) {
  const token = await new SignJWT({
    userId: user.id,
    houseId: user.houseId,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    tokenVersion: user.tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      include: { house: true },
    });
    if (!user) return null;
    const tokenVersion = payload.tokenVersion as number | undefined;
    if (tokenVersion !== user.tokenVersion) return null;
    return {
      userId: payload.userId as string,
      houseId: payload.houseId as string,
      username: payload.username as string,
      displayName: payload.displayName as string,
      role: payload.role as string,
      houseName: user.house.name,
    };
  } catch {
    return null;
  }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pwErr = validatePassword(newPassword);
  if (pwErr) return { ok: false, error: pwErr };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "ไม่พบผู้ใช้" };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      tokenVersion: { increment: 1 },
      passwordChangedAt: new Date(),
    },
  });

  return { ok: true };
}

/** เจ้ามือรีเซ็ตรหัสลูกมือ — บังคับ logout ทุกเครื่องของเป้าหมาย */
export async function adminResetPassword(
  targetUserId: string,
  houseId: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pwErr = validatePassword(newPassword);
  if (pwErr) return { ok: false, error: pwErr };

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user || user.houseId !== houseId) {
    return { ok: false, error: "ไม่พบผู้ใช้ในบ้านนี้" };
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash: await hashPassword(newPassword),
      tokenVersion: { increment: 1 },
      passwordChangedAt: new Date(),
    },
  });

  return { ok: true };
}

export async function verifyLogin(username: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { username },
    include: { house: true },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
