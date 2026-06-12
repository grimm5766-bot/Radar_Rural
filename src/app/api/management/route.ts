import { OccurrenceStatus, UserRole } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import {
  apiError,
  parseRequiredDate,
  requiredText,
} from "@/lib/api-response";
import { canAccessOccurrence } from "@/lib/access";
import { requireApiUser } from "@/lib/auth";
import { calculateResponseDays } from "@/lib/agriculture";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await requireApiUser();
  if (!session) return apiError("Não autorizado.", 401);
  if (session.perfil !== UserRole.AGRONOMO) {
    return apiError("Apenas agrônomos podem abrir chamados.", 403);
  }

  try {
    const body = await request.json();
    const occurrenceId = requiredText(body.occurrenceId, "ocorrência");
    if (!(await canAccessOccurrence(session, occurrenceId))) {
      return apiError("Ocorrência não encontrada ou sem acesso.", 403);
    }
    const occurrence = await prisma.occurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
      select: { tenantId: true },
    });
    const dataAbertura = parseRequiredDate(body.dataAbertura, "data de abertura");
    const dataFechamento = body.dataFechamento
      ? parseRequiredDate(body.dataFechamento, "data de fechamento")
      : null;
    const call = await prisma.managementCall.create({
      data: {
        tenantId: occurrence.tenantId,
        occurrenceId,
        tipoManejo: requiredText(body.tipoManejo, "tipo de manejo"),
        dataAbertura,
        dataFechamento,
        responsavel: requiredText(body.responsavel, "responsável"),
        observacoes: requiredText(body.observacoes, "observações"),
        diasResposta: calculateResponseDays(dataAbertura, dataFechamento),
      },
    });
    if (dataFechamento) {
      await prisma.occurrence.update({
        where: { id: occurrenceId },
        data: { status: OccurrenceStatus.RESOLVIDA },
      });
    }
    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Não foi possível abrir o chamado.");
  }
}

export async function PATCH(request: Request) {
  const session = await requireApiUser();
  if (!session) return apiError("Não autorizado.", 401);

  try {
    const body = await request.json();
    const id = requiredText(body.id, "chamado");
    const call = await prisma.managementCall.findUnique({
      where: { id },
      include: { occurrence: true },
    });
    if (!call || !(await canAccessOccurrence(session, call.occurrenceId))) {
      return apiError("Chamado não encontrado ou sem acesso.", 403);
    }
    const dataFechamento = parseRequiredDate(body.dataFechamento, "data de fechamento");
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.managementCall.update({
        where: { id },
        data: {
          dataFechamento,
          diasResposta: calculateResponseDays(call.dataAbertura, dataFechamento),
        },
      });
      await tx.occurrence.update({
        where: { id: call.occurrenceId },
        data: { status: OccurrenceStatus.RESOLVIDA },
      });
      return result;
    });
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Não foi possível fechar o chamado.");
  }
}
