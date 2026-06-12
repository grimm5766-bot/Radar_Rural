import { Inbox } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <Inbox size={30} />
      <p>{message}</p>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`badge ${tone === "neutral" ? "" : tone}`}>{children}</span>;
}

export function statusTone(value: string) {
  if (["ALTA", "ABERTA", "CRITICA"].includes(value)) return "danger" as const;
  if (["MEDIA", "EM_CONTROLE", "ALERTA"].includes(value)) return "warning" as const;
  if (["RESOLVIDA", "CONCLUIDO", "ATIVO"].includes(value)) return "success" as const;
  return "neutral" as const;
}
