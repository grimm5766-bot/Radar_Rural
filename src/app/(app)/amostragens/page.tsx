import { UserRole } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { SamplingForm } from "@/components/entity-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { accessibleFarmWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function SamplingsPage() {
  const user = await requireUser();
  if (user.perfil !== UserRole.AGRONOMO) redirect("/dashboard");
  const inspections = await prisma.inspection.findMany({
    where: { fieldPlot: { farm: accessibleFarmWhere(user) } },
    include: { fieldPlot: { include: { farm: true } }, sampling: true },
    orderBy: { data: "desc" },
  });
  const samplings = inspections.filter((item) => item.sampling).map((item) => ({ ...item.sampling!, inspection: item }));
  const available = inspections.filter((item) => !item.sampling);
  return (
    <>
      <PageHeader eyebrow="Previsão de safra" title="Amostragens de produtividade" description="Transforme dados de campo em estimativas por hectare, talhão e área total." />
      <div className="content-form-grid">
        <SamplingForm inspections={available.map((item) => ({ id: item.id, label: `${item.fieldPlot.nome} · ${formatDate(item.data)} · dia ${item.diaCiclo}` }))} />
        <Card>
          <div className="card-header"><h2>Estimativas calculadas</h2><Badge>{samplings.length} amostragem(ns)</Badge></div>
          {samplings.length === 0 ? <EmptyState message="Nenhuma amostragem calculada." /> : (
            <div className="table-wrap"><table className="data-table">
              <thead><tr><th>Talhão</th><th>Data</th><th>Plantas/m</th><th>Vagens/planta</th><th>PMG</th><th>kg/ha</th><th>Sacas/ha</th><th>Total</th></tr></thead>
              <tbody>{samplings.map((item) => <tr key={item.id}><td><strong>{item.inspection.fieldPlot.nome}</strong></td><td>{formatDate(item.inspection.data)}</td><td>{formatNumber(item.plantasPorMetro)}</td><td>{formatNumber(item.vagensPorPlanta)}</td><td>{formatNumber(item.pesoMilGraos)} g</td><td>{formatNumber(item.produtividadeKgHa, 0)}</td><td><Badge tone="success">{formatNumber(item.produtividadeSacasHa)} sc</Badge></td><td>{formatNumber(item.estimativaTotalKg / 1000)} t</td></tr>)}</tbody>
            </table></div>
          )}
        </Card>
      </div>
    </>
  );
}
