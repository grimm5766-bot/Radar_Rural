import { UserRole } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { InspectionForm } from "@/components/entity-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { accessibleFarmWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function InspectionsPage() {
  const user = await requireUser();
  if (user.perfil !== UserRole.AGRONOMO) redirect("/dashboard");
  const farms = await prisma.farm.findMany({
    where: accessibleFarmWhere(user),
    include: { fieldPlots: true, cropCycles: { orderBy: { dataInicio: "desc" } } },
  });
  const plots = farms.flatMap((farm) => farm.fieldPlots.map((plot) => ({ id: plot.id, label: `${farm.nome} · ${plot.nome}` })));
  const cycles = farms.flatMap((farm) => farm.cropCycles.map((cycle) => ({ id: cycle.id, label: `${farm.nome} · ${formatDate(cycle.dataInicio)}` })));
  const inspections = await prisma.inspection.findMany({
    where: { fieldPlot: { farm: accessibleFarmWhere(user) } },
    include: { fieldPlot: { include: { farm: true } }, agronomo: true, sampling: true },
    orderBy: { data: "desc" },
  });
  return (
    <>
      <PageHeader eyebrow="Rotina de campo" title="Vistorias agronômicas" description="Registre o checklist técnico mesmo sem conexão e mantenha o histórico por talhão." />
      <div className="content-form-grid">
        <InspectionForm plots={plots} cycles={cycles} />
        <Card>
          <div className="card-header"><h2>Vistorias recentes</h2><Badge>{inspections.length} registro(s)</Badge></div>
          {inspections.length === 0 ? <EmptyState message="Nenhuma vistoria registrada." /> : (
            <div className="table-wrap"><table className="data-table">
              <thead><tr><th>Data</th><th>Talhão</th><th>Dia</th><th>Fase</th><th>Umidade</th><th>Altura</th><th>Amostragem</th></tr></thead>
              <tbody>{inspections.map((item) => <tr key={item.id}><td>{formatDate(item.data)}</td><td><strong>{item.fieldPlot.nome}</strong><br /><small>{item.fieldPlot.farm.nome}</small></td><td>{item.diaCiclo}/120</td><td>{item.faseFenologica}</td><td>{formatNumber(item.umidadeSolo)}%</td><td>{formatNumber(item.alturaPlanta)} cm</td><td><Badge tone={item.sampling ? "success" : "warning"}>{item.sampling ? "Calculada" : "Pendente"}</Badge></td></tr>)}</tbody>
            </table></div>
          )}
        </Card>
      </div>
    </>
  );
}
