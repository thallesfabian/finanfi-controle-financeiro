import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { currency, brDate } from "@/lib/format";
import { journeyMetrics } from "@/lib/journey";

const moneyFields = [["Uber","uber"],["99","ninetyNine"],["inDrive","inDrive"],["Outros apps","otherApps"],["Gorjetas","tips"],["Outros ganhos","otherIncome"]] as const;
const costFields = [["Combustível","fuel"],["Alimentação","food"],["Pedágio","toll"],["Outros","otherCost"]] as const;

const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const timeValue = (date: Date) => date.toISOString().slice(11, 16);

export default async function JourneyManager({ month, start, end, monthLabel }: { month: string; start: Date; end: Date; monthLabel: string }) {
  const userId = await requireUser();
  const journeys = await prisma.journey.findMany({ where: { userId, date: { gte: start, lt: end } }, include: { costs: true }, orderBy: { date: "desc" } });
  return <>
    <section className="card journey-entry">
      <div className="section-title"><div><h2>Registrar dia de trabalho</h2><p className="muted">Informe os ganhos, gastos e quantos quilômetros rodou no dia.</p></div></div>
      <form action="/api/journeys" method="post"><input type="hidden" name="returnMonth" value={month}/>
        <div className="cards">
          <div className="field"><label>Data</label><input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></div>
          <div className="field"><label>Início</label><input name="startTime" type="time" required/></div>
          <div className="field"><label>Término</label><input name="endTime" type="time" required/></div>
          <div className="field"><label>KM rodados no dia</label><input name="distanceKm" type="number" min="0" step="0.1" required placeholder="Ex.: 185,5"/><small className="muted">Use o valor do hodômetro parcial após o trabalho.</small></div>
        </div>
        <h3>Ganhos</h3><div className="cards">{moneyFields.map(([label,name])=><div className="field" key={name}><label>{label}</label><input name={name} type="number" step="0.01" defaultValue="0"/></div>)}</div>
        <h3>Gastos do dia</h3><div className="cards">{costFields.map(([label,name])=><div className="field" key={name}><label>{label}</label><input name={name} type="number" step="0.01" defaultValue="0"/></div>)}</div>
        <button className="btn">Salvar dia de trabalho</button>
      </form>
    </section>
    <section className="card journey-history">
      <div className="section-title"><div><h2>Histórico de {monthLabel}</h2><p className="muted">Os meses anteriores continuam salvos e podem ser consultados pelo seletor acima.</p></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Horas</th><th>KM rodados</th><th>Bruto</th><th>Gastos</th><th>Lucro do dia</th><th>Líquido/h</th><th>Líquido/km</th><th>Ações</th></tr></thead><tbody>{journeys.map(j=>{const m=journeyMetrics(j);return <tr key={j.id}><td>{brDate(j.date)}</td><td>{m.hours.toFixed(1)}h</td><td>{m.km.toFixed(1)} km</td><td>{currency(m.gross)}</td><td className="negative">{currency(m.costs)}</td><td className={m.net>=0?"positive":"negative"}>{currency(m.net)}</td><td>{currency(m.netHour)}</td><td>{currency(m.netKm)}</td><td><div className="journey-actions"><details className="journey-edit"><summary className="btn">Editar</summary><div className="journey-edit-panel"><h3>Editar lançamento de {brDate(j.date)}</h3><form action={`/api/journeys/${j.id}`} method="post"><input type="hidden" name="action" value="update"/><div className="journey-edit-grid"><div className="field"><label>Data</label><input name="date" type="date" required defaultValue={dateValue(j.date)}/></div><div className="field"><label>Início</label><input name="startTime" type="time" required defaultValue={timeValue(j.startTime)}/></div><div className="field"><label>Término</label><input name="endTime" type="time" required defaultValue={timeValue(j.endTime)}/></div><div className="field"><label>KM rodados</label><input name="distanceKm" type="number" min="0" step="0.1" required defaultValue={m.km}/></div>{moneyFields.map(([label,name])=><div className="field" key={name}><label>{label}</label><input name={name} type="number" step="0.01" defaultValue={Number(j[name])}/></div>)}{costFields.map(([label,name])=><div className="field" key={name}><label>{label}</label><input name={name} type="number" step="0.01" defaultValue={Number(j.costs.find(c=>c.category===label)?.amount||0)}/></div>)}</div><div className="journey-edit-buttons"><button className="btn" type="submit">Salvar alterações</button></div></form></div></details><form action={`/api/journeys/${j.id}`} method="post"><input type="hidden" name="action" value="delete"/><button className="btn danger">Excluir</button></form></div></td></tr>})}</tbody></table>{!journeys.length&&<div className="empty">Nenhum dia de trabalho registrado.</div>}</div>
    </section>
  </>;
}
