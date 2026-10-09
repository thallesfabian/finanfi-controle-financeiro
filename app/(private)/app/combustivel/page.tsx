import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { currency, brDate } from "@/lib/format";
import { monthPeriod } from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function Combustivel({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const userId = await requireUser();
  const { mes } = await searchParams;
  const period = monthPeriod(mes);
  const [items, vehicle] = await Promise.all([
    prisma.fueling.findMany({ where: { userId, date: { gte: period.start, lt: period.end } }, orderBy: { date: "desc" } }),
    prisma.vehicle.findFirst({ where: { userId } })
  ]);
  const total = items.reduce((sum, item) => sum + Number(item.total), 0);
  const liters = items.reduce((sum, item) => sum + Number(item.liters), 0);
  const averagePrice = liters ? total / liters : 0;
  const consumption = Number(vehicle?.avgConsumption || 0);

  return <>
    <div className="topbar"><div><h1>Combustível</h1><p className="muted">Abastecimentos e custo estimado por quilômetro em {period.label}.</p></div><form method="get"><div className="field"><label htmlFor="fuel-month">Mês do histórico</label><input id="fuel-month" name="mes" type="month" defaultValue={period.value}/></div><button className="btn">Ver mês</button></form></div>
    <div className="cards"><div className="card"><span className="metric-label">Total abastecido</span><div className="metric-value">{currency(total)}</div></div><div className="card"><span className="metric-label">Litros</span><div className="metric-value">{liters.toFixed(2)} L</div></div><div className="card"><span className="metric-label">Preço médio</span><div className="metric-value">{currency(averagePrice)}/L</div></div><div className="card"><span className="metric-label">Custo estimado/km</span><div className="metric-value">{currency(consumption ? averagePrice / consumption : 0)}</div></div></div>
    <section className="card" style={{ marginTop: 16 }}>
      <form action="/api/fuelings" method="post" className="transaction-form"><div className="field"><label>Data</label><input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)}/></div><div className="field"><label>Litros</label><input name="liters" type="number" min="0.001" step="0.001" required/></div><div className="field"><label>Valor por litro</label><input name="pricePerLiter" type="number" min="0.001" step="0.001" required/></div><div className="field"><label>Quilometragem <span className="muted">(opcional)</span></label><input name="odometer" type="number" min="0" step="0.1" placeholder="Não obrigatório"/></div><button className="btn" style={{ marginBottom: 16 }}>Registrar</button></form>
      <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Litros</th><th>Preço/l</th><th>Total</th><th>Odômetro</th><th>Ações</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{brDate(item.date)}</td><td>{Number(item.liters).toFixed(2)} L</td><td>{currency(Number(item.pricePerLiter))}</td><td>{currency(Number(item.total))}</td><td>{item.odometer !== null ? `${Number(item.odometer).toFixed(1)} km` : "Não informado"}</td><td><div className="fuel-actions"><details className="journey-edit"><summary className="btn secondary">Editar</summary><div className="journey-edit-panel fuel-edit-panel"><h3>Editar abastecimento de {brDate(item.date)}</h3><p className="muted">O valor total será recalculado usando os novos litros e preço.</p><form action={`/api/fuelings/${item.id}`} method="post"><input type="hidden" name="action" value="update"/><div className="fuel-edit-grid"><div className="field"><label>Data</label><input name="date" type="date" required defaultValue={item.date.toISOString().slice(0, 10)}/></div><div className="field"><label>Litros</label><input name="liters" type="number" min="0.001" step="0.001" required defaultValue={Number(item.liters)}/></div><div className="field"><label>Valor por litro</label><input name="pricePerLiter" type="number" min="0.001" step="0.001" required defaultValue={Number(item.pricePerLiter)}/></div><div className="field"><label>Quilometragem</label><input name="odometer" type="number" min="0" step="0.1" defaultValue={item.odometer === null ? "" : Number(item.odometer)}/></div></div><div className="fuel-edit-buttons"><a className="btn secondary" href="/app/combustivel">Cancelar</a><button className="btn">Salvar alterações</button></div></form></div></details><form action={`/api/fuelings/${item.id}`} method="post"><input type="hidden" name="action" value="delete"/><button className="btn danger">Excluir</button></form></div></td></tr>)}</tbody></table>{!items.length && <div className="empty">Nenhum abastecimento registrado.</div>}</div>
    </section>
  </>;
}
