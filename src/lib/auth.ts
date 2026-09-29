import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { Role, User } from "@prisma/client";

const SESSION_COOKIE = "relay_session";
const SESSION_DAYS = 14;

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const raw = randomBytes(32).toString("hex");
  const token = hashToken(raw);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return raw;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (raw) {
    await prisma.session.deleteMany({ where: { token: hashToken(raw) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export type AuthUser = User & {
  memberships: {
    id: string;
    role: Role;
    workspaceId: string;
    workspace: { id: string; name: string; slug: string };
  }[];
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = await prisma.session.findUnique({
    where: { token: hashToken(raw) },
    include: {
      user: {
        include: {
          memberships: {
            where: { inviteState: "ACCEPTED" },
            include: {
              workspace: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "workspace"
  );
}
