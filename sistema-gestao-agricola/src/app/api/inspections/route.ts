import { UserRole } from "@/generated/prisma/client";
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
    return apiError("Apenas agrônomos podem registrar vistorias.", 403);
  }

  try {
    const body = await request.json();
    const fieldPlotId = requiredText(body.fieldPlotId, "talhão");
    if (!(await canAccessPlot(session, fieldPlotId))) {
      return apiError("Talhão não encontrado ou sem acesso.", 403);
    }
    const plot = await prisma.fieldPlot.findUniqueOrThrow({
      where: { id: fieldPlotId },
      select: { tenantId: true, farmId: true },
    });
    const cropCycleId = body.cropCycleId ? String(body.cropCycleId) : null;
    if (cropCycleId) {
      const cycle = await prisma.cropCycle.findFirst({
        where: {
          id: cropCycleId,
          tenantId: plot.tenantId,
          farmId: plot.farmId,
        },
        select: { id: true },
      });
      if (!cycle) return apiError("O ciclo não pertence à fazenda do talhão.");
    }
    const diaCiclo = parseRequiredNumber(body.diaCiclo, "dia do ciclo");
    if (diaCiclo < 1 || diaCiclo > 120) {
      return apiError("O dia do ciclo deve estar entre 1 e 120.");
    }

    const inspection = await prisma.inspection.create({
      data: {
        tenantId: plot.tenantId,
        fieldPlotId,
        cropCycleId,
        agronomoId: session.id,
        data: parseRequiredDate(body.data, "data"),
        diaCiclo,
        faseFenologica: requiredText(body.faseFenologica, "fase fenológica"),
        umidadeSolo: parseRequiredNumber(body.umidadeSolo, "umidade do solo"),
        alturaPlanta: parseRequiredNumber(body.alturaPlanta, "altura da planta"),
        pragas: requiredText(body.pragas, "pragas"),
        doencas: requiredText(body.doencas, "doenças"),
        daninhas: requiredText(body.daninhas, "plantas daninhas"),
        observacoes: requiredText(body.observacoes, "observações"),
      },
    });
    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Não foi possível registrar a vistoria.");
  }
}
