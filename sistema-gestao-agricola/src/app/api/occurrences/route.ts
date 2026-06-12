import {
  NotificationType,
  OccurrenceStatus,
  OccurrenceType,
  Severity,
  UserRole,
} from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import {
  apiError,
  parseRequiredDate,
  parseRequiredNumber,
  requiredText,
} from "@/lib/api-response";
import { canAccessPlot } from "@/lib/access";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await requireApiUser();
  if (!session) return apiError("Não autorizado.", 401);
  if (session.perfil !== UserRole.AGRONOMO) {
    return apiError("Apenas agrônomos podem registrar ocorrências.", 403);
  }

  try {
    const body = await request.json();
    const fieldPlotId = requiredText(body.fieldPlotId, "talhão");
    if (!(await canAccessPlot(session, fieldPlotId))) {
      return apiError("Talhão não encontrado ou sem acesso.", 403);
    }
    const tipo = String(body.tipo) as OccurrenceType;
    const gravidade = String(body.gravidade) as Severity;
    const status = String(body.status ?? OccurrenceStatus.ABERTA) as OccurrenceStatus;
    if (!Object.values(OccurrenceType).includes(tipo)) return apiError("Tipo inválido.");
    if (!Object.values(Severity).includes(gravidade)) return apiError("Gravidade inválida.");
    if (!Object.values(OccurrenceStatus).includes(status)) return apiError("Status inválido.");

    const plot = await prisma.fieldPlot.findUniqueOrThrow({
      where: { id: fieldPlotId },
      include: { farm: true },
    });
    const inspectionId = body.inspectionId ? String(body.inspectionId) : null;
    if (inspectionId) {
      const inspection = await prisma.inspection.findFirst({
        where: {
          id: inspectionId,
          tenantId: plot.tenantId,
          fieldPlotId,
        },
        select: { id: true },
      });
      if (!inspection) {
        return apiError("A vistoria não pertence ao talhão selecionado.");
      }
    }
    const occurrence = await prisma.$transaction(async (tx) => {
      const created = await tx.occurrence.create({
        data: {
          tenantId: plot.tenantId,
          fieldPlotId,
          inspectionId,
          tipo,
          nome: requiredText(body.nome, "nome"),
          gravidade,
          dataOcorrencia: parseRequiredDate(body.dataOcorrencia, "data"),
          descricao: requiredText(body.descricao, "descrição"),
          status,
          impactoEstimado: parseRequiredNumber(body.impactoEstimado ?? 0, "impacto estimado"),
        },
      });
      if (gravidade === Severity.ALTA) {
        await tx.notification.create({
          data: {
            tenantId: plot.tenantId,
            userId: plot.farm.produtorId,
            titulo: `Alerta crítico em ${plot.nome}`,
            mensagem: `${created.nome} foi registrada com gravidade alta e requer atenção.`,
            tipo: NotificationType.CRITICA,
          },
        });
      }
      return created;
    });
    return NextResponse.json(occurrence, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Não foi possível registrar a ocorrência.");
  }
}
