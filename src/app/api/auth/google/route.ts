import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";
import { apiError, requiredText } from "@/lib/api-response";
import { createSession } from "@/lib/auth";
import { withAuthLookup, withTenantRls } from "@/lib/tenant-context";

export async function POST(request: Request) {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return apiError("Login Google ainda não foi configurado.", 503);

  try {
    const body = await request.json();
    const credential = requiredText(body.credential, "credencial Google");
    const ticket = await new OAuth2Client(clientId).verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return apiError("A conta Google não possui um e-mail verificado.", 401);
    }

    const email = payload.email.toLowerCase();
    const user = await withAuthLookup(email, payload.sub, (db) =>
      db.user.findFirst({
        where: {
          OR: [{ googleSubject: payload.sub }, { email }],
        },
        include: { tenant: true },
      }),
    );
    if (!user) {
      return apiError(
        "Esta conta Google ainda não foi cadastrada por um administrador.",
        403,
      );
    }
    if (user.tenantId && !user.tenant?.ativo) {
      return apiError("O tenant desta conta está inativo.", 403);
    }

    const linked = await withTenantRls(
      {
        id: user.id,
        tenantId: user.tenantId,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
      },
      (db) =>
        db.user.update({
          where: { id: user.id },
          data: {
            googleSubject: user.googleSubject ?? payload.sub,
            avatarUrl: payload.picture ?? user.avatarUrl,
          },
        }),
    );
    await createSession(linked);
    return NextResponse.json({
      user: {
        id: linked.id,
        tenantId: linked.tenantId,
        nome: linked.nome,
        email: linked.email,
        perfil: linked.perfil,
      },
    });
  } catch {
    return apiError("Não foi possível validar a credencial Google.", 401);
  }
}
