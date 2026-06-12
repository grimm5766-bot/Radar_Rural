import { UserRole } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import {
  apiError,
  parseRequiredDate,
  parseRequiredNumber,
  requiredText,
} from "@/lib/api-response";
import {
  canAccessInspection,
  canAccessOccurrence,
} from "@/lib/access";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await requireApiUser();
  if (!session) return apiError("Não autorizado.", 401);
  if (session.perfil !== UserRole.AGRONOMO) {
    return apiError("Apenas agrônomos podem registrar fotos.", 403);
  }

  try {
    const body = await request.json();
    const inspectionId = body.inspectionId ? String(body.inspectionId) : null;
    const occurrenceId = body.occurrenceId ? String(body.occurrenceId) : null;
    if (!inspectionId && !occurrenceId) {
      return apiError("Relacione a foto a uma vistoria ou ocorrência.");
    }
    if (inspectionId && !(await canAccessInspection(session, inspectionId))) {
      return apiError("Vistoria não encontrada ou sem acesso.", 403);
    }
    if (occurrenceId && !(await canAccessOccurrence(session, occurrenceId))) {
      return apiError("Ocorrência não encontrada ou sem acesso.", 403);
    }
    const related = inspectionId
      ? await prisma.inspection.findUniqueOrThrow({
          where: { id: inspectionId },
          select: { tenantId: true },
        })
      : await prisma.occurrence.findUniqueOrThrow({
          where: { id: occurrenceId! },
          select: { tenantId: true },
        });
    if (inspectionId && occurrenceId) {
      const occurrence = await prisma.occurrence.findUniqueOrThrow({
        where: { id: occurrenceId },
        select: { tenantId: true },
      });
      if (occurrence.tenantId !== related.tenantId) {
        return apiError("Vistoria e ocorrência pertencem a tenants diferentes.");
      }
    }
    const urlImagem = requiredText(body.urlImagem, "imagem");
    if (urlImagem.length > 2_500_000) {
      return apiError("A imagem deve ter no máximo aproximadamente 1,8 MB.");
    }
    const photo = await prisma.geoPhoto.create({
      data: {
        tenantId: related.tenantId,
        inspectionId,
        occurrenceId,
        urlImagem,
        latitude: parseRequiredNumber(body.latitude, "latitude"),
        longitude: parseRequiredNumber(body.longitude, "longitude"),
        data: parseRequiredDate(body.data, "data"),
      },
    });
    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Não foi possível salvar a foto.");
  }
}
