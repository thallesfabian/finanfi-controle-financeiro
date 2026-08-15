import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { currency, brDate } from "@/lib/format";
import { journeyMetrics } from "@/lib/journey";

export const dynamic = "force-dynamic";
const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const userId = await requireUser();
  const query = await searchParams;
  const now = new Date();
  const month = Math.min(12, Math.max(1, Number(query.month) || now.getMonth() + 1));
  const year = Math.min(2100, Math.max(2000, Number(query.year) || now.getFullYear()));
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const journeys = await prisma.journey.findMany({ where: { userId, date: { gte: start, lt: end } }, include: { costs: true }, orderBy: { date: "asc" } });
  const rows = journeys.map(j => ({ j, m: journeyMetrics(j) }));
  const gross = rows.reduce((sum, row) => sum + row.m.gross, 0);
  const net = rows.reduce((sum, row) => sum + row.m.net, 0);
  const costs = rows.reduce((sum, row) => sum + row.m.costs, 0);
  const hours = rows.reduce((sum, row) => sum + row.m.hours, 0);
  const km = rows.reduce((sum, row) => sum + row.m.km, 0);
  const best = [...rows].sort((a, b) => b.m.net - a.m.net)[0];
  const uber = journeys.reduce((sum, item) => sum + Number(item.uber), 0);
  const n99 = journeys.reduce((sum, item) => sum + Number(item.ninetyNine), 0);
  const indrive = journeys.reduce((sum, item) => sum + Number(item.inDrive), 0);
  const other = gross - uber - n99 - indrive;
  const years = Array.from({ length: Math.max(1, now.getFullYear() - 2025 + 1) }, (_, index) => now.getFullYear() - index);

  return <>
    <div className="topbar"><div><h1>Relatórios</h1><p className="muted">Consulte o histórico mensal e baixe seus relatórios em PDF.</p></div></div>
    <section className="card report-toolbar">
      <form method="get" className="report-period-form"><div className="field"><label>Mês</label><select name="month" defaultValue={month}>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></div><div className="field"><label>Ano</label><select name="year" defaultValue={year}>{years.map(item => <option key={item}>{item}</option>)}</select></div><button className="btn">Ver relatório</button></form>
      <div className="report-downloads"><a className="btn secondary" href={`/api/reports/pdf?month=${month}&year=${year}`}>Baixar PDF do mês</a><a className="btn" href={`/api/reports/pdf?year=${year}`}>Baixar PDF do ano</a></div>
    </section>
    <div className="report-period-title"><div><span className="metric-label">PERÍODO SELECIONADO</span><h2>{months[month - 1]} de {year}</h2></div><span className="pill">{rows.length} {rows.length === 1 ? "dia registrado" : "dias registrados"}</span></div>
    <div className="cards"><div className="card"><span className="metric-label">Faturamento</span><div className="metric-value">{currency(gross)}</div></div><div className="card"><span className="metric-label">Custos</span><div className="metric-value negative">{currency(costs)}</div></div><div className="card"><span className="metric-label">Lucro líquido</span><div className="metric-value positive">{currency(net)}</div></div><div className="card"><span className="metric-label">Média diária</span><div className="metric-value">{currency(rows.length ? net / rows.length : 0)}</div></div><div className="card"><span className="metric-label">Horas</span><div className="metric-value">{hours.toFixed(1)}h</div></div><div className="card"><span className="metric-label">Quilômetros</span><div className="metric-value">{km.toFixed(1)} km</div></div><div className="card"><span className="metric-label">Média líquida/h</span><div className="metric-value">{currency(hours ? net / hours : 0)}</div></div><div className="card"><span className="metric-label">Melhor dia</span><div className="metric-value">{best ? currency(best.m.net) : "—"}</div><small className="muted">{best ? brDate(best.j.date) : "Sem jornadas"}</small></div></div>
    <div className="grid2"><section className="card"><h2>Comparativo por aplicativo</h2>{[["Uber",uber],["99",n99],["inDrive",indrive],["Outros",other]].map(([name,value]) => <div key={String(name)} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}><div style={{ display: "flex", justifyContent: "space-between" }}><span>{name}</span><strong>{currency(Number(value))}</strong></div><div className="progress" style={{ marginTop: 8 }}><span style={{ width: `${gross ? Number(value) / gross * 100 : 0}%` }}/></div></div>)}</section><section className="card"><h2>Resumo do período</h2><div className="report-summary-list"><div><span>Dias trabalhados</span><strong>{rows.length}</strong></div><div><span>Ganho por km</span><strong>{currency(km ? net / km : 0)}</strong></div><div><span>Ganho por hora</span><strong>{currency(hours ? net / hours : 0)}</strong></div></div></section></div>
    <section className="card" style={{ marginTop: 16 }}><div className="section-title"><h2>Dias do relatório</h2></div><div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Horas</th><th>KM</th><th>Bruto</th><th>Custos</th><th>Líquido</th></tr></thead><tbody>{rows.map(({ j, m }) => <tr key={j.id}><td>{brDate(j.date)}</td><td>{m.hours.toFixed(1)}h</td><td>{m.km.toFixed(1)} km</td><td>{currency(m.gross)}</td><td className="negative">{currency(m.costs)}</td><td className={m.net >= 0 ? "positive" : "negative"}>{currency(m.net)}</td></tr>)}</tbody></table>{!rows.length && <div className="empty">Nenhum lançamento encontrado neste mês.</div>}</div></section>
  </>;
}
