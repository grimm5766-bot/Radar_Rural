import { rmSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.VERCEL) {
  const databasePath = resolve("prisma/deployment.db");
  for (const suffix of ["", "-shm", "-wal"]) {
    rmSync(`${databasePath}${suffix}`, { force: true });
  }

  process.env.DATABASE_URL = "file:./prisma/deployment.db";
  await import("./init-db");
  await import("./seed");
}
