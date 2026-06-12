import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  Gauge,
  LandPlot,
  Scale,
} from "lucide-react";
import { UserRole } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import {
  ProductivityChart,
  RiskTimeline,
  type RiskSegment,
} from "@/components/dashboard-charts";
import { Badge, Card, EmptyState, PageHeader, statusTone } from "@/components/ui";
import { accessibleFarmWhere } from "@/lib/access";
import {
  calculateCycleDay,
  cycleProgress,
  phenologicalPhase,
} from "@/lib/agriculture";
import { requireUser } from "@/lib/auth";
import { enumLabel, formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.perfil === UserRole.DESENVOLVEDOR) redirect("/desenvolvedor");
  const farm = await prisma.farm.findFirst({
    where: accessibleFarmWhere(user),
    include: {
      fieldPlots: true,
      cropCycles: { orderBy: { dataInicio: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!farm) {
    return (
      <>
        <PageHeader eyebrow="Visão geral" title={`Olá, ${user.nome.split(" ")[0]}`} description="Cadastre ou vincule uma fazenda para começar a acompanhar a safra." />
        <Card><EmptyState message="Nenhuma fazenda disponível para este perfil." /></Card>
      </>
    );
  }

  const cycle = farm.cropCycles[0];
  const cycleDay = cycle ? calculateCycleDay(cycle.dataInicio) : 1;
  const phase = cycle ? phenologicalPhase(cycleDay) : "Sem ciclo ativo";

  const [occurrences, samplings, managementCalls, unreadNotifications] =
    await Promise.all([
      prisma.occurrence.findMany({
        where: { fieldPlot: { farmId: farm.id } },
        include: { fieldPlot: true, managementCalls: true },
        orderBy: { dataOcorrencia: "desc" },
      }),
      prisma.sampling.findMany({
        where: { inspection: { fieldPlot: { farmId: farm.id } } },
        include: { inspection: { include: { fieldPlot: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.managementCall.findMany({
        where: { occurrence: { fieldPlot: { farmId: farm.id } } },
        include: { occurrence: true },
      }),
      prisma.notification.count({ where: { userId: user.id, lida: false } }),
    ]);

  const latestByPlot = new Map<string, (typeof samplings)[number]>();
  for (const sampling of samplings) {
    if (!latestByPlot.has(sampling.inspection.fieldPlotId)) {
      latestByPlot.set(sampling.inspection.fieldPlotId, sampling);
    }
  }
  const latestSamplings = [...latestByPlot.values()];
  const sampledArea = latestSamplings.reduce((sum, item) => sum + item.areaTalhaoHectares, 0);
  const estimatedKg = latestSamplings.reduce((sum, item) => sum + item.estimativaTotalKg, 0);
  const averageKgHa = sampledArea ? estimatedKg / sampledArea : 0;
  const averageBagsHa = averageKgHa / 60;
  const totalFarmKg = averageKgHa * farm.areaTotalHectares;
  const openAlerts = occurrences.filter((item) => item.status !== "RESOLVIDA").length;
  const criticalAlerts = occurrences.filter((item) => item.gravidade === "ALTA").length;

  const riskData: RiskSegment[] = Array.from({ length: 120 }, (_, index) => ({
    day: index + 1,
    state: index + 1 <= cycleDay ? "healthy" : "future",
    label: index + 1 <= cycleDay ? "sem ameaça detectada" : "dia futuro",
  }));
  const riskPriority = { future: 0, healthy: 1, low: 2, medium: 3, high: 4 };
  for (const occurrence of occurrences) {
    const startDay = cycle
      ? calculateCycleDay(cycle.dataInicio, occurrence.dataOcorrencia)
      : 1;
    const closedDates = occurrence.managementCalls
      .map((call) => call.dataFechamento)
      .filter((date): date is Date => Boolean(date));
    const closedAt = closedDates.sort((a, b) => a.getTime() - b.getTime())[0];
    const endDay =
      occurrence.status === "RESOLVIDA" && closedAt && cycle
        ? calculateCycleDay(cycle.dataInicio, closedAt)
        : cycleDay;
    const state =
      occurrence.gravidade === "ALTA"
        ? "high"
        : occurrence.gravidade === "MEDIA"
          ? "medium"
          : "low";
    for (let day = startDay; day <= Math.max(startDay, endDay); day += 1) {
      const segment = riskData[day - 1];
      if (!segment) continue;
      if (riskPriority[state] >= riskPriority[segment.state]) {
        segment.state = state;
      }
      segment.label =
        segment.label === "sem ameaça detectada"
          ? occurrence.nome
          : `${segment.label}; ${occurrence.nome}`;
    }
  }
  const productivityData = [...samplings]
    .sort((a, b) => a.inspection.diaCiclo - b.inspection.diaCiclo)
    .map((sampling) => ({
      day: sampling.inspection.diaCiclo,
      bagsPerHectare: sampling.produtividadeSacasHa,
      kgPerHectare: sampling.produtividadeKgHa,
      plot: sampling.inspection.fieldPlot.nome,
    }));

  return (
    <>
      <PageHeader
        eyebrow={user.perfil === UserRole.PRODUTOR ? "Painel do produtor" : "Resumo de campo"}
        title={`${farm.nome} em um só olhar`}
        description={`Acompanhamento consolidado de ${formatNumber(farm.areaTotalHectares, 0)} hectares, do ciclo aos alertas que pedem ação.`}
      />

      <div className="grid grid-4">
        <Metric icon={<LandPlot size={21} />} label="Área monitorada" value={`${formatNumber(farm.areaTotalHectares, 0)} ha`} helper={`${farm.fieldPlots.length} talhões cadastrados`} />
        <Metric icon={<CalendarDays size={21} />} label="Ciclo atual" value={`Dia ${cycleDay}`} helper={phase} />
        <Metric icon={<Scale size={21} />} label="Produtividade" value={`${formatNumber(averageBagsHa)} sc/ha`} helper={`${formatNumber(averageKgHa, 0)} kg por hectare`} />
        <Metric icon={<AlertTriangle size={21} />} label="Alertas em aberto" value={String(openAlerts)} helper={`${criticalAlerts} ocorrência(s) de alta gravidade`} />
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <Card>
          <div className="card-header">
            <h2>Progresso do ciclo</h2>
            {cycle && <Badge tone={statusTone(cycle.status)}>{enumLabel(cycle.status)}</Badge>}
          </div>
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
              <div className="metric-icon"><Gauge size={22} /></div>
              <div>
                <strong style={{ fontSize: "1.45rem" }}>{formatNumber(cycleProgress(cycleDay))}% concluído</strong>
                <div style={{ color: "var(--muted)", marginTop: 3 }}>{phase}</div>
              </div>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${cycleProgress(cycleDay)}%` }} />
            </div>
            <div className="progress-meta">
              <span>Dia {cycleDay} de 120</span>
              <span>{cycle ? `${formatDate(cycle.dataInicio)} até ${formatDate(cycle.dataFimPrevista)}` : "Sem ciclo"}</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-header"><h2>Previsão dinâmica da safra</h2></div>
          <div className="card-body">
            <div className="grid grid-2">
              <Forecast label="Média estimada" value={`${formatNumber(averageKgHa, 0)} kg/ha`} />
              <Forecast label="Sacas por hectare" value={`${formatNumber(averageBagsHa)} sc/ha`} />
              <Forecast label="Talhões amostrados" value={`${formatNumber(estimatedKg / 1000)} t`} />
              <Forecast label={`Total para ${formatNumber(farm.areaTotalHectares, 0)} ha`} value={`${formatNumber(totalFarmKg / 1000)} t`} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <Card>
          <div className="card-header">
            <h2>Trilha visual de riscos</h2>
            <span style={{ color: "var(--muted)", fontSize: ".8rem" }}>120 dias da safra</span>
          </div>
          <div className="card-body">
            <RiskTimeline data={riskData} currentDay={cycleDay} />
          </div>
        </Card>
        <Card>
          <div className="card-header">
            <h2>Produtividade ao longo do tempo</h2>
            <span style={{ color: "var(--muted)", fontSize: ".8rem" }}>Estimativa em sacas/ha</span>
          </div>
          <div className="card-body">
            <ProductivityChart data={productivityData} />
          </div>
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <Card>
          <div className="card-header"><h2>Alertas recentes</h2></div>
          {occurrences.length === 0 ? <EmptyState message="Nenhuma ocorrência registrada." /> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Talhão</th><th>Ocorrência</th><th>Gravidade</th><th>Status</th></tr></thead>
                <tbody>{occurrences.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>{item.fieldPlot.nome}</td><td>{item.nome}</td>
                    <td><Badge tone={statusTone(item.gravidade)}>{enumLabel(item.gravidade)}</Badge></td>
                    <td>{enumLabel(item.status)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <div className="card-header"><h2>Central de atenção</h2></div>
          <div className="card-body">
            <div className="grid grid-2">
              <Forecast label="Notificações não lidas" value={String(unreadNotifications)} icon={<BellRing size={18} />} />
              <Forecast label="Problemas críticos" value={String(criticalAlerts)} icon={<AlertTriangle size={18} />} />
              <Forecast label="Chamados registrados" value={String(managementCalls.length)} />
              <Forecast label="Amostragens válidas" value={String(latestSamplings.length)} />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function Metric({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return <Card className="metric-card"><div className="metric-icon">{icon}</div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-helper">{helper}</span></Card>;
}

function Forecast({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div style={{ padding: 15, borderRadius: 14, background: "var(--surface-soft)" }}><span style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--muted)", fontSize: ".78rem", marginBottom: 7 }}>{icon}{label}</span><strong style={{ fontSize: "1.22rem" }}>{value}</strong></div>;
}
