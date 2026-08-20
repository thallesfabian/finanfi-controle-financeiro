import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { currency } from "@/lib/format";

export const dynamic = "force-dynamic";
const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default async function Contas({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const userId = await requireUser();
  const query = await searchParams;
  const now = new Date();
  const month = Math.min(12, Math.max(1, Number(query.month) || now.getMonth() + 1));
  const year = Math.min(2100, Math.max(2000, Number(query.year) || now.getFullYear()));
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));
  const [bills, transactions, journeys] = await Promise.all([
    prisma.bill.findMany({ where: { userId, OR: [{ recurring: true }, { recurring: false, month, year }] }, include: { payments: { where: { month, year } }, monthOverrides: { where: { month, year } } }, orderBy: { dueDay: "asc" } }),
    prisma.transaction.findMany({ where: { userId, date: { gte: periodStart, lt: periodEnd } } }),
    prisma.journey.findMany({ where: { userId, date: { gte: periodStart, lt: periodEnd } } })
  ]);
  const uberIncome = journeys.reduce((sum, journey) => sum + Number(journey.uber), 0);
  const registeredIncome = transactions.filter(item => item.type === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0);
  const registeredExpenses = transactions.filter(item => item.type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0);
  const income = uberIncome + registeredIncome;
  const availableBeforeBills = income - registeredExpenses;
  const isPaid = (bill: typeof bills[number]) => bill.payments.length > 0;
  const monthlyBill = (bill: typeof bills[number]) => bill.monthOverrides[0] || bill;
  const total = bills.reduce((sum, bill) => sum + Number(monthlyBill(bill).amount), 0);
  const paid = bills.filter(isPaid).reduce((sum, bill) => sum + Number(monthlyBill(bill).amount), 0);
  const pending = total - paid;
  const available = availableBeforeBills - total;
  const fixed = bills.filter(bill => bill.recurring).reduce((sum, bill) => sum + Number(monthlyBill(bill).amount), 0);
  const years = Array.from({ length: Math.max(3, now.getFullYear() - 2025 + 2) }, (_, index) => now.getFullYear() + 1 - index);
  const period = `${months[month - 1]} de ${year}`;

  return <>
    <div className="topbar"><div><h1>Contas</h1><p className="muted">Cada mês possui sua própria lista de faturas e débitos.</p></div></div>
    <section className="card bills-month-bar"><form method="get" className="bills-period"><div className="field"><label>Escolha o mês</label><select name="month" defaultValue={month}>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></div><div className="field"><label>Ano</label><select name="year" defaultValue={year}>{years.map(item => <option key={item}>{item}</option>)}</select></div><button className="btn secondary">Abrir mês</button></form><div className="bills-period-name"><span className="metric-label">MÊS ABERTO</span><strong>{period}</strong></div></section>

    <section className="card monthly-income"><div><span className="metric-label">RESUMO AUTOMÁTICO DE {months[month - 1].toUpperCase()}</span><h2>Dinheiro disponível no mês</h2><p className="muted">Atualizado pelos ganhos da Uber e pelos lançamentos em Receitas e Despesas.</p></div><div className="monthly-auto-total"><span>Uber + receitas − despesas</span><strong className={availableBeforeBills >= 0 ? "positive" : "negative"}>{currency(availableBeforeBills)}</strong></div></section>

    <div className="cards bills-summary"><div className="card"><span className="metric-label">Ganhos da Uber</span><div className="metric-value positive">{currency(uberIncome)}</div></div><div className="card"><span className="metric-label">Outras receitas</span><div className="metric-value positive">{currency(registeredIncome)}</div></div><div className="card"><span className="metric-label">Despesas registradas</span><div className="metric-value negative">− {currency(registeredExpenses)}</div></div><div className="card"><span className="metric-label">Total dos débitos</span><div className="metric-value negative">− {currency(total)}</div></div><div className={`card bills-available ${available < 0 ? "is-negative" : ""}`}><span className="metric-label">Ainda posso gastar</span><div className="metric-value">{currency(available)}</div><small>Após despesas e contas do mês</small></div><div className="card"><span className="metric-label">Falta pagar</span><div className="metric-value negative">{currency(pending)}</div><small className="muted">{currency(paid)} pagos</small></div></div>

    <div className="bills-workspace">
      <section className="card bill-add-card"><span className="metric-label">NOVO DÉBITO</span><h2>Adicionar em {months[month - 1]}</h2><p className="muted">Cadastre uma fatura deste mês ou uma conta fixa.</p><form action="/api/bills" method="post" className="bill-month-form"><input type="hidden" name="month" value={month}/><input type="hidden" name="year" value={year}/><div className="field"><label>Nome</label><input name="name" required placeholder="Ex.: Cartão Nubank"/></div><div className="field"><label>Valor</label><input name="amount" type="number" step="0.01" min="0.01" required placeholder="0,00"/></div><div className="bill-form-row"><div className="field"><label>Vence dia</label><input name="dueDay" type="number" min="1" max="31" required/></div><div className="field"><label>Categoria</label><input name="category" required placeholder="Ex.: Cartão"/></div></div><div className="field"><label>Pagamento</label><select name="paymentMethod"><option>Pix</option><option>Cartão</option><option>Débito</option><option>Boleto</option></select></div><label className="fixed-check bill-fixed-check"><input type="checkbox" name="recurring"/><span><strong>Repetir todo mês</strong><small>Para aluguel, internet e outras contas fixas.</small></span></label><button className="btn full">Adicionar em {months[month - 1]}</button></form></section>

      <section className="card month-debts-card"><div className="month-debts-head"><div><span className="metric-label">DÉBITOS DO MÊS</span><h2>{period}</h2><p>Fixos: {currency(fixed)} · Deste mês: {currency(total - fixed)}</p></div><div><strong>{currency(total)}</strong><span>{bills.length} {bills.length === 1 ? "item" : "itens"}</span></div></div>
        <div className="month-debts-list">{bills.map(bill => { const paidNow = isPaid(bill); const shown = monthlyBill(bill); return <article className={`month-debt ${paidNow ? "is-paid" : ""}`} key={bill.id}><div className="month-debt-main"><div className="debt-due"><span>Dia</span><strong>{shown.dueDay}</strong></div><div className="debt-name"><strong>{shown.name}</strong><span>{shown.category} · {bill.recurring ? "Fixa mensal" : `Somente ${months[month - 1]}`}</span></div><div className="debt-value"><strong>{currency(Number(shown.amount))}</strong><span className={`bill-status ${paidNow ? "paid" : "pending"}`}>{paidNow ? "Paga" : "Pendente"}</span></div></div><div className="month-debt-actions"><form action={`/api/bills/${bill.id}`} method="post"><input type="hidden" name="action" value="toggle"/><input type="hidden" name="month" value={month}/><input type="hidden" name="year" value={year}/><button className="btn secondary">{paidNow ? "Marcar pendente" : "Marcar paga"}</button></form><details className="debt-edit"><summary className="btn secondary">Editar</summary><form action={`/api/bills/${bill.id}`} method="post" className="debt-edit-form"><input type="hidden" name="action" value="update"/><input type="hidden" name="month" value={month}/><input type="hidden" name="year" value={year}/><div className="field"><label>Nome</label><input name="name" defaultValue={shown.name} required/></div><div className="field"><label>Valor</label><input name="amount" type="number" min="0.01" step="0.01" defaultValue={Number(shown.amount)} required/></div><div className="field"><label>Vencimento</label><input name="dueDay" type="number" min="1" max="31" defaultValue={shown.dueDay} required/></div><div className="field"><label>Categoria</label><input name="category" defaultValue={shown.category} required/></div><div className="field"><label>Pagamento</label><select name="paymentMethod" defaultValue={shown.paymentMethod || "Pix"}><option>Pix</option><option>Cartão</option><option>Débito</option><option>Boleto</option></select></div><button className="btn">Salvar alteração</button>{bill.recurring && <small className="muted">A alteração valerá somente para {months[month - 1]} de {year}.</small>}</form></details><form action={`/api/bills/${bill.id}`} method="post"><input type="hidden" name="action" value="delete"/><input type="hidden" name="month" value={month}/><input type="hidden" name="year" value={year}/><button className="btn danger">Excluir</button></form></div></article>; })}{!bills.length && <div className="empty">Nenhum débito cadastrado em {months[month - 1]}.</div>}</div>
      </section>
    </div>
  </>;
}
