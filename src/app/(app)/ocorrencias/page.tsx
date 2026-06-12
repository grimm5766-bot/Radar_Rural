import { UserRole } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { OccurrenceForm } from "@/components/entity-forms";
import { Badge, Card, EmptyState, PageHeader, statusTone } from "@/components/ui";
import { accessibleFarmWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { enumLabel, formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function OccurrencesPage() {
  const user = await requireUser();
  if (user.perfil !== UserRole.AGRONOMO) redirect("/dashboard");
  const farms = await prisma.farm.findMany({
    where: accessibleFarmWhere(user),
    include: { fieldPlots: { include: { inspections: { orderBy: { data: "desc" }, take: 10 } } } },
  });
  const plots = farms.flatMap((farm) => farm.fieldPlots.map((plot) => ({ id: plot.id, label: `${farm.nome} · ${plot.nome}` })));
  const inspections = farms.flatMap((farm) => farm.fieldPlots.flatMap((plot) => plot.inspections.map((item) => ({ id: item.id, label: `${plot.nome} · ${formatDate(item.data)}` }))));
  const occurrences = await prisma.occurrence.findMany({
    where: { fieldPlot: { farm: accessibleFarmWhere(user) } },
    include: { fieldPlot: { include: { farm: true } }, managementCalls: true },
    orderBy: { dataOcorrencia: "desc" },
  });
  return (
    <>
      <PageHeader eyebrow="Monitoramento fitossanitário" title="Ocorrências críticas" description="Registre pragas, doenças e plantas daninhas. Alertas graves chegam ao painel do produtor." />
      <div className="content-form-grid">
        <OccurrenceForm plots={plots} inspections={inspections} />
        <Card>
          <div className="card-header"><h2>Ocorrências registradas</h2><Badge>{occurrences.length} ocorrência(s)</Badge></div>
          {occurrences.length === 0 ? <EmptyState message="Nenhuma ocorrência registrada." /> : (
            <div className="table-wrap"><table className="data-table">
              <thead><tr><th>Data</th><th>Talhão</th><th>Tipo</th><th>Nome</th><th>Gravidade</th><th>Impacto</th><th>Status</th><th>Manejo</th></tr></thead>
              <tbody>{occurrences.map((item) => <tr key={item.id}><td>{formatDate(item.dataOcorrencia)}</td><td>{item.fieldPlot.nome}</td><td>{enumLabel(item.tipo)}</td><td><strong>{item.nome}</strong></td><td><Badge tone={statusTone(item.gravidade)}>{enumLabel(item.gravidade)}</Badge></td><td>{formatNumber(item.impactoEstimado)}%</td><td><Badge tone={statusTone(item.status)}>{enumLabel(item.status)}</Badge></td><td>{item.managementCalls.length}</td></tr>)}</tbody>
            </table></div>
          )}
        </Card>
      </div>
    </>
  );
}
