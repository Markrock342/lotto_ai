import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

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
}) {
  const token = await new SignJWT({
    userId: user.id,
    houseId: user.houseId,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
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
    const house = await prisma.house.findUnique({
      where: { id: payload.houseId as string },
    });
    if (!house) return null;
    return {
      userId: payload.userId as string,
      houseId: payload.houseId as string,
      username: payload.username as string,
      displayName: payload.displayName as string,
      role: payload.role as string,
      houseName: house.name,
    };
  } catch {
    return null;
  }
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
