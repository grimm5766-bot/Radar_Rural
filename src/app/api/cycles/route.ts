import { CycleStatus } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import {
  apiError,
  parseRequiredDate,
  requiredText,
} from "@/lib/api-response";
import { canAccessFarm } from "@/lib/access";
import { requireApiUser } from "@/lib/auth";
import { validateSanitaryBreak } from "@/lib/agriculture";
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
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmId } });
    const dataInicio = parseRequiredDate(body.dataInicio, "data de início");
    const sanitaryBreak = validateSanitaryBreak(dataInicio, farm.regiao);
    if (!sanitaryBreak.valid) return apiError(sanitaryBreak.message);

    const dataFimPrevista = new Date(dataInicio);
    dataFimPrevista.setUTCDate(dataFimPrevista.getUTCDate() + 119);
    const status = String(body.status ?? CycleStatus.ATIVO) as CycleStatus;
    if (!Object.values(CycleStatus).includes(status)) {
      return apiError("Status do ciclo inválido.");
    }
    const cycle = await prisma.cropCycle.create({
      data: {
        tenantId: farm.tenantId,
        farmId,
        dataInicio,
        dataFimPrevista,
        cultura: requiredText(body.cultura ?? "Soja", "cultura"),
        status,
      },
    });
    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Não foi possível criar o ciclo.");
  }
}
