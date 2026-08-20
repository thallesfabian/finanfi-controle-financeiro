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
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();
  const [goals, journeys, vehicle, bills] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.journey.findMany({ where: { userId, date: { gte: start, lt: end } }, include: { costs: true } }),
    prisma.vehicle.findFirst({ where: { userId } }),
    prisma.bill.findMany({
      where: { userId, OR: [{ recurring: true }, { recurring: false, month: currentMonth, year: currentYear }] },
      include: {
        payments: { where: { month: currentMonth, year: currentYear } },
        monthOverrides: { where: { month: currentMonth, year: currentYear } }
      }
    })
  ]);
  const metrics = journeys.map(journeyMetrics);
  const grossEarned = metrics.reduce((sum, item) => sum + item.gross, 0);
  const directCosts = metrics.reduce((sum, item) => sum + item.costs, 0);
  const totalKm = metrics.reduce((sum, item) => sum + item.km, 0);
  const workedDays = new Set(journeys.map(journey => journey.date.toISOString().slice(0, 10))).size;
  const fixedCar = Number(vehicle?.financingMonthly || 0) + Number(vehicle?.insuranceMonthly || 0) + Number(vehicle?.maintenanceMonthly || 0) + Number(vehicle?.annualTax || 0) / 12 + Number(vehicle?.depreciationMonthly || 0);
  const avgDirect = workedDays ? directCosts / workedDays : 0;
  const calendarDaysPassed = Math.max(0, now.getUTCDate() - 1);
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
  const calendarDaysLeft = Math.max(1, daysInMonth - now.getUTCDate() + 1);
  const billAmount = (bill: typeof bills[number]) => Number((bill.monthOverrides[0] || bill).amount);
  const billsTotal = bills.reduce((sum, bill) => sum + billAmount(bill), 0);
  const billsPaid = bills.filter(bill => bill.payments.length > 0).reduce((sum, bill) => sum + billAmount(bill), 0);
  const billsRemaining = Math.max(0, billsTotal - billsPaid);
  const billsProgress = billsTotal ? Math.min(100, billsPaid / billsTotal * 100) : 0;
  const billsPerDay = billsRemaining / calendarDaysLeft;

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
      <article className="card goal-plan bills-goal-card">
        <div className="section-title"><div><span className="metric-label">META AUTOMÁTICA DAS CONTAS</span><h2>Pagar as contas de {now.toLocaleDateString("pt-BR", { month: "long" })}</h2></div><span className="pill">Atualização automática</span></div>
        <div className="goal-summary"><div><span className="metric-label">Total das contas</span><strong>{currency(billsTotal)}</strong></div><div><span className="metric-label">Já pago</span><strong className="positive">{currency(billsPaid)}</strong></div><div><span className="metric-label">Ainda precisa</span><strong className={billsRemaining > 0 ? "negative" : "positive"}>{currency(billsRemaining)}</strong></div></div>
        <div className="progress"><span style={{ width: `${billsProgress}%` }} /></div><p className="muted">{billsProgress.toFixed(1)}% das contas pagas</p>
        <div className={`goal-recovery ${billsRemaining === 0 ? "complete" : ""}`}><span>{billsRemaining > 0 ? "Quanto precisa fazer por dia" : "Contas do mês cobertas"}</span><strong>{billsRemaining > 0 ? `${currency(billsPerDay)} por dia` : "Tudo pago"}</strong><small>{billsRemaining > 0 ? `Dividido pelos ${calendarDaysLeft} dias restantes deste mês.` : "Nenhum valor pendente nas contas cadastradas."}</small></div>
        <div className="goal-live"><div><span className="metric-label">Contas cadastradas</span><strong>{bills.length}</strong></div><div><span className="metric-label">Contas pagas</span><strong>{bills.filter(bill => bill.payments.length > 0).length}</strong></div><div><span className="metric-label">Dias restantes no mês</span><strong>{calendarDaysLeft}</strong></div><div><span className="metric-label">Meta restante</span><strong>{currency(billsRemaining)}</strong></div></div>
      </article>
      {goals.map(goal => {
        const isGross = goal.type === "REVENUE";
        const isNet = goal.type === "NET_REVENUE";
        const driverGoal = isGross || isNet;
        const target = Number(goal.target);
        const savedCurrent = Number(goal.current);
        const days = goal.workDays || 1;
        const plannedDaysUsed = Math.min(days, Math.max(calendarDaysPassed, workedDays));
        const daysLeft = Math.max(0, days - plannedDaysUsed);
        const fixedCostEarned = fixedCar / days * workedDays;
        const automaticCurrent = isGross ? grossEarned : isNet ? Math.max(0, grossEarned - directCosts - fixedCostEarned) : savedCurrent;
        const current = automaticCurrent;
        const remaining = Math.max(0, target - current);
        const carPerDay = fixedCar / days;
        const neededNow = daysLeft ? remaining / daysLeft : remaining;
        const adjustedGrossNow = isNet ? neededNow + carPerDay + avgDirect : neededNow;
        const progress = Math.min(100, Math.max(0, current / target * 100 || 0));
        return <article className="card goal-plan" key={goal.id}>
          <div className="section-title"><div><span className="metric-label">{isNet ? "META LÍQUIDA" : isGross ? "META DE FATURAMENTO BRUTO" : "META FINANCEIRA"}</span><h2>{goal.name}</h2></div><div className="goal-actions"><details className="journey-edit"><summary className="btn secondary">Editar</summary><div className="journey-edit-panel goal-edit-panel"><h3>Editar meta</h3><p className="muted">Altere os dados e o planejamento será recalculado.</p><form action={`/api/goals/${goal.id}`} method="post"><input type="hidden" name="action" value="update"/><div className="transaction-edit-grid"><div className="field"><label>Nome</label><input name="name" defaultValue={goal.name} required/></div><div className="field"><label>Tipo</label><select name="type" defaultValue={goal.type}><option value="NET_REVENUE">Líquido mensal</option><option value="REVENUE">Faturamento bruto</option><option value="SAVINGS">Guardar dinheiro</option><option value="CONTINGENCY">Cobrir imprevistos</option><option value="OTHER">Outra</option></select></div><div className="field"><label>Valor da meta</label><input name="target" type="number" min="0.01" step="0.01" defaultValue={target} required/></div><div className="field"><label>Dias que pretende trabalhar</label><input name="workDays" type="number" min="1" max="31" defaultValue={goal.workDays || ""}/></div>{!driverGoal && <div className="field"><label>Valor que já fiz</label><input name="current" type="number" min="0" step="0.01" defaultValue={savedCurrent}/></div>}</div><div className="transaction-edit-buttons"><a className="btn secondary" href="/app/metas">Cancelar</a><button className="btn">Salvar alterações</button></div></form></div></details><form action={`/api/goals/${goal.id}`} method="post"><input type="hidden" name="action" value="delete" /><button className="btn danger">Excluir</button></form></div></div>
          <div className="goal-summary"><div><span className="metric-label">Meta mensal</span><strong>{currency(target)}</strong></div><div><span className="metric-label">Valor que já fiz</span><strong className="positive">{currency(current)}</strong>{driverGoal && <small className="muted">Calculado pelos lançamentos em Motorista</small>}</div><div><span className="metric-label">Falta</span><strong>{currency(remaining)}</strong></div></div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div><p className="muted">{progress.toFixed(1)}% alcançado</p>
          {!driverGoal && <form action={`/api/goals/${goal.id}`} method="post" className="goal-current-form"><div className="field"><label>Atualizar o valor que já fiz</label><input name="current" type="number" min="0" step="0.01" defaultValue={current} /></div><button className="btn">Atualizar</button></form>}
          {isNet && <><div className="net-plan"><div><span>Líquido que precisa sobrar por dia restante</span><strong>{currency(neededNow)}</strong></div><div><span>Custo diário do carro</span><strong>+ {currency(carPerDay)}</strong></div><div><span>Média de outros gastos por dia</span><strong>+ {currency(avgDirect)}</strong></div><div className="net-plan-total"><span>Faturamento bruto necessário nos próximos dias</span><strong>{currency(adjustedGrossNow)}</strong></div></div><p className="goal-alert">Para ainda alcançar <strong>{currency(target)} líquidos</strong>, busque faturar aproximadamente <strong>{currency(adjustedGrossNow)} bruto</strong> em cada um dos <strong>{daysLeft} dias planejados restantes</strong>.</p></>}
          {isGross && <div className="goal-instruction"><span>Dias planejados restantes</span><strong>{daysLeft} dias</strong><span>Faturamento bruto necessário nos próximos dias</span><strong>{currency(adjustedGrossNow)}</strong></div>}
          {driverGoal && <><div className="goal-recovery"><span>Meta recalculada para os próximos dias</span><strong>{currency(adjustedGrossNow)} bruto por dia</strong><small>O valor aumenta automaticamente quando um dia passa sem trabalho ou quando o faturamento fica abaixo do necessário.</small></div><div className="goal-live"><div><span className="metric-label">Dias já trabalhados</span><strong>{workedDays}</strong></div><div><span className="metric-label">KM rodados no mês</span><strong>{totalKm.toFixed(1)} km</strong></div><div><span className="metric-label">Dias planejados restantes</span><strong>{daysLeft}</strong></div><div><span className="metric-label">Meta restante por dia</span><strong>{currency(neededNow)}</strong></div><div><span className="metric-label">Custos mensais do carro</span><strong>{currency(fixedCar)}</strong></div></div></>}
        </article>;
      })}
    </div>
    {!goals.length && <div className="empty">Além da meta automática das contas, você pode criar uma meta líquida e informar quantos dias pretende trabalhar.</div>}
  </>;
}
