import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { effectivePermissions } from "./permissions";

function requiredAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return "build-time-placeholder-secret-min-32-chars-long-1234567890";
    }
    throw new Error("AUTH_SECRET must be set in .env to a strong random string of at least 32 characters.");
  }
  return secret;
}

const AUTH_SECRET = requiredAuthSecret();

const COOKIE_NAME = "fx3.session";

export type SessionPayload = {
  userId: string;
  username: string;
  fullName: string;
  role: string;
};

export async function signIn(username: string, password: string): Promise<SessionPayload | null> {
  const user = await db.user.findUnique({ where: { username } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) return null;

  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  };
  const token = jwt.sign(payload, AUTH_SECRET, { expiresIn: 604800 });
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 604800 });
  return payload;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, AUTH_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  return session || redirect("/signin");
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/dashboard");
  return session;
}

export async function assertSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function assertAdmin() {
  const session = await assertSession();
  if (session.role !== "ADMIN") throw new Error("Forbidden: admin only");
  return session;
}

export async function getSessionPermissions(): Promise<Set<string>> {
  const session = await getSession();
  if (!session) return new Set();
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, permissions: true, isActive: true },
  });
  return user && user.isActive ? effectivePermissions(user.role, user.permissions) : new Set();
}

export async function hasPermission(key: string): Promise<boolean> {
  return (await getSessionPermissions()).has(key);
}

export async function requirePermission(key: string) {
  const session = await requireSession();
  const perms = await getSessionPermissions();
  if (!perms.has(key)) redirect("/dashboard");
  return session;
}

export async function assertPermission(key: string) {
  const session = await assertSession();
  const perms = await getSessionPermissions();
  if (!perms.has(key)) throw new Error(`Forbidden: missing permission "${key}"`);
  return session;
}
