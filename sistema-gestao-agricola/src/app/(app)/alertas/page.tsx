import { Badge, Card, EmptyState, PageHeader, statusTone } from "@/components/ui";
import { accessibleFarmWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { enumLabel, formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AlertsPage() {
  const user = await requireUser();
  const occurrences = await prisma.occurrence.findMany({
    where: { fieldPlot: { farm: accessibleFarmWhere(user) } },
    include: {
      fieldPlot: { include: { farm: true } },
      managementCalls: { orderBy: { dataAbertura: "desc" } },
    },
    orderBy: { dataOcorrencia: "desc" },
  });
  return (
    <>
      <PageHeader eyebrow="Histórico consolidado" title="Alertas da lavoura" description="Problemas detectados, resposta de manejo e impacto estimado na produção." />
      <Card>
        <div className="card-header"><h2>Histórico de ocorrências</h2><Badge>{occurrences.length} alerta(s)</Badge></div>
        {occurrences.length === 0 ? <EmptyState message="Nenhum alerta para as suas fazendas." /> : (
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Fazenda / Talhão</th><th>Problema</th><th>Gravidade</th><th>Abertura</th><th>Fechamento</th><th>Resposta</th><th>Impacto</th><th>Status</th></tr></thead>
            <tbody>{occurrences.map((item) => {
              const call = item.managementCalls[0];
              return <tr key={item.id}><td><strong>{item.fieldPlot.nome}</strong><br /><small>{item.fieldPlot.farm.nome}</small></td><td>{enumLabel(item.tipo)} · {item.nome}</td><td><Badge tone={statusTone(item.gravidade)}>{enumLabel(item.gravidade)}</Badge></td><td>{formatDate(call?.dataAbertura ?? item.dataOcorrencia)}</td><td>{formatDate(call?.dataFechamento)}</td><td>{call?.diasResposta === null || call?.diasResposta === undefined ? "Em acompanhamento" : `${call.diasResposta} dia(s)`}</td><td>{formatNumber(item.impactoEstimado)}%</td><td><Badge tone={statusTone(item.status)}>{enumLabel(item.status)}</Badge></td></tr>;
            })}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
