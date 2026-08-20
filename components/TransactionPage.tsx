import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { currency, brDate } from "@/lib/format";
import type { TransactionType } from "@prisma/client";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default async function TransactionPage({ type, month: requestedMonth, year: requestedYear }: { type: TransactionType; month?: number; year?: number }) {
  const userId = await requireUser();
  const isIncome = type === "INCOME";
  const now = new Date();
  const month = Math.min(12, Math.max(1, requestedMonth || now.getMonth() + 1));
  const year = Math.min(2100, Math.max(2000, requestedYear || now.getFullYear()));
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const [items, categories] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, type, date: { gte: start, lt: end } }, include: { category: true }, orderBy: { date: "desc" } }),
    prisma.category.findMany({ where: { userId, type }, orderBy: { name: "asc" } })
  ]);
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const pagePath = isIncome ? "/app/receitas" : "/app/despesas";
  const periodPath = `${pagePath}?month=${month}&year=${year}`;
  const years = Array.from({ length: Math.max(3, now.getFullYear() - 2025 + 2) }, (_, index) => now.getFullYear() + 1 - index);
  const defaultDate = year === now.getFullYear() && month === now.getMonth() + 1 ? now.toISOString().slice(0, 10) : `${year}-${String(month).padStart(2, "0")}-01`;

  return <>
    <div className="topbar"><div><h1>{isIncome ? "Receitas" : "Despesas"}</h1><p className="muted">{isIncome ? "Registre todo dinheiro que entra." : "Acompanhe para onde seu dinheiro está indo."}</p></div><strong className={isIncome ? "positive" : "negative"}>{currency(total)}</strong></div>
    <section className="card bills-month-bar"><form method="get" className="bills-period"><div className="field"><label>Escolha o mês</label><select name="month" defaultValue={month}>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></div><div className="field"><label>Ano</label><select name="year" defaultValue={year}>{years.map(item => <option key={item}>{item}</option>)}</select></div><button className="btn secondary">Abrir mês</button></form><div className="bills-period-name"><span className="metric-label">MÊS ABERTO</span><strong>{months[month - 1]} de {year}</strong><span className={isIncome ? "positive" : "negative"}>{currency(total)}</span></div></section>
    <section className="card">
      <form action="/api/transactions" method="post" className="transaction-form"><input type="hidden" name="type" value={type}/><input type="hidden" name="returnMonth" value={month}/><input type="hidden" name="returnYear" value={year}/><div className="field"><label>Descrição</label><input name="description" required placeholder={isIncome ? "Ex.: Salário" : "Ex.: Supermercado"}/></div><div className="field"><label>Valor</label><input name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00"/></div><div className="field"><label>Data</label><input name="date" type="date" required defaultValue={defaultDate}/></div><div className="field"><label>Categoria</label><select name="categoryId" required><option value="">Selecione</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><button className="btn" style={{ marginBottom: 16 }}>Adicionar em {months[month - 1]}</button></form>
      <div className="table-wrap"><table className="table"><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><strong>{item.description}</strong></td><td><span className="pill">{item.category?.name}</span></td><td>{brDate(item.date)}</td><td className={isIncome ? "positive" : "negative"}>{currency(Number(item.amount))}</td><td><div className="transaction-actions"><details className="journey-edit"><summary className="btn secondary">Editar</summary><div className="journey-edit-panel transaction-edit-panel"><h3>Editar {isIncome ? "receita" : "despesa"}</h3><p className="muted">Altere os dados do lançamento e salve.</p><form action={`/api/transactions/${item.id}`} method="post"><input type="hidden" name="action" value="update"/><input type="hidden" name="returnMonth" value={month}/><input type="hidden" name="returnYear" value={year}/><div className="transaction-edit-grid"><div className="field"><label>Descrição</label><input name="description" defaultValue={item.description} required/></div><div className="field"><label>Valor</label><input name="amount" type="number" min="0.01" step="0.01" defaultValue={Number(item.amount)} required/></div><div className="field"><label>Data</label><input name="date" type="date" defaultValue={item.date.toISOString().slice(0, 10)} required/></div><div className="field"><label>Categoria</label><select name="categoryId" defaultValue={item.categoryId || ""} required><option value="">Selecione</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div></div><div className="transaction-edit-buttons"><a className="btn secondary" href={periodPath}>Cancelar</a><button className="btn">Salvar alterações</button></div></form></div></details><form action={`/api/transactions/${item.id}`} method="post"><input type="hidden" name="action" value="delete"/><input type="hidden" name="returnMonth" value={month}/><input type="hidden" name="returnYear" value={year}/><button className="btn danger" aria-label="Excluir">Excluir</button></form></div></td></tr>)}</tbody></table>{items.length === 0 && <div className="empty">Nenhum lançamento em {months[month - 1]} de {year}.</div>}</div>
    </section>
  </>;
}
