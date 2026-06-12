import { CycleForm } from "@/components/entity-forms";
import { Badge, Card, EmptyState, PageHeader, statusTone } from "@/components/ui";
import { accessibleFarmWhere } from "@/lib/access";
import { calculateCycleDay, cycleProgress } from "@/lib/agriculture";
import { requireUser } from "@/lib/auth";
import { enumLabel, formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CyclesPage() {
  const user = await requireUser();
  const farms = await prisma.farm.findMany({
    where: accessibleFarmWhere(user),
    include: { cropCycles: { orderBy: { dataInicio: "desc" } } },
    orderBy: { nome: "asc" },
  });
  const cycles = farms.flatMap((farm) => farm.cropCycles.map((cycle) => ({ ...cycle, farm })));
  return (
    <>
      <PageHeader eyebrow="Calendário agrícola" title="Ciclos da soja" description="Planeje os 120 dias da cultura e aplique a regra inicial do vazio sanitário para Goiás." />
      <div className="content-form-grid">
        <CycleForm farms={farms.map((item) => ({ id: item.id, label: item.nome }))} />
        <Card>
          <div className="card-header"><h2>Histórico de ciclos</h2><Badge>{cycles.length} ciclo(s)</Badge></div>
          {cycles.length === 0 ? <EmptyState message="Nenhum ciclo cadastrado." /> : (
            <div className="table-wrap"><table className="data-table">
              <thead><tr><th>Fazenda</th><th>Cultura</th><th>Período</th><th>Progresso</th><th>Status</th></tr></thead>
              <tbody>{cycles.map((cycle) => {
                const day = calculateCycleDay(cycle.dataInicio);
                return <tr key={cycle.id}><td><strong>{cycle.farm.nome}</strong></td><td>{cycle.cultura}</td><td>{formatDate(cycle.dataInicio)} — {formatDate(cycle.dataFimPrevista)}</td><td>Dia {day} · {formatNumber(cycleProgress(day))}%</td><td><Badge tone={statusTone(cycle.status)}>{enumLabel(cycle.status)}</Badge></td></tr>;
              })}</tbody>
            </table></div>
          )}
        </Card>
      </div>
    </>
  );
}
