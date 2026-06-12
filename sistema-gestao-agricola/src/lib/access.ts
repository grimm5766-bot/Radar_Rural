import { Prisma, UserRole } from "@/generated/prisma/client";
import { SessionUser } from "./auth";
import { prisma } from "./prisma";

export function accessibleFarmWhere(
  user: SessionUser,
): Prisma.FarmWhereInput {
  if (user.perfil === UserRole.DESENVOLVEDOR) return {};
  if (!user.tenantId) return { id: "__sem_tenant__" };
  return user.perfil === UserRole.PRODUTOR
    ? { tenantId: user.tenantId, produtorId: user.id }
    : {
        tenantId: user.tenantId,
        agronomists: {
          some: { tenantId: user.tenantId, agronomistId: user.id },
        },
      };
}

export async function canAccessFarm(user: SessionUser, farmId: string) {
  return Boolean(
    await prisma.farm.findFirst({
      where: { id: farmId, ...accessibleFarmWhere(user) },
      select: { id: true },
    }),
  );
}

export async function canAccessPlot(user: SessionUser, fieldPlotId: string) {
  return Boolean(
    await prisma.fieldPlot.findFirst({
      where: {
        id: fieldPlotId,
        farm: accessibleFarmWhere(user),
      },
      select: { id: true },
    }),
  );
}

export async function canAccessInspection(
  user: SessionUser,
  inspectionId: string,
) {
  return Boolean(
    await prisma.inspection.findFirst({
      where: {
        id: inspectionId,
        fieldPlot: { farm: accessibleFarmWhere(user) },
      },
      select: { id: true },
    }),
  );
}

export async function canAccessOccurrence(
  user: SessionUser,
  occurrenceId: string,
) {
  return Boolean(
    await prisma.occurrence.findFirst({
      where: {
        id: occurrenceId,
        fieldPlot: { farm: accessibleFarmWhere(user) },
      },
      select: { id: true },
    }),
  );
}
