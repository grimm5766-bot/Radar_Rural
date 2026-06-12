import { PlotForm } from "@/components/entity-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { accessibleFarmWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PlotsPage() {
  const user = await requireUser();
  const farms = await prisma.farm.findMany({
    where: accessibleFarmWhere(user),
    include: { fieldPlots: { orderBy: { nome: "asc" } } },
    orderBy: { nome: "asc" },
  });
  const plots = farms.flatMap((farm) => farm.fieldPlots.map((plot) => ({ ...plot, farm })));
  return (
    <>
      <PageHeader eyebrow="Divisão de área" title="Talhões" description="Cada registro de campo fica ligado a uma unidade produtiva específica." />
      <div className="content-form-grid">
        <PlotForm farms={farms.map((item) => ({ id: item.id, label: `${item.nome} · ${formatNumber(item.areaTotalHectares)} ha` }))} />
        <Card>
          <div className="card-header"><h2>Talhões cadastrados</h2><Badge>{plots.length} talhão(ões)</Badge></div>
          {plots.length === 0 ? <EmptyState message="Nenhum talhão cadastrado." /> : (
            <div className="table-wrap"><table className="data-table">
              <thead><tr><th>Talhão</th><th>Fazenda</th><th>Área</th><th>Participação</th></tr></thead>
              <tbody>{plots.map((plot) => <tr key={plot.id}><td><strong>{plot.nome}</strong></td><td>{plot.farm.nome}</td><td>{formatNumber(plot.areaHectares)} ha</td><td>{formatNumber((plot.areaHectares / plot.farm.areaTotalHectares) * 100)}%</td></tr>)}</tbody>
            </table></div>
          )}
        </Card>
      </div>
    </>
  );
}
