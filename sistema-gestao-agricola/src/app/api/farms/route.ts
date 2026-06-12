import { UserRole } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import {
  apiError,
  parseRequiredNumber,
  requiredText,
} from "@/lib/api-response";
import { canAccessFarm } from "@/lib/access";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await requireApiUser();
  if (!session) return apiError("Não autorizado.", 401);
  if (session.perfil !== UserRole.PRODUTOR) {
    return apiError("Apenas produtores podem cadastrar fazendas.", 403);
  }

  try {
    if (!session.tenantId) return apiError("Usuário sem tenant configurado.", 403);
    const body = await request.json();
    const agronomistIds = Array.isArray(body.agronomistIds)
      ? body.agronomistIds.map(String)
      : [];
    if (agronomistIds.length) {
      const validAgronomists = await prisma.user.count({
        where: {
          id: { in: agronomistIds },
          tenantId: session.tenantId,
          perfil: UserRole.AGRONOMO,
        },
      });
      if (validAgronomists !== agronomistIds.length) {
        return apiError("Um ou mais agrônomos não pertencem ao seu tenant.");
      }
    }
    const farm = await prisma.farm.create({
      data: {
        tenantId: session.tenantId,
        nome: requiredText(body.nome, "nome"),
        areaTotalHectares: parseRequiredNumber(body.areaTotalHectares, "área total"),
        regiao: requiredText(body.regiao ?? "GO", "região").toUpperCase(),
        produtorId: session.id,
        agronomists: {
          create: agronomistIds.map((agronomistId: string) => ({
            tenantId: session.tenantId!,
            agronomistId,
          })),
        },
      },
    });
    return NextResponse.json(farm, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Não foi possível criar a fazenda.");
  }
}

export async function PATCH(request: Request) {
  const session = await requireApiUser();
  if (!session) return apiError("Não autorizado.", 401);

  try {
    const body = await request.json();
    const id = requiredText(body.id, "fazenda");
    const farm = await prisma.farm.findFirst({
      where: { id, ...(session.perfil === UserRole.DESENVOLVEDOR ? {} : { tenantId: session.tenantId ?? "__sem_tenant__" }) },
    });
    if (!farm || !(await canAccessFarm(session, id))) {
      return apiError("Fazenda não encontrada ou sem acesso.", 403);
    }
    const boundary = Array.isArray(body.boundary) ? body.boundary : [];
    if (boundary.length < 3) {
      return apiError("A demarcação precisa ter pelo menos três pontos.");
    }
    const points: Array<{ lat: number; lng: number }> = boundary.map(
      (point: { lat?: unknown; lng?: unknown }) => ({
        lat: parseRequiredNumber(point.lat, "latitude"),
        lng: parseRequiredNumber(point.lng, "longitude"),
      }),
    );
    const centerLatitude =
      points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const centerLongitude =
      points.reduce((sum, point) => sum + point.lng, 0) / points.length;
    const updated = await prisma.farm.update({
      where: { id },
      data: {
        boundaryJson: JSON.stringify(points),
        centerLatitude,
        centerLongitude,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Não foi possível salvar a demarcação.");
  }
}
