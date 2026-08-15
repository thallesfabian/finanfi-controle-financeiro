import { notFound } from "next/navigation";
const sections: Record<string, { title: string; description: string; phase: string }> = {
  contas: { title: "Contas", description: "Gerencie contas mensais, vencimentos e pagamentos.", phase: "Fase 2" },
  motorista: { title: "Motorista", description: "Acompanhe faturamento, custos e lucro real no volante.", phase: "Fase 3" },
  jornadas: { title: "Jornadas", description: "Registre horas, quilômetros e ganhos por aplicativo.", phase: "Fase 3" },
  combustivel: { title: "Combustível", description: "Controle abastecimentos, consumo e custo por quilômetro.", phase: "Fase 3" },
  metas: { title: "Metas", description: "Defina metas de faturamento e de economia mensal.", phase: "Fase 2" },
  cofres: { title: "Cofres", description: "Organize suas reservas para objetivos específicos.", phase: "Fase 2" },
  relatorios: { title: "Relatórios", description: "Analise resultados, projeções e evolução financeira.", phase: "Fase 4" },
  configuracoes: { title: "Configurações", description: "Personalize veículo, categorias e parâmetros financeiros.", phase: "Fase 2" },
};
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const item = sections[(await params).section]; if (!item) notFound();
  return <><div className="topbar"><div><h1>{item.title}</h1><p className="muted">{item.description}</p></div><span className="pill">{item.phase}</span></div><section className="card empty-module"><span className="module-badge">Em desenvolvimento</span><h2>Este módulo será liberado na {item.phase}</h2><p className="muted">A navegação já está preparada. Seus dados atuais continuam seguros nos módulos implementados.</p></section></>;
}
