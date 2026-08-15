import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import SidebarNav from "@/components/SidebarNav";
import { LogOut } from "lucide-react";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const id = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id }, select: { name: true, email: true } });
  const firstName = user.name.trim().split(" ")[0];
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());

  return <div className="shell">
    <aside className="sidebar"><div className="logo"><span className="logo-mark">f</span><span className="logo-name">finan<i>fi</i></span></div><SidebarNav/><form className="sidebar-bottom" action="/api/auth/logout" method="post"><button className="sidebar-logout" title="Sair"><LogOut size={21}/><span className="nav-label">Sair</span></button></form></aside>
    <main className="main">
      <header className="app-header">
        <div className="app-welcome"><span className="welcome-icon">☀</span><div><strong>Olá, {firstName}</strong><span>{today}</span></div></div>
        <nav className="header-actions" aria-label="Ações rápidas"><Link href="/app/motorista" className="header-action">+ Registrar dia</Link><Link href="/app/receitas" className="header-action">+ Nova receita</Link></nav>
        <Link href="/app/configuracoes" className="account-summary"><span className="account-avatar">{initials}</span><span className="account-text"><strong>{user.name}</strong><small>{user.email}</small></span><span className="account-chevron">›</span></Link>
      </header>
      {children}
    </main>
  </div>;
}
