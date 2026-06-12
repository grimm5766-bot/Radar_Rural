import "dotenv/config";
import {
  CycleStatus,
  NotificationType,
  OccurrenceStatus,
  OccurrenceType,
  PrismaClient,
  Severity,
  UserRole,
} from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";
import {
  calculateProductivity,
  calculateResponseDays,
} from "../src/lib/agriculture";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.notification.deleteMany();
  await prisma.geoPhoto.deleteMany();
  await prisma.managementCall.deleteMany();
  await prisma.occurrence.deleteMany();
  await prisma.sampling.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.cropCycle.deleteMany();
  await prisma.fieldPlot.deleteMany();
  await prisma.farmAgronomist.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const password = await hash("123456", 12);
  const tenant = await prisma.tenant.create({
    data: {
      nome: "Cooperativa Horizonte",
      slug: "cooperativa-horizonte",
    },
  });
  await prisma.user.create({
    data: {
      nome: "Equipe Switch Rural",
      email: "dev@switchrural.com",
      senhaHash: password,
      perfil: UserRole.DESENVOLVEDOR,
    },
  });
  const producer = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      nome: "Produtor Demonstração",
      email: "produtor@switchrural.com",
      senhaHash: password,
      perfil: UserRole.PRODUTOR,
    },
  });
  const agronomist = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      nome: "Agrônomo Demonstração",
      email: "agronomo@switchrural.com",
      senhaHash: password,
      perfil: UserRole.AGRONOMO,
    },
  });

  const farm = await prisma.farm.create({
    data: {
      tenantId: tenant.id,
      nome: "Fazenda Horizonte",
      produtorId: producer.id,
      areaTotalHectares: 200,
      regiao: "GO",
      centerLatitude: -16.6809,
      centerLongitude: -49.2533,
      boundaryJson: JSON.stringify([
        { lat: -16.6748, lng: -49.2614 },
        { lat: -16.6749, lng: -49.2449 },
        { lat: -16.6871, lng: -49.2447 },
        { lat: -16.6872, lng: -49.2612 },
      ]),
      agronomists: {
        create: { tenantId: tenant.id, agronomistId: agronomist.id },
      },
    },
  });

  const [plotA, plotB] = await Promise.all([
    prisma.fieldPlot.create({
      data: { tenantId: tenant.id, nome: "Talhão A", areaHectares: 50, farmId: farm.id },
    }),
    prisma.fieldPlot.create({
      data: { tenantId: tenant.id, nome: "Talhão B", areaHectares: 150, farmId: farm.id },
    }),
  ]);

  const startDate = new Date("2026-03-15T12:00:00.000Z");
  const cycle = await prisma.cropCycle.create({
    data: {
      tenantId: tenant.id,
      farmId: farm.id,
      dataInicio: startDate,
      dataFimPrevista: new Date("2026-07-12T12:00:00.000Z"),
      cultura: "Soja",
      status: CycleStatus.ATIVO,
    },
  });

  const inspectionEarly = await prisma.inspection.create({
    data: {
      tenantId: tenant.id,
      fieldPlotId: plotA.id,
      cropCycleId: cycle.id,
      agronomoId: agronomist.id,
      data: new Date("2026-04-03T12:00:00.000Z"),
      diaCiclo: 20,
      faseFenologica: "V3 - Desenvolvimento vegetativo",
      umidadeSolo: 68,
      alturaPlanta: 24,
      pragas: "Nenhuma ameaça detectada",
      doencas: "Sem sinais",
      daninhas: "Baixa incidência",
      observacoes: "Estande uniforme e desenvolvimento dentro do esperado.",
    },
  });
  const productivityEarly = calculateProductivity({
    plantasPorMetro: 12.4,
    vagensPorPlanta: 45,
    graosPorVagem: 2.35,
    pesoMilGraos: 158,
    areaHectares: plotA.areaHectares,
  });
  await prisma.sampling.create({
    data: {
      tenantId: tenant.id,
      inspectionId: inspectionEarly.id,
      plantasPorMetro: 12.4,
      vagensPorPlanta: 45,
      graosPorVagem: 2.35,
      pesoMilGraos: 158,
      areaTalhaoHectares: plotA.areaHectares,
      produtividadeKgHa: productivityEarly.kgPerHectare,
      produtividadeSacasHa: productivityEarly.bagsPerHectare,
      estimativaTotalKg: productivityEarly.totalKg,
    },
  });

  const inspectionA = await prisma.inspection.create({
    data: {
      tenantId: tenant.id,
      fieldPlotId: plotA.id,
      cropCycleId: cycle.id,
      agronomoId: agronomist.id,
      data: new Date("2026-04-28T12:00:00.000Z"),
      diaCiclo: 45,
      faseFenologica: "V6 - Fase vegetativa",
      umidadeSolo: 62,
      alturaPlanta: 48,
      pragas: "Baixa presença de percevejos",
      doencas: "Sem sinais relevantes",
      daninhas: "Buva pontual",
      observacoes: "Desenvolvimento uniforme e bom fechamento de entrelinha.",
    },
  });

  const productivityA = calculateProductivity({
    plantasPorMetro: 13,
    vagensPorPlanta: 48,
    graosPorVagem: 2.4,
    pesoMilGraos: 165,
    areaHectares: plotA.areaHectares,
  });
  await prisma.sampling.create({
    data: {
      tenantId: tenant.id,
      inspectionId: inspectionA.id,
      plantasPorMetro: 13,
      vagensPorPlanta: 48,
      graosPorVagem: 2.4,
      pesoMilGraos: 165,
      areaTalhaoHectares: plotA.areaHectares,
      produtividadeKgHa: productivityA.kgPerHectare,
      produtividadeSacasHa: productivityA.bagsPerHectare,
      estimativaTotalKg: productivityA.totalKg,
    },
  });

  const inspectionB = await prisma.inspection.create({
    data: {
      tenantId: tenant.id,
      fieldPlotId: plotB.id,
      cropCycleId: cycle.id,
      agronomoId: agronomist.id,
      data: new Date("2026-05-19T12:00:00.000Z"),
      diaCiclo: 66,
      faseFenologica: "R2 - Floração plena",
      umidadeSolo: 55,
      alturaPlanta: 72,
      pragas: "Sem nível de dano econômico",
      doencas: "Lesões compatíveis com ferrugem em reboleira",
      daninhas: "Controladas",
      observacoes: "Coletadas folhas para confirmação e aberto alerta preventivo.",
    },
  });

  const productivityB = calculateProductivity({
    plantasPorMetro: 12.5,
    vagensPorPlanta: 51,
    graosPorVagem: 2.5,
    pesoMilGraos: 168,
    areaHectares: plotB.areaHectares,
  });
  await prisma.sampling.create({
    data: {
      tenantId: tenant.id,
      inspectionId: inspectionB.id,
      plantasPorMetro: 12.5,
      vagensPorPlanta: 51,
      graosPorVagem: 2.5,
      pesoMilGraos: 168,
      areaTalhaoHectares: plotB.areaHectares,
      produtividadeKgHa: productivityB.kgPerHectare,
      produtividadeSacasHa: productivityB.bagsPerHectare,
      estimativaTotalKg: productivityB.totalKg,
    },
  });

  const occurrence = await prisma.occurrence.create({
    data: {
      tenantId: tenant.id,
      fieldPlotId: plotB.id,
      inspectionId: inspectionB.id,
      tipo: OccurrenceType.DOENCA,
      nome: "Ferrugem Asiática",
      gravidade: Severity.ALTA,
      dataOcorrencia: new Date("2026-05-19T12:00:00.000Z"),
      descricao:
        "Foco identificado na porção leste do talhão, exigindo controle imediato.",
      status: OccurrenceStatus.RESOLVIDA,
      impactoEstimado: 8,
    },
  });

  const opened = new Date("2026-05-19T12:00:00.000Z");
  const closed = new Date("2026-05-22T12:00:00.000Z");
  await prisma.managementCall.create({
    data: {
      tenantId: tenant.id,
      occurrenceId: occurrence.id,
      tipoManejo: "Aplicação de fungicida",
      dataAbertura: opened,
      dataFechamento: closed,
      responsavel: "Equipe de aplicação",
      observacoes: "Aplicação realizada com monitoramento programado em 7 dias.",
      diasResposta: calculateResponseDays(opened, closed),
    },
  });

  await prisma.occurrence.create({
    data: {
      tenantId: tenant.id,
      fieldPlotId: plotA.id,
      tipo: OccurrenceType.PRAGA,
      nome: "Percevejo-marrom",
      gravidade: Severity.MEDIA,
      dataOcorrencia: new Date("2026-06-04T12:00:00.000Z"),
      descricao:
        "População acima do nível de atenção em pontos da bordadura do talhão.",
      status: OccurrenceStatus.ABERTA,
      impactoEstimado: 3,
    },
  });

  await prisma.notification.create({
    data: {
      tenantId: tenant.id,
      userId: producer.id,
      titulo: "Ocorrência crítica no Talhão B",
      mensagem:
        "Ferrugem Asiática com gravidade alta foi registrada. Um chamado de manejo já está em andamento.",
      tipo: NotificationType.CRITICA,
    },
  });

  console.log("Seed concluído.");
  console.log("Produtor: produtor@switchrural.com / 123456");
  console.log("Agrônomo: agronomo@switchrural.com / 123456");
  console.log("Desenvolvedor: dev@switchrural.com / 123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
