"use client";

import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarRange,
  Camera,
  ChartNoAxesCombined,
  ClipboardCheck,
  FlaskConical,
  Leaf,
  LogOut,
  Menu,
  ShieldCheck,
  ShieldEllipsis,
  Sprout,
  Stethoscope,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { pendingCount, syncPendingRecords } from "@/lib/offline";
import type { SessionUser } from "@/lib/auth";

const commonLinks = [
  { href: "/dashboard", label: "Visão geral", icon: ChartNoAxesCombined },
  { href: "/fazendas", label: "Fazendas", icon: Building2 },
  { href: "/talhoes", label: "Talhões", icon: Sprout },
  { href: "/ciclos", label: "Ciclos da soja", icon: CalendarRange },
];

const agronomistLinks = [
  { href: "/vistorias", label: "Vistorias", icon: ClipboardCheck },
  { href: "/amostragens", label: "Amostragens", icon: FlaskConical },
  { href: "/ocorrencias", label: "Ocorrências", icon: AlertTriangle },
  { href: "/manejos", label: "Manejo", icon: Wrench },
  { href: "/fotos", label: "Fotos de campo", icon: Camera },
];

const producerLinks = [
  { href: "/alertas", label: "Histórico de alertas", icon: Stethoscope },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
];

const developerLinks = [
  { href: "/desenvolvedor", label: "Métricas da plataforma", icon: ShieldEllipsis },
  { href: "/fazendas", label: "Todas as fazendas", icon: Building2 },
  { href: "/usuarios", label: "Usuários e tenants", icon: Users },
];

export function AppShell({
  user,
  unreadNotifications,
  children,
}: {
  user: SessionUser;
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  const updateConnection = useCallback(async () => {
    const isOnline = navigator.onLine;
    setOnline(isOnline);
    if (isOnline) {
      const synced = await syncPendingRecords();
      if (synced > 0) router.refresh();
    }
    setQueueCount(pendingCount());
  }, [router]);

  useEffect(() => {
    const initialUpdate = window.setTimeout(updateConnection, 0);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("offline-queue-updated", updateConnection);
    return () => {
      window.clearTimeout(initialUpdate);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("offline-queue-updated", updateConnection);
    };
  }, [updateConnection]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isDeveloper = user.perfil === "DESENVOLVEDOR";
  const profileLinks = isDeveloper
    ? developerLinks
    : user.perfil === "AGRONOMO"
      ? agronomistLinks
      : producerLinks;

  return (
    <div className="app-layout">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Leaf size={24} /></div>
          <div><strong>Switch Rural</strong><span>Gestão da soja</span></div>
        </div>
        {!isDeveloper && (
          <>
            <p className="nav-label">Fazenda</p>
            <nav>
              {commonLinks.map((link) => (
                <NavLink key={link.href} {...link} pathname={pathname} close={() => setMenuOpen(false)} />
              ))}
            </nav>
          </>
        )}
        <p className="nav-label">
          {isDeveloper ? "Plataforma" : user.perfil === "AGRONOMO" ? "Rotina de campo" : "Acompanhamento"}
        </p>
        <nav>
          {profileLinks.map((link) => (
            <NavLink key={link.href} {...link} pathname={pathname} close={() => setMenuOpen(false)} />
          ))}
        </nav>
        <div className="sidebar-footer">
          <strong>{user.nome}</strong>
          <span>{user.email}</span>
          <button className="button button-ghost" type="button" onClick={logout}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <button className="mobile-menu" type="button" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <ShieldCheck size={20} color="#347149" />
            <strong>{isDeveloper ? "Console do desenvolvedor" : user.perfil === "AGRONOMO" ? "Área do agrônomo" : "Área do produtor"}</strong>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {unreadNotifications > 0 && (
              <Link className="connection-pill" href="/notificacoes">
                <Bell size={14} /> {unreadNotifications} nova(s)
              </Link>
            )}
            <span className={`connection-pill ${online ? "" : "offline"}`}>
              <span className="connection-dot" />
              {online ? (queueCount ? `Sincronizando ${queueCount}` : "Online") : `Offline · ${queueCount} pendente(s)`}
            </span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  close,
}: {
  href: string;
  label: string;
  icon: typeof Leaf;
  pathname: string;
  close: () => void;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link className={`nav-link ${active ? "active" : ""}`} href={href} onClick={close}>
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}
