import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { currency, brDate } from "@/lib/format";
import { CalendarDays, CircleDollarSign, PiggyBank, Target } from "lucide-react";

const dateInput = (date: Date | null) => date ? date.toISOString().slice(0, 10) : "";

export default async function Cofres() {
  const userId = await requireUser();
  const vaults = await prisma.vault.findMany({ where: { userId }, orderBy: { targetDate: "asc" } });
  const todayText = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const today = new Date(`${todayText}T12:00:00Z`);
  return <>
    <div className="topbar"><div><h1>Cofres</h1><p className="muted">Defina quando quer alcançar cada objetivo e acompanhe quanto guardar por dia.</p></div></div>
    <section className="card vault-create"><div className="section-title"><div><h2>Criar um novo objetivo</h2><p className="muted">Informe o valor e a data em que pretende alcançá-lo.</p></div></div><form action="/api/vaults" method="post" className="vault-form"><div className="field"><label>Nome do objetivo</label><input name="name" required placeholder="Ex.: Viagem de férias" /></div><div className="field"><label>Valor da meta</label><input name="target" type="number" min="0.01" step="0.01" required placeholder="0,00" /></div><div className="field"><label>Quanto já tenho</label><input name="balance" type="number" min="0" step="0.01" defaultValue="0" /></div><div className="field"><label>Quero alcançar até</label><input name="targetDate" type="date" min={todayText} required /></div><button className="btn">Criar planejamento</button></form></section>
    <div className="vault-grid">{vaults.map(vault => {
      const target = Number(vault.target), balance = Number(vault.balance), remaining = Math.max(0, target - balance), progress = Math.min(100, Math.max(0, balance / target * 100 || 0));
      const diff = vault.targetDate ? Math.ceil((vault.targetDate.getTime() - today.getTime()) / 86400000) : null;
      const daysLeft = diff === null ? null : Math.max(0, diff + 1);
      const daily = daysLeft && remaining > 0 ? remaining / daysLeft : 0;
      const complete = remaining === 0;
      const overdue = !complete && daysLeft === 0;
      return <article className={`card vault-card ${complete ? "vault-complete" : ""}`} key={vault.id}>
        <div className="vault-card-head"><div className="vault-icon"><PiggyBank size={23}/></div><div><span className="metric-label">OBJETIVO</span><h2>{vault.name}</h2></div><form action={`/api/vaults/${vault.id}`} method="post"><input type="hidden" name="action" value="delete"/><button className="btn danger">Excluir</button></form></div>
        <div className="vault-balance"><span>Guardado até agora</span><strong>{currency(balance)}</strong><small>de {currency(target)}</small></div>
        <div className="progress"><span style={{ width: `${progress}%` }}/></div><div className="vault-progress-label"><span>{progress.toFixed(1)}% alcançado</span><strong>Faltam {currency(remaining)}</strong></div>
        {vault.targetDate ? <div className={`vault-daily ${overdue ? "overdue" : complete ? "complete" : ""}`}><div className="vault-daily-icon"><CircleDollarSign size={25}/></div><div><span>{complete ? "Meta alcançada" : overdue ? "Prazo encerrado" : "Deposite por dia"}</span><strong>{complete ? "Parabéns!" : overdue ? currency(remaining) + " pendentes" : currency(daily)}</strong>{!complete && !overdue && <small>para atingir a meta no prazo</small>}</div></div> : <div className="vault-no-date"><CalendarDays size={20}/><span>Defina uma data para calcular o depósito diário.</span></div>}
        <div className="vault-details"><div><CalendarDays size={18}/><span>Data da meta</span><strong>{vault.targetDate ? brDate(vault.targetDate) : "Não definida"}</strong></div><div><Target size={18}/><span>Dias restantes</span><strong>{daysLeft === null ? "—" : daysLeft}</strong></div></div>
        <form action={`/api/vaults/${vault.id}`} method="post" className="vault-deposit"><div className="vault-deposit-field"><label>Depósito de hoje</label><input name="deposit" type="number" min="0.01" step="0.01" defaultValue={daily > 0 ? daily.toFixed(2) : ""} placeholder="Valor para depositar" required/><small>O valor é recalculado a cada dia conforme o saldo e o prazo.</small></div><button className="btn">Adicionar depósito</button></form>
        <details className="vault-plan-edit"><summary>Ajustar meta e data</summary><form action={`/api/vaults/${vault.id}`} method="post"><input type="hidden" name="action" value="plan"/><div className="field"><label>Valor da meta</label><input name="target" type="number" min="0.01" step="0.01" defaultValue={target} required/></div><div className="field"><label>Data desejada</label><input name="targetDate" type="date" min={todayText} defaultValue={dateInput(vault.targetDate)} required/></div><button className="btn secondary">Salvar planejamento</button></form></details>
      </article>;
    })}</div>
    {!vaults.length && <div className="empty">Crie seu primeiro objetivo para descobrir quanto precisa guardar por dia.</div>}
  </>;
}
