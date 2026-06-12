import { UserRole } from "@/generated/prisma/client";
import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withAuthLookup } from "./tenant-context";

const COOKIE_NAME = "switch-rural-session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "switch-rural-dev-secret-change-me",
);

export type SessionUser = {
  id: string;
  tenantId: string | null;
  nome: string;
  email: string;
  perfil: UserRole;
};

export async function authenticate(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await withAuthLookup(normalizedEmail, "", (db) =>
    db.user.findUnique({
      where: { email: normalizedEmail },
    }),
  );
  if (!user || !(await compare(password, user.senhaHash))) return null;
  return user;
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    tenantId: user.tenantId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || !payload.nome || !payload.email || !payload.perfil) {
      return null;
    }
    return {
      id: payload.sub,
      nome: String(payload.nome),
      email: String(payload.email),
      perfil: payload.perfil as UserRole,
      tenantId: payload.tenantId ? String(payload.tenantId) : null,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireApiUser() {
  return getSessionUser();
}

export async function requireDeveloper() {
  const user = await requireUser();
  if (user.perfil !== UserRole.DESENVOLVEDOR) redirect("/dashboard");
  return user;
}
