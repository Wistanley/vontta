import React from 'react';
import { Plus, Wallet } from 'lucide-react';
import {
  currency,
  dateLabel,
  Entry,
  newEntry,
  projectExpenses,
  Transaction,
  WorkProject,
} from '../lib/workspace';
import { Empty, Pill } from './WorkspaceUI';
export function ProjectCosts({
  project,
  transactions,
  edit,
}: {
  project: WorkProject;
  transactions: Transaction[];
  edit: (entry: Entry) => void;
}) {
  const totals = projectExpenses(project, transactions);
  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="panel project-costs">
      <div className="section-heading">
        <h2>
          <Wallet size={18} /> Gastos do projeto
        </h2>
        <button
          className="button secondary"
          onClick={() =>
            edit({
              ...(newEntry('transaction') as Transaction),
              type: 'expense',
              projectId: project.id,
              category: project.projectType === 'personal' ? 'Pessoal' : 'Projetos',
            })
          }
        >
          <Plus size={15} /> Adicionar gasto
        </button>
      </div>
      <p className="muted small">
        Todo o período · valores próprios deste projeto. Gastos dos subprojetos são acompanhados em
        cada subprojeto.
      </p>
      <div className="project-cost-stats">
        <div>
          <small>Orçamento</small>
          <strong>{currency(project.budget)}</strong>
        </div>
        <div>
          <small>Gastos previstos</small>
          <strong>{currency(totals.expenses)}</strong>
        </div>
        <div>
          <small>Já pago</small>
          <strong className="accent-text">{currency(totals.paid)}</strong>
        </div>
        <div>
          <small>A pagar</small>
          <strong>{currency(totals.payable)}</strong>
        </div>
        <div>
          <small>{totals.remaining < 0 ? 'Acima do orçamento' : 'Disponível no orçamento'}</small>
          <strong className={totals.remaining < 0 ? 'negative' : ''}>
            {currency(Math.abs(totals.remaining))}
          </strong>
        </div>
      </div>
      {project.budget > 0 && (
        <div className="cost-progress">
          <div className="project-progress-label">
            <span>Orçamento comprometido</span>
            <b>{Math.round(totals.percent)}%</b>
          </div>
          <div
            className={`progress-track ${totals.remaining < 0 ? 'over-budget' : ''}`}
            role="progressbar"
            aria-label="Orçamento comprometido"
            aria-valuenow={Math.min(100, Math.round(totals.percent))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${Math.min(100, totals.percent)}%` }} />
          </div>
        </div>
      )}
      {totals.categories.length > 0 && (
        <div className="cost-categories">
          {totals.categories.map(({ category, amount }) => (
            <span key={category}>
              {category} <b>{currency(amount)}</b>
            </span>
          ))}
        </div>
      )}
      {expenses.length ? (
        expenses.map((t) => (
          <button className="project-expense-row" key={t.id} onClick={() => edit(t)}>
            <span>
              <strong>{t.title}</strong>
              <small>
                {dateLabel(t.date)} · {t.category}
                {t.bank ? ` · ${t.bank.accountName}` : ''}
                {t.excludedFromTotals ? ' · Fora dos totais' : ''}
              </small>
            </span>
            <Pill tone={t.paid ? 'green' : 'amber'}>{t.paid ? 'Pago' : 'A pagar'}</Pill>
            <b>{currency(t.amount)}</b>
          </button>
        ))
      ) : (
        <Empty
          title="Centralize os gastos aqui"
          description="Adicione gastos previstos e pagos. Compras importadas do banco também podem ser vinculadas a este projeto no Financeiro."
        />
      )}
    </section>
  );
}
