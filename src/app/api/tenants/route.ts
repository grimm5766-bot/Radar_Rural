import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { apiError, requiredText } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await requireApiUser();
  if (!session) return apiError("Não autorizado.", 401);
  if (session.perfil !== UserRole.DESENVOLVEDOR) {
    return apiError("Apenas desenvolvedores podem criar tenants.", 403);
  }

  try {
    const body = await request.json();
    const nome = requiredText(body.nome, "nome");
    const requestedSlug = String(body.slug ?? nome);
    const slug = requestedSlug
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!slug) return apiError("Informe um slug válido.");

    const tenant = await prisma.tenant.create({
      data: { nome, slug },
    });
    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return apiError("Já existe um tenant com este slug.");
    }
    return apiError(error instanceof Error ? error.message : "Não foi possível criar o tenant.");
  }
}
