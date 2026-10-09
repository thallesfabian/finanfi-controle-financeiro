import JourneyManager from "@/components/JourneyManager";
import { requireUser } from "@/lib/auth";
import { currency } from "@/lib/format";
import { journeyMetrics } from "@/lib/journey";
import { monthPeriod } from "@/lib/month";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Motorista({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const userId = await requireUser();
  const { mes } = await searchParams;
  const period = monthPeriod(mes);
  const [journeys, goals, vehicle] = await Promise.all([
    prisma.journey.findMany({ where: { userId, date: { gte: period.start, lt: period.end } }, include: { costs: true } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.vehicle.findFirst({ where: { userId } })
  ]);
  const metrics = journeys.map(journeyMetrics);
  const gross = metrics.reduce((sum, item) => sum + item.gross, 0);
  const direct = metrics.reduce((sum, item) => sum + item.costs, 0);
  const km = metrics.reduce((sum, item) => sum + item.km, 0);
  const hours = metrics.reduce((sum, item) => sum + item.hours, 0);
  const fixed = Number(vehicle?.financingMonthly || 0) + Number(vehicle?.insuranceMonthly || 0) + Number(vehicle?.maintenanceMonthly || 0) + Number(vehicle?.annualTax || 0) / 12 + Number(vehicle?.depreciationMonthly || 0);
  const operational = gross - direct - fixed;
  const saving = Number(goals.find(goal => goal.type === "SAVINGS")?.target || 0);
  const contingency = Number(goals.find(goal => goal.type === "CONTINGENCY")?.target || goals.find(goal => goal.type === "OTHER")?.target || 0);
  const available = operational - saving - contingency;

  return <>
    <div className="topbar"><div><h1>Motorista</h1><p className="muted">Resumo e histórico mensal dos dias trabalhados.</p></div><form method="get"><div className="field"><label htmlFor="driver-month">Mês do histórico</label><input id="driver-month" name="mes" type="month" defaultValue={period.value}/></div><button className="btn">Ver mês</button></form></div>
    <div className="cards">
      <div className="card"><span className="metric-label">Faturamento bruto</span><div className="metric-value">{currency(gross)}</div></div>
      <div className="card"><span className="metric-label">Gastos dos dias</span><div className="metric-value negative">− {currency(direct)}</div></div>
      <div className="card"><span className="metric-label">Custo mensal do carro</span><div className="metric-value negative">− {currency(fixed)}</div><small className="muted">{currency(km ? fixed / km : 0)}/km em {period.label}</small></div>
      <div className="card"><span className="metric-label">Lucro operacional</span><div className="metric-value positive">{currency(operational)}</div></div>
      <div className="card"><span className="metric-label">Meta para guardar</span><div className="metric-value negative">− {currency(saving)}</div></div>
      <div className="card"><span className="metric-label">Reserva para imprevistos</span><div className="metric-value negative">− {currency(contingency)}</div></div>
      <div className="card available-card"><span className="metric-label">Líquido disponível</span><div className={`metric-value ${available >= 0 ? "positive" : "negative"}`}>{currency(available)}</div><small>Após todos os custos e reservas</small></div>
      <div className="card"><span className="metric-label">Desempenho disponível</span><div className="metric-value">{currency(hours ? available / hours : 0)}/h</div><small className="muted">{currency(km ? available / km : 0)}/km</small></div>
    </div>
    <section className="card calc-breakdown"><h2>Como o líquido de {period.label} foi calculado</h2><div><span>Faturamento bruto</span><strong>{currency(gross)}</strong></div><div><span>− Gastos informados nos dias</span><strong>{currency(direct)}</strong></div><div><span>− Custos mensais do carro e depreciação</span><strong>{currency(fixed)}</strong></div><div><span>− Meta de guardar dinheiro</span><strong>{currency(saving)}</strong></div><div><span>− Reserva para imprevistos</span><strong>{currency(contingency)}</strong></div><div className="calc-total"><span>= Líquido disponível</span><strong>{currency(available)}</strong></div></section>
    <JourneyManager month={period.value} start={period.start} end={period.end} monthLabel={period.label}/>
  </>;
}
