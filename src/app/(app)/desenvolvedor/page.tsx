import {
  Activity,
  Building2,
  LandPlot,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireDeveloper } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function DeveloperDashboardPage() {
  await requireDeveloper();

  const [
    tenantCount,
    farmCount,
    userCount,
    inspectionCount,
    occurrenceCount,
    farmArea,
    tenants,
    recentFarms,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.farm.count(),
    prisma.user.count(),
    prisma.inspection.count(),
    prisma.occurrence.count(),
    prisma.farm.aggregate({ _sum: { areaTotalHectares: true } }),
    prisma.tenant.findMany({
      include: {
        _count: { select: { users: true, farms: true, inspections: true } },
        farms: { select: { areaTotalHectares: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.farm.findMany({
      include: { tenant: true, produtor: true, _count: { select: { fieldPlots: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Console global"
        title="Saúde da plataforma"
        description="Visão exclusiva da equipe de desenvolvimento, sem substituir o isolamento por tenant aplicado aos usuários operacionais."
      />

      <div className="grid grid-4">
        <Metric icon={<ShieldCheck size={21} />} label="Tenants ativos" value={String(tenantCount)} helper="Organizações isoladas" />
        <Metric icon={<Building2 size={21} />} label="Fazendas cadastradas" value={String(farmCount)} helper={`${formatNumber(farmArea._sum.areaTotalHectares ?? 0, 0)} hectares`} />
        <Metric icon={<Users size={21} />} label="Usuários" value={String(userCount)} helper="Todos os perfis" />
        <Metric icon={<Activity size={21} />} label="Atividade de campo" value={String(inspectionCount)} helper={`${occurrenceCount} ocorrência(s)`} />
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <Card>
          <div className="card-header"><h2>Uso por tenant</h2><Badge>{tenants.length} organização(ões)</Badge></div>
          {tenants.length === 0 ? <EmptyState message="Nenhum tenant cadastrado." /> : (
            <div className="card-body">
              <div className="tenant-usage-list">
                {tenants.map((tenant) => {
                  const area = tenant.farms.reduce((sum, farm) => sum + farm.areaTotalHectares, 0);
                  const maxFarms = Math.max(...tenants.map((item) => item._count.farms), 1);
                  return (
                    <article key={tenant.id}>
                      <div>
                        <strong>{tenant.nome}</strong>
                        <span>{tenant._count.farms} fazenda(s) · {tenant._count.users} usuário(s) · {formatNumber(area, 0)} ha</span>
                      </div>
                      <div className="tenant-usage-track">
                        <div style={{ width: `${Math.max(8, (tenant._count.farms / maxFarms) * 100)}%` }} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="card-header"><h2>Indicadores operacionais</h2></div>
          <div className="card-body">
            <div className="grid grid-2">
              <Indicator icon={<Sprout size={18} />} label="Vistorias" value={inspectionCount} />
              <Indicator icon={<Activity size={18} />} label="Ocorrências" value={occurrenceCount} />
              <Indicator icon={<Building2 size={18} />} label="Média por tenant" value={tenantCount ? farmCount / tenantCount : 0} digits={1} />
              <Indicator icon={<LandPlot size={18} />} label="Área total (ha)" value={farmArea._sum.areaTotalHectares ?? 0} />
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <Card>
          <div className="card-header"><h2>Fazendas mais recentes</h2></div>
          {recentFarms.length === 0 ? <EmptyState message="Nenhuma fazenda cadastrada." /> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Fazenda</th><th>Tenant</th><th>Produtor</th><th>Área</th><th>Talhões</th><th>Cadastro</th></tr></thead>
                <tbody>{recentFarms.map((farm) => (
                  <tr key={farm.id}>
                    <td><strong>{farm.nome}</strong></td>
                    <td>{farm.tenant.nome}</td>
                    <td>{farm.produtor.nome}</td>
                    <td>{formatNumber(farm.areaTotalHectares)} ha</td>
                    <td>{farm._count.fieldPlots}</td>
                    <td>{formatDate(farm.createdAt)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Metric({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return <Card className="metric-card"><div className="metric-icon">{icon}</div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-helper">{helper}</span></Card>;
}

function Indicator({ icon, label, value, digits = 0 }: { icon: React.ReactNode; label: string; value: number; digits?: number }) {
  return <div className="developer-indicator"><div className="metric-icon">{icon}</div><span>{label}</span><strong>{formatNumber(value, digits)}</strong></div>;
}
