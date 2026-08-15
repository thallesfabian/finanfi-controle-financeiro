import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { currency } from "@/lib/format";
import { journeyMetrics } from "@/lib/journey";

export const dynamic = "force-dynamic";

export default async function Metas() {
  const userId = await requireUser();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const [goals, journeys, vehicle] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.journey.findMany({ where: { userId, date: { gte: start, lt: end } }, include: { costs: true } }),
    prisma.vehicle.findFirst({ where: { userId } })
  ]);
  const metrics = journeys.map(journeyMetrics);
  const directCosts = metrics.reduce((sum, item) => sum + item.costs, 0);
  const totalKm = metrics.reduce((sum, item) => sum + item.km, 0);
  const workedDays = new Set(journeys.map(journey => journey.date.toISOString().slice(0, 10))).size;
  const fixedCar = Number(vehicle?.financingMonthly || 0) + Number(vehicle?.insuranceMonthly || 0) + Number(vehicle?.maintenanceMonthly || 0) + Number(vehicle?.annualTax || 0) / 12 + Number(vehicle?.depreciationMonthly || 0);
  const avgDirect = workedDays ? directCosts / workedDays : 0;

  return <>
    <div className="topbar"><div><h1>Metas</h1><p className="muted">Planeje quanto precisa faturar para alcançar o valor líquido desejado.</p></div></div>
    <section className="card">
      <form action="/api/goals" method="post" className="goal-form">
        <div className="field"><label>Nome</label><input name="name" required placeholder="Meta líquida mensal" /></div>
        <div className="field"><label>Tipo</label><select name="type"><option value="NET_REVENUE">Líquido mensal</option><option value="REVENUE">Faturamento bruto</option><option value="SAVINGS">Guardar dinheiro</option><option value="CONTINGENCY">Cobrir imprevistos</option><option value="OTHER">Outra</option></select></div>
        <div className="field"><label>Valor da meta</label><input name="target" type="number" step="0.01" min="0.01" required placeholder="5000,00" /></div>
        <div className="field"><label>Valor que já fiz</label><input name="current" type="number" min="0" step="0.01" defaultValue="0" /><small className="muted">Você poderá atualizar este valor na meta.</small></div>
        <div className="field"><label>Dias que pretende trabalhar</label><input name="workDays" type="number" min="1" max="31" /><small className="muted">Informe para metas bruta ou líquida.</small></div>
        <button className="btn goal-submit">Criar meta</button>
      </form>
    </section>
    <div className="cards goal-cards" style={{ marginTop: 16 }}>
      {goals.map(goal => {
        const isGross = goal.type === "REVENUE";
        const isNet = goal.type === "NET_REVENUE";
        const driverGoal = isGross || isNet;
        const target = Number(goal.target);
        const current = Number(goal.current);
        const days = goal.workDays || 1;
        const daysLeft = Math.max(0, days - workedDays);
        const remaining = Math.max(0, target - current);
        const netPerDay = target / days;
        const carPerDay = fixedCar / days;
        const grossPerDay = isNet ? netPerDay + carPerDay + avgDirect : target / days;
        const neededNow = daysLeft ? remaining / daysLeft : remaining;
        const progress = Math.min(100, Math.max(0, current / target * 100 || 0));
        return <article className="card goal-plan" key={goal.id}>
          <div className="section-title"><div><span className="metric-label">{isNet ? "META LÍQUIDA" : isGross ? "META DE FATURAMENTO BRUTO" : "META FINANCEIRA"}</span><h2>{goal.name}</h2></div><form action={`/api/goals/${goal.id}`} method="post"><input type="hidden" name="action" value="delete" /><button className="btn danger">Excluir</button></form></div>
          <div className="goal-summary"><div><span className="metric-label">Meta mensal</span><strong>{currency(target)}</strong></div><div><span className="metric-label">Valor que já fiz</span><strong className="positive">{currency(current)}</strong></div><div><span className="metric-label">Falta</span><strong>{currency(remaining)}</strong></div></div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div><p className="muted">{progress.toFixed(1)}% alcançado</p>
          <form action={`/api/goals/${goal.id}`} method="post" className="goal-current-form"><div className="field"><label>Atualizar o valor que já fiz</label><input name="current" type="number" min="0" step="0.01" defaultValue={current} /></div><button className="btn">Atualizar</button></form>
          {isNet && <><div className="net-plan"><div><span>Líquido que precisa sobrar por dia</span><strong>{currency(netPerDay)}</strong></div><div><span>Custo diário do carro</span><strong>+ {currency(carPerDay)}</strong></div><div><span>Média de outros gastos por dia</span><strong>+ {currency(avgDirect)}</strong></div><div className="net-plan-total"><span>Faturamento bruto necessário por dia</span><strong>{currency(grossPerDay)}</strong></div></div><p className="goal-alert">Para sobrar <strong>{currency(target)} líquidos</strong>, trabalhe <strong>{days} dias</strong> buscando faturar aproximadamente <strong>{currency(grossPerDay)} bruto por dia</strong>.</p></>}
          {isGross && <div className="goal-instruction"><span>Planejamento mensal</span><strong>{days} dias</strong><span>Faturamento bruto necessário por dia</span><strong>{currency(grossPerDay)}</strong></div>}
          {driverGoal && <div className="goal-live"><div><span className="metric-label">Dias já trabalhados</span><strong>{workedDays}</strong></div><div><span className="metric-label">KM rodados no mês</span><strong>{totalKm.toFixed(1)} km</strong></div><div><span className="metric-label">Dias restantes</span><strong>{daysLeft}</strong></div><div><span className="metric-label">Meta restante por dia</span><strong>{currency(neededNow)}</strong></div><div><span className="metric-label">Custos mensais do carro</span><strong>{currency(fixedCar)}</strong></div></div>}
        </article>;
      })}
    </div>
    {!goals.length && <div className="empty">Crie uma meta líquida e informe quantos dias pretende trabalhar.</div>}
  </>;
}
