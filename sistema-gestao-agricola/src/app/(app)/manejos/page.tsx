import { UserRole } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { CloseManagementButton, ManagementForm } from "@/components/entity-forms";
import { Badge, Card, EmptyState, PageHeader, statusTone } from "@/components/ui";
import { accessibleFarmWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { enumLabel, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ManagementPage() {
  const user = await requireUser();
  if (user.perfil !== UserRole.AGRONOMO) redirect("/dashboard");
  const occurrences = await prisma.occurrence.findMany({
    where: { fieldPlot: { farm: accessibleFarmWhere(user) }, status: { not: "RESOLVIDA" } },
    include: { fieldPlot: true },
    orderBy: { dataOcorrencia: "desc" },
  });
  const calls = await prisma.managementCall.findMany({
    where: { occurrence: { fieldPlot: { farm: accessibleFarmWhere(user) } } },
    include: { occurrence: { include: { fieldPlot: true } } },
    orderBy: { dataAbertura: "desc" },
  });
  return (
    <>
      <PageHeader eyebrow="Resposta agronômica" title="Chamados de manejo" description="Acompanhe a ação tomada e quanto tempo foi necessário para conter cada problema." />
      <div className="content-form-grid">
        <ManagementForm occurrences={occurrences.map((item) => ({ id: item.id, label: `${item.fieldPlot.nome} · ${item.nome} · ${enumLabel(item.gravidade)}` }))} />
        <Card>
          <div className="card-header"><h2>Chamados registrados</h2><Badge>{calls.length} chamado(s)</Badge></div>
          {calls.length === 0 ? <EmptyState message="Nenhum chamado de manejo aberto." /> : (
            <div className="table-wrap"><table className="data-table">
              <thead><tr><th>Ocorrência</th><th>Manejo</th><th>Abertura</th><th>Fechamento</th><th>Resposta</th><th>Responsável</th><th>Ação</th></tr></thead>
              <tbody>{calls.map((item) => <tr key={item.id}><td><strong>{item.occurrence.nome}</strong><br /><small>{item.occurrence.fieldPlot.nome}</small></td><td>{item.tipoManejo}</td><td>{formatDate(item.dataAbertura)}</td><td>{formatDate(item.dataFechamento)}</td><td><Badge tone={item.dataFechamento ? "success" : statusTone(item.occurrence.gravidade)}>{item.diasResposta === null ? "Em andamento" : `${item.diasResposta} dia(s)`}</Badge></td><td>{item.responsavel}</td><td>{!item.dataFechamento ? <CloseManagementButton id={item.id} /> : "Concluído"}</td></tr>)}</tbody>
            </table></div>
          )}
        </Card>
      </div>
    </>
  );
}
