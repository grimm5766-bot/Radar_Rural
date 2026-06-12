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

  try {
    const body = await request.json();
    const farmId = requiredText(body.farmId, "fazenda");
    if (!(await canAccessFarm(session, farmId))) {
      return apiError("Fazenda não encontrada ou sem acesso.", 403);
    }
    const areaHectares = parseRequiredNumber(body.areaHectares, "área");
    const allocated = await prisma.fieldPlot.aggregate({
      where: { farmId },
      _sum: { areaHectares: true },
    });
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmId } });
    if ((allocated._sum.areaHectares ?? 0) + areaHectares > farm.areaTotalHectares) {
      return apiError("A soma dos talhões ultrapassa a área total da fazenda.");
    }

    const plot = await prisma.fieldPlot.create({
      data: {
        tenantId: farm.tenantId,
        farmId,
        nome: requiredText(body.nome, "nome"),
        areaHectares,
      },
    });
    return NextResponse.json(plot, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Não foi possível criar o talhão.");
  }
}
