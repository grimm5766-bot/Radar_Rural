import { AlertTriangle, BellRing, Info } from "lucide-react";
import { MarkNotificationButton } from "@/components/entity-forms";
import { Badge, Card, EmptyState, PageHeader, statusTone } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { enumLabel, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { dataCriacao: "desc" },
  });
  const unread = notifications.filter((item) => !item.lida).length;
  return (
    <>
      <PageHeader
        eyebrow="Central de avisos"
        title="Notificações"
        description="Alertas críticos simulam o canal que poderá evoluir para push ou WhatsApp."
        action={unread > 0 ? <MarkNotificationButton /> : undefined}
      />
      <Card>
        <div className="card-header"><h2>Caixa de entrada</h2><Badge tone={unread ? "warning" : "success"}>{unread} não lida(s)</Badge></div>
        {notifications.length === 0 ? <EmptyState message="Nenhuma notificação recebida." /> : (
          <div>{notifications.map((item) => (
            <article className={`notification-item ${item.lida ? "" : "unread"}`} key={item.id}>
              <div className="notification-icon">
                {item.tipo === "CRITICA" ? <AlertTriangle size={19} /> : item.tipo === "ALERTA" ? <BellRing size={19} /> : <Info size={19} />}
              </div>
              <div><div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}><strong>{item.titulo}</strong><Badge tone={statusTone(item.tipo)}>{enumLabel(item.tipo)}</Badge></div><p>{item.mensagem}<br /><small>{formatDate(item.dataCriacao)}</small></p></div>
              <div className="notification-action">{!item.lida ? <MarkNotificationButton id={item.id} /> : <Badge tone="success">Lida</Badge>}</div>
            </article>
          ))}</div>
        )}
      </Card>
    </>
  );
}
