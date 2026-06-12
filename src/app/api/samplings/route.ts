import { UserRole } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { apiError, parseRequiredNumber, requiredText } from "@/lib/api-response";
import { canAccessInspection } from "@/lib/access";
import { requireApiUser } from "@/lib/auth";
import { calculateProductivity } from "@/lib/agriculture";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await requireApiUser();
  if (!session) return apiError("Não autorizado.", 401);
  if (session.perfil !== UserRole.AGRONOMO) {
    return apiError("Apenas agrônomos podem registrar amostragens.", 403);
  }

  try {
    const body = await request.json();
    const inspectionId = requiredText(body.inspectionId, "vistoria");
    if (!(await canAccessInspection(session, inspectionId))) {
      return apiError("Vistoria não encontrada ou sem acesso.", 403);
    }
    const inspection = await prisma.inspection.findUniqueOrThrow({
      where: { id: inspectionId },
      include: { fieldPlot: true },
    });
    const input = {
      plantasPorMetro: parseRequiredNumber(body.plantasPorMetro, "plantas por metro"),
      vagensPorPlanta: parseRequiredNumber(body.vagensPorPlanta, "vagens por planta"),
      graosPorVagem: parseRequiredNumber(body.graosPorVagem, "grãos por vagem"),
      pesoMilGraos: parseRequiredNumber(body.pesoMilGraos, "PMG"),
      areaHectares: inspection.fieldPlot.areaHectares,
    };
    const result = calculateProductivity(input);
    const sampling = await prisma.sampling.create({
      data: {
        tenantId: inspection.tenantId,
        inspectionId,
        plantasPorMetro: input.plantasPorMetro,
        vagensPorPlanta: input.vagensPorPlanta,
        graosPorVagem: input.graosPorVagem,
        pesoMilGraos: input.pesoMilGraos,
        areaTalhaoHectares: input.areaHectares,
        produtividadeKgHa: result.kgPerHectare,
        produtividadeSacasHa: result.bagsPerHectare,
        estimativaTotalKg: result.totalKg,
      },
    });
    return NextResponse.json(sampling, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Não foi possível registrar a amostragem.");
  }
}
