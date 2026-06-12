import { UserRole } from "@/generated/prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { apiError, requiredText } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await requireApiUser();
  if (!session) return apiError("Não autorizado.", 401);
  if (session.perfil !== UserRole.DESENVOLVEDOR) {
    return apiError("Apenas desenvolvedores podem administrar usuários.", 403);
  }

  try {
    const body = await request.json();
    const nome = requiredText(body.nome, "nome");
    const email = requiredText(body.email, "e-mail").toLowerCase();
    const senha = requiredText(body.senha, "senha");
    const perfil = String(body.perfil) as UserRole;
    if (!Object.values(UserRole).includes(perfil)) {
      return apiError("Perfil de usuário inválido.");
    }
    if (senha.length < 6) return apiError("A senha deve ter pelo menos 6 caracteres.");
    const tenantId =
      perfil === UserRole.DESENVOLVEDOR
        ? null
        : requiredText(body.tenantId, "tenant");
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return apiError("Tenant não encontrado.");
    }

    const user = await prisma.user.create({
      data: {
        tenantId,
        nome,
        email,
        senhaHash: await hash(senha, 12),
        perfil,
      },
      select: { id: true, tenantId: true, nome: true, email: true, perfil: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return apiError("Já existe um usuário com este e-mail.");
    }
    return apiError(error instanceof Error ? error.message : "Não foi possível criar o usuário.");
  }
}
