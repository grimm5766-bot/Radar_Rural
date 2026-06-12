import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!process.env.VERCEL) return "file:./prisma/dev.db";

  const bundledDatabase = join(process.cwd(), "prisma", "deployment.db");
  const temporaryDatabase = join(
    tmpdir(),
    `radar-rural-${process.env.VERCEL_DEPLOYMENT_ID ?? "preview"}.db`,
  );
  if (!existsSync(temporaryDatabase)) {
    copyFileSync(bundledDatabase, temporaryDatabase);
  }
  return `file:${temporaryDatabase}`;
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl() });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
