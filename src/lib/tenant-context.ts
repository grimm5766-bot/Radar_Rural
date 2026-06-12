import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Contexto preparado para PostgreSQL RLS. No SQLite local, o isolamento continua
 * sendo aplicado pelos filtros de acesso da aplicação.
 */
export async function withTenantRls<T>(
  user: SessionUser,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if (process.env.DATABASE_PROVIDER !== "postgresql") {
    return operation(prisma as unknown as Prisma.TransactionClient);
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${user.tenantId ?? ""}, true)`;
    await tx.$executeRaw`SELECT set_config('app.is_developer', ${user.perfil === "DESENVOLVEDOR" ? "true" : "false"}, true)`;
    return operation(tx);
  });
}

export async function withAuthLookup<T>(
  email: string,
  googleSubject: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if (process.env.DATABASE_PROVIDER !== "postgresql") {
    return operation(prisma as unknown as Prisma.TransactionClient);
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.login_email', ${email}, true)`;
    await tx.$executeRaw`SELECT set_config('app.google_subject', ${googleSubject}, true)`;
    return operation(tx);
  });
}
