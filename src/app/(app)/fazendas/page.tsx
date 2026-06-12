import { UserRole } from "@/generated/prisma/client";
import { MapPinned } from "lucide-react";
import Link from "next/link";
import { FarmForm } from "@/components/entity-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { accessibleFarmWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function FarmsPage() {
  const user = await requireUser();
  const [farms, agronomists] = await Promise.all([
    prisma.farm.findMany({
      where: accessibleFarmWhere(user),
      include: { produtor: true, agronomists: { include: { agronomist: true } }, _count: { select: { fieldPlots: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.user.findMany({
      where: {
        perfil: UserRole.AGRONOMO,
        ...(user.tenantId ? { tenantId: user.tenantId } : {}),
      },
      orderBy: { nome: "asc" },
    }),
  ]);
  const list = (
    <Card>
      <div className="card-header"><h2>Propriedades disponíveis</h2><Badge>{farms.length} fazenda(s)</Badge></div>
      {farms.length === 0 ? <EmptyState message="Nenhuma fazenda vinculada ao seu perfil." /> : (
        <div className="table-wrap"><table className="data-table">
          <thead><tr><th>Fazenda</th><th>Área</th><th>Região</th><th>Talhões</th><th>Produtor</th><th>Agrônomo</th><th>Mapa</th></tr></thead>
          <tbody>{farms.map((farm) => <tr key={farm.id}><td><strong>{farm.nome}</strong></td><td>{formatNumber(farm.areaTotalHectares)} ha</td><td>{farm.regiao}</td><td>{farm._count.fieldPlots}</td><td>{farm.produtor.nome}</td><td>{farm.agronomists.map((item) => item.agronomist.nome).join(", ") || "—"}</td><td><Link className="button button-secondary" href={`/fazendas/${farm.id}/mapa`}><MapPinned size={15} /> {farm.boundaryJson ? "Editar limites" : "Demarcar"}</Link></td></tr>)}</tbody>
        </table></div>
      )}
    </Card>
  );
  return (
    <>
      <PageHeader eyebrow="Estrutura produtiva" title="Fazendas" description="Separe os dados por propriedade, produtor responsável e equipe agronômica." />
      {user.perfil === UserRole.PRODUTOR ? (
        <div className="content-form-grid"><FarmForm agronomists={agronomists.map((item) => ({ id: item.id, label: item.nome }))} />{list}</div>
      ) : list}
    </>
  );
}
