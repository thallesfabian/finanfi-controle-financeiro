"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, TrendingDown, ReceiptText, CarFront, Fuel, Target, PiggyBank, ChartNoAxesCombined, Settings } from "lucide-react";

const links = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "Receitas", href: "/app/receitas", icon: TrendingUp },
  { label: "Despesas", href: "/app/despesas", icon: TrendingDown },
  { label: "Contas", href: "/app/contas", icon: ReceiptText },
  { label: "Motorista", href: "/app/motorista", icon: CarFront },
  { label: "Combustível", href: "/app/combustivel", icon: Fuel },
  { label: "Metas", href: "/app/metas", icon: Target },
  { label: "Cofres", href: "/app/cofres", icon: PiggyBank },
  { label: "Relatórios", href: "/app/relatorios", icon: ChartNoAxesCombined },
  { label: "Configurações", href: "/app/configuracoes", icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();
  return <nav className="nav" aria-label="Navegação principal">{links.map(({ label, href, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={label} href={href} className={active ? "active" : ""} title={label} aria-current={active ? "page" : undefined}><Icon className="nav-icon" size={21}/><span className="nav-label">{label}</span></Link>;
  })}</nav>;
}
