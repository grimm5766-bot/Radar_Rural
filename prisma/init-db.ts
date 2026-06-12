import "dotenv/config";
import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const configuredUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const relativePath = configuredUrl.replace(/^file:(\/\/\/)?/, "");
const databasePath = resolve(relativePath);

mkdirSync(dirname(databasePath), { recursive: true });
const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

// Compatibilidade para bancos locais criados por versões anteriores do MVP.
const hasLegacySchema = database
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User'")
  .get();
if (hasLegacySchema) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS "Tenant" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "nome" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "ativo" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);
  ensureColumn("User", "tenantId", "TEXT");
  ensureColumn("User", "googleSubject", "TEXT");
  ensureColumn("User", "avatarUrl", "TEXT");
  ensureColumn("Farm", "tenantId", "TEXT");
  ensureColumn("Farm", "centerLatitude", "REAL");
  ensureColumn("Farm", "centerLongitude", "REAL");
  ensureColumn("Farm", "boundaryJson", "TEXT");
  for (const table of [
    "FarmAgronomist",
    "FieldPlot",
    "CropCycle",
    "Inspection",
    "Sampling",
    "Occurrence",
    "ManagementCall",
    "GeoPhoto",
    "Notification",
  ]) {
    ensureColumn(table, "tenantId", "TEXT");
  }
}
database.exec(readFileSync(resolve("prisma/init.sql"), "utf8"));
database.close();

console.log(`Banco SQLite inicializado em ${databasePath}`);

function ensureColumn(table: string, column: string, type: string) {
  const columns = database.prepare(`PRAGMA table_info("${table}")`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((item) => item.name === column)) {
    database.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
  }
}
