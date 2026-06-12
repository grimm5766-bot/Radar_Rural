import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { TenantForm, UserForm } from "@/components/entity-forms";
import { requireDeveloper } from "@/lib/auth";
import { enumLabel, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  await requireDeveloper();
  const [users, tenants] = await Promise.all([
    prisma.user.findMany({ include: { tenant: true }, orderBy: { createdAt: "desc" } }),
    prisma.tenant.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Acessos" title="Usuários" description="Perfis simples para produtores e agrônomos usarem o MVP." />
      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <TenantForm />
        <UserForm tenants={tenants.map((tenant) => ({ id: tenant.id, label: tenant.nome }))} />
      </div>
      <div>
        <Card>
          <div className="card-header"><h2>Usuários cadastrados</h2><Badge>{users.length} acesso(s)</Badge></div>
          {users.length === 0 ? <EmptyState message="Nenhum usuário cadastrado." /> : (
            <div className="table-wrap"><table className="data-table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Tenant</th><th>Perfil</th><th>Google</th><th>Criado em</th></tr></thead>
              <tbody>{users.map((item) => <tr key={item.id}><td><strong>{item.nome}</strong></td><td>{item.email}</td><td>{item.tenant?.nome ?? "Acesso global"}</td><td><Badge tone={item.perfil === "AGRONOMO" ? "info" : item.perfil === "DESENVOLVEDOR" ? "warning" : "success"}>{enumLabel(item.perfil)}</Badge></td><td>{item.googleSubject ? "Vinculado" : "Senha"}</td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody>
            </table></div>
          )}
        </Card>
      </div>
    </>
  );
}
