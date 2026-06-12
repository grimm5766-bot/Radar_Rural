PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT,
  "nome" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "senhaHash" TEXT NOT NULL,
  "googleSubject" TEXT,
  "avatarUrl" TEXT,
  "perfil" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleSubject_key" ON "User"("googleSubject");
CREATE INDEX IF NOT EXISTS "User_tenantId_perfil_idx" ON "User"("tenantId", "perfil");

CREATE TABLE IF NOT EXISTS "Farm" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "produtorId" TEXT NOT NULL,
  "areaTotalHectares" REAL NOT NULL,
  "regiao" TEXT NOT NULL DEFAULT 'GO',
  "centerLatitude" REAL,
  "centerLongitude" REAL,
  "boundaryJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Farm_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Farm_produtorId_fkey" FOREIGN KEY ("produtorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Farm_tenantId_produtorId_idx" ON "Farm"("tenantId", "produtorId");

CREATE TABLE IF NOT EXISTS "FarmAgronomist" (
  "tenantId" TEXT NOT NULL,
  "farmId" TEXT NOT NULL,
  "agronomistId" TEXT NOT NULL,
  PRIMARY KEY ("farmId", "agronomistId"),
  CONSTRAINT "FarmAgronomist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FarmAgronomist_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FarmAgronomist_agronomistId_fkey" FOREIGN KEY ("agronomistId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "FarmAgronomist_tenantId_agronomistId_idx" ON "FarmAgronomist"("tenantId", "agronomistId");

CREATE TABLE IF NOT EXISTS "FieldPlot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "areaHectares" REAL NOT NULL,
  "farmId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FieldPlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FieldPlot_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "FieldPlot_farmId_nome_key" ON "FieldPlot"("farmId", "nome");
CREATE INDEX IF NOT EXISTS "FieldPlot_tenantId_farmId_idx" ON "FieldPlot"("tenantId", "farmId");

CREATE TABLE IF NOT EXISTS "CropCycle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "farmId" TEXT NOT NULL,
  "dataInicio" DATETIME NOT NULL,
  "dataFimPrevista" DATETIME NOT NULL,
  "cultura" TEXT NOT NULL DEFAULT 'Soja',
  "status" TEXT NOT NULL DEFAULT 'PLANEJADO',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CropCycle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CropCycle_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CropCycle_tenantId_farmId_dataInicio_idx" ON "CropCycle"("tenantId", "farmId", "dataInicio");

CREATE TABLE IF NOT EXISTS "Inspection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "fieldPlotId" TEXT NOT NULL,
  "cropCycleId" TEXT,
  "agronomoId" TEXT NOT NULL,
  "data" DATETIME NOT NULL,
  "diaCiclo" INTEGER NOT NULL,
  "faseFenologica" TEXT NOT NULL,
  "umidadeSolo" REAL NOT NULL,
  "alturaPlanta" REAL NOT NULL,
  "pragas" TEXT NOT NULL,
  "doencas" TEXT NOT NULL,
  "daninhas" TEXT NOT NULL,
  "observacoes" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Inspection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Inspection_fieldPlotId_fkey" FOREIGN KEY ("fieldPlotId") REFERENCES "FieldPlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Inspection_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "CropCycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Inspection_agronomoId_fkey" FOREIGN KEY ("agronomoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Inspection_tenantId_fieldPlotId_data_idx" ON "Inspection"("tenantId", "fieldPlotId", "data");
CREATE INDEX IF NOT EXISTS "Inspection_tenantId_agronomoId_idx" ON "Inspection"("tenantId", "agronomoId");

CREATE TABLE IF NOT EXISTS "Sampling" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "plantasPorMetro" REAL NOT NULL,
  "vagensPorPlanta" REAL NOT NULL,
  "graosPorVagem" REAL NOT NULL,
  "pesoMilGraos" REAL NOT NULL,
  "areaTalhaoHectares" REAL NOT NULL,
  "produtividadeKgHa" REAL NOT NULL,
  "produtividadeSacasHa" REAL NOT NULL,
  "estimativaTotalKg" REAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Sampling_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Sampling_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Sampling_inspectionId_key" ON "Sampling"("inspectionId");
CREATE INDEX IF NOT EXISTS "Sampling_tenantId_idx" ON "Sampling"("tenantId");

CREATE TABLE IF NOT EXISTS "Occurrence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "fieldPlotId" TEXT NOT NULL,
  "inspectionId" TEXT,
  "tipo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "gravidade" TEXT NOT NULL,
  "dataOcorrencia" DATETIME NOT NULL,
  "descricao" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ABERTA',
  "impactoEstimado" REAL NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Occurrence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Occurrence_fieldPlotId_fkey" FOREIGN KEY ("fieldPlotId") REFERENCES "FieldPlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Occurrence_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Occurrence_tenantId_fieldPlotId_dataOcorrencia_idx" ON "Occurrence"("tenantId", "fieldPlotId", "dataOcorrencia");
CREATE INDEX IF NOT EXISTS "Occurrence_tenantId_status_gravidade_idx" ON "Occurrence"("tenantId", "status", "gravidade");

CREATE TABLE IF NOT EXISTS "ManagementCall" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "occurrenceId" TEXT NOT NULL,
  "tipoManejo" TEXT NOT NULL,
  "dataAbertura" DATETIME NOT NULL,
  "dataFechamento" DATETIME,
  "responsavel" TEXT NOT NULL,
  "observacoes" TEXT NOT NULL,
  "diasResposta" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ManagementCall_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ManagementCall_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "Occurrence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ManagementCall_tenantId_occurrenceId_idx" ON "ManagementCall"("tenantId", "occurrenceId");

CREATE TABLE IF NOT EXISTS "GeoPhoto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "inspectionId" TEXT,
  "occurrenceId" TEXT,
  "urlImagem" TEXT NOT NULL,
  "latitude" REAL NOT NULL,
  "longitude" REAL NOT NULL,
  "data" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeoPhoto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GeoPhoto_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GeoPhoto_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "Occurrence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "GeoPhoto_tenantId_inspectionId_idx" ON "GeoPhoto"("tenantId", "inspectionId");
CREATE INDEX IF NOT EXISTS "GeoPhoto_tenantId_occurrenceId_idx" ON "GeoPhoto"("tenantId", "occurrenceId");

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "mensagem" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'INFO',
  "lida" BOOLEAN NOT NULL DEFAULT false,
  "dataCriacao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Notification_tenantId_userId_lida_dataCriacao_idx" ON "Notification"("tenantId", "userId", "lida", "dataCriacao");
