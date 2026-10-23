import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Clock3,
  CalendarDays,
  Video,
  Sparkles,
  MoreHorizontal,
  FolderKanban,
  Search,
  Mail,
  Phone,
  Building2,
  Download,
  Repeat2,
  Wallet,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ExternalLink,
  FileText,
  Play,
  Users,
  Target,
} from 'lucide-react';
import {
  Entry,
  WorkTask,
  Content,
  WorkProject,
  Client,
  Transaction,
  Preferences,
  View,
  currency,
  localDate,
  dayOffset,
  dateLabel,
  financialSummary,
  contentStages,
  newEntry,
  shiftMonth,
  defaults,
  projectAncestors,
  projectLabel,
  personalProject,
  projectExpenses,
} from '../lib/workspace';
import { Empty, Pill, IconButton } from './WorkspaceUI';
import { AIRequest } from './AssistantPanel';
import { AISettingsPanel } from './AISettingsPanel';
import { ProjectCosts } from './ProjectCosts';
import { BankConnectionPanel } from './BankConnectionPanel';

export interface ViewProps {
  entries: Entry[];
  edit: (entry: Entry) => void;
  save: (entry: Entry) => Promise<void>;
  navigate: (view: View) => void;
  ai: (request: AIRequest) => void;
  record: (entry: Content) => void;
  notify: (message: string) => void;
}
const select = <T extends Entry>(entries: Entry[], kind: T['kind']) =>
  entries.filter((e) => e.kind === kind) as T[];
const AddButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button className="button primary" onClick={onClick}>
    <Plus size={17} />
    {label}
  </button>
);
export function TaskRow({
  task,
  project,
  edit,
  save,
}: {
  task: WorkTask;
  project?: WorkProject;
  edit: (e: Entry) => void;
  save: (e: Entry) => Promise<void>;
}) {
  return (
    <div className={`task-row ${task.done ? 'completed' : ''}`}>
      <button
        className={`task-check ${task.done ? 'checked' : ''}`}
        aria-label={`${task.done ? 'Reabrir' : 'Concluir'} ${task.title}`}
        onClick={() => void save({ ...task, done: !task.done }).catch(() => {})}
      >
        {task.done && <Check size={13} />}
      </button>
      <button className="task-info" onClick={() => edit(task)}>
        <span>{task.title}</span>
        <small>
          {project?.title || 'Pessoal'}
          <span>·</span>
          {task.duration ? `${task.duration} min` : 'Duração a definir'}
        </small>
      </button>
      {task.priority === 'Alta' && !task.done && (
        <span className="priority-dot" title="Prioridade alta" />
      )}
      {task.time ? <time>{task.time}</time> : <span className="small muted">Sem horário</span>}
    </div>
  );
}

export function Overview(props: ViewProps) {
  const { entries, edit, save, navigate, ai } = props;
  const tasks = select<WorkTask>(entries, 'task');
  const projects = select<WorkProject>(entries, 'project');
  const clients = select<Client>(entries, 'client');
  const contents = select<Content>(entries, 'content');
  const transactions = select<Transaction>(entries, 'transaction');
  const today = localDate();
  const todayTasks = tasks
    .filter((t) => t.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
  const done = todayTasks.filter((t) => t.done).length;
  const active = projects.filter((p) => p.status === 'Em andamento');
  const month = today.slice(0, 7);
  const totals = financialSummary(transactions.filter((t) => t.date.startsWith(month)));
  const ready = contents.filter((c) => c.status === 'Gravar');
  const scheduled = contents
    .filter((c) => c.date >= today && c.status !== 'Publicado')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const overdue = tasks.filter((t) => !t.done && t.date < today);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">UM POUCO DE FOCO. MUITO MAIS DIREÇÃO.</div>
          <h1>
            Vamos fazer acontecer<span className="accent-text">.</span>
          </h1>
          <p>Seu dia, seus projetos e suas próximas grandes ideias.</p>
        </div>
        <AddButton label="Nova atividade" onClick={() => edit(newEntry('task'))} />
      </div>
      <div className="stats-grid">
        <button className="stat-card" onClick={() => navigate('planner')}>
          <div className="stat-top">
            <span>Seu dia</span>
            <CheckCircle2 size={17} />
          </div>
          <strong>
            {done}
            <span className="stat-denominator"> / {todayTasks.length}</span>
          </strong>
          <div className="stat-bottom">
            <span>atividades concluídas</span>
            <div className="mini-progress">
              <i
                style={{ width: `${todayTasks.length ? (done / todayTasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </button>
        <button className="stat-card" onClick={() => navigate('projects')}>
          <div className="stat-top">
            <span>Projetos em andamento</span>
            <FolderKanban size={17} />
          </div>
          <strong>{String(active.length).padStart(2, '0')}</strong>
          <div className="stat-bottom">
            <span>
              {
                projects.filter(
                  (p) =>
                    p.deadline >= today && p.deadline <= dayOffset(7) && p.status !== 'Concluído',
                ).length
              }{' '}
              entregas nos próximos 7 dias
            </span>
            <ArrowUpRight size={15} />
          </div>
        </button>
        <button className="stat-card" onClick={() => navigate('content')}>
          <div className="stat-top">
            <span>Conteúdos em produção</span>
            <Video size={17} />
          </div>
          <strong>
            {String(contents.filter((c) => c.status !== 'Publicado').length).padStart(2, '0')}
          </strong>
          <div className="stat-bottom">
            <span>
              <i className="inline-dot coral" />
              {ready.length} prontos para gravar
            </span>
            <ArrowUpRight size={15} />
          </div>
        </button>
        <button className="stat-card" onClick={() => navigate('finance')}>
          <div className="stat-top">
            <span>Saldo realizado · {dateLabel(today, { month: 'short' })}</span>
            <Wallet size={17} />
          </div>
          <strong className={totals.balance < 0 ? 'negative' : ''}>
            {currency(totals.balance)}
          </strong>
          <div className="stat-bottom">
            <span>
              A receber <b className="accent-text">{currency(totals.receivable)}</b>
            </span>
            <ArrowUpRight size={15} />
          </div>
        </button>
      </div>
      <div className="overview-grid">
        <section className="panel daily-panel">
          <div className="section-heading">
            <h2>
              <span className="heading-symbol mint">
                <CalendarDays size={17} />
              </span>
              Seu foco de hoje
            </h2>
            <button className="text-button" onClick={() => navigate('planner')}>
              Ver agenda
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="day-strip">
            <div>
              <strong>{dateLabel(today, { day: '2-digit' })}</strong>
              <span>{dateLabel(today, { weekday: 'long', month: 'long' })}</span>
            </div>
            <Pill>{todayTasks.reduce((a, t) => a + t.duration, 0)} min planejados</Pill>
          </div>
          {overdue.length > 0 && (
            <button className="overdue-notice" onClick={() => navigate('planner')}>
              {overdue.length} atividade(s) atrasada(s) para reorganizar <ArrowRight size={14} />
            </button>
          )}
          <div className="task-list">
            {todayTasks.length ? (
              todayTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  project={projects.find((p) => p.id === t.projectId)}
                  edit={edit}
                  save={save}
                />
              ))
            ) : (
              <Empty
                title="Um dia com espaço"
                description="Escolha até três prioridades para começar."
                action={
                  <button className="text-button" onClick={() => edit(newEntry('task'))}>
                    Planejar meu dia <Plus size={16} />
                  </button>
                }
              />
            )}
          </div>
          <button className="panel-add" onClick={() => edit(newEntry('task'))}>
            <Plus size={16} />
            Adicionar atividade
          </button>
        </section>
        <section className="ai-spotlight">
          <div className="ai-spotlight-top">
            <Pill tone="green">
              <Sparkles size={12} /> VONTTA AI
            </Pill>
            <span className="small">SEU BRAÇO DIREITO</span>
          </div>
          <div className="orb-art" aria-hidden="true">
            <div className="orb-ring one" />
            <div className="orb-ring two" />
            <div className="orb-ring three" />
            <Sparkles size={36} />
            <span className="orb-spark s1">✦</span>
            <span className="orb-spark s2">+</span>
          </div>
          <div className="spotlight-copy">
            <h2>
              A próxima ideia
              <br />
              começa aqui.
            </h2>
            <p>Transforme o que você sabe em conteúdo que conecta com quem decide.</p>
            <button className="button mint-button" onClick={() => ai({ action: 'ideas' })}>
              <Sparkles size={16} />
              Destravar minhas ideias
              <ArrowUpRight size={16} />
            </button>
          </div>
        </section>
        <section className="panel projects-panel">
          <div className="section-heading">
            <h2>
              <span className="heading-symbol lilac">
                <FolderKanban size={17} />
              </span>
              Projetos em movimento
            </h2>
            <button className="text-button" onClick={() => navigate('projects')}>
              Ver todos
              <ArrowUpRight size={15} />
            </button>
          </div>
          {active.length ? (
            <div className="project-mini-grid">
              {active.slice(0, 2).map((p, i) => {
                const progress = p.stages.length
                  ? (p.stages.filter((s) => s.done).length / p.stages.length) * 100
                  : 0;
                return (
                  <button key={p.id} className="mini-project" onClick={() => edit(p)}>
                    <div className="project-icon-row">
                      <span className={`project-monogram ${i % 2 ? 'lilac' : 'peach'}`}>
                        {p.title
                          .split(' ')
                          .slice(0, 2)
                          .map((s) => s[0])
                          .join('')}
                      </span>
                      <ArrowUpRight size={16} />
                    </div>
                    <small>
                      {clients.find((c) => c.id === p.clientId)?.company || 'Sem cliente'}
                    </small>
                    <h3>{p.title}</h3>
                    <div className="project-progress-label">
                      <span>
                        {p.stages.filter((s) => s.done).length} de {p.stages.length} etapas
                      </span>
                      <b>{Math.round(progress)}%</b>
                    </div>
                    <div className="progress-track">
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <div className="project-deadline">
                      <Clock3 size={13} />
                      Entrega {dateLabel(p.deadline)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty
              title="Seu próximo projeto começa aqui"
              description="Conecte um cliente, defina as etapas e acompanhe a entrega."
              action={
                <button className="text-button" onClick={() => edit(newEntry('project'))}>
                  Criar projeto <Plus size={15} />
                </button>
              }
            />
          )}
        </section>
        <section className="panel upcoming-panel">
          <div className="section-heading">
            <h2>
              <span className="heading-symbol peach">
                <Video size={17} />
              </span>
              No seu radar
            </h2>
            <button className="text-button" onClick={() => navigate('content')}>
              Estúdio
              <ArrowUpRight size={15} />
            </button>
          </div>
          <p className="section-description">O que vem por aí no seu Instagram</p>
          {scheduled.length ? (
            scheduled.map((c, i) => (
              <button className="upcoming-content" key={c.id} onClick={() => edit(c)}>
                <span className={`content-date ${i === 0 ? 'mint' : ''}`}>
                  <b>{dateLabel(c.date, { day: '2-digit' })}</b>
                  <small>{dateLabel(c.date, { month: 'short' })}</small>
                </span>
                <span className="upcoming-info">
                  <small>
                    {c.format}
                    <span>·</span>
                    {c.status}
                  </small>
                  <strong>{c.title}</strong>
                </span>
                <ChevronRight size={15} />
              </button>
            ))
          ) : (
            <Empty
              title="O radar está livre"
              description="Escolha uma data para o seu próximo conteúdo."
            />
          )}
          <button className="panel-add" onClick={() => edit(newEntry('content'))}>
            <Plus size={16} />
            Capturar uma ideia
          </button>
        </section>
      </div>
      <div className="footer-note">
        <span className="inline-dot" />
        Consistência é um próximo passo de cada vez.<span>FEITO PARA O SEU RITMO</span>
      </div>
    </>
  );
}

export function Planner({ entries, edit, save, ai }: ViewProps) {
  const [date, setDate] = useState(localDate());
  const [mode, setMode] = useState<'day' | 'week' | 'overdue'>('day');
  const tasks = select<WorkTask>(entries, 'task');
  const projects = select<WorkProject>(entries, 'project');
  const start = new Date(date + 'T12:00:00');
  const monday = new Date(start);
  monday.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return localDate(d);
  });
  const shown = tasks
    .filter((t) =>
      mode === 'overdue'
        ? !t.done && t.date < localDate()
        : mode === 'week'
          ? days.includes(t.date)
          : t.date === date,
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MENOS RUÍDO, MAIS FOCO</span>
          <h1>Sua agenda</h1>
          <p>Uma rotina que deixa espaço para entregar e criar.</p>
        </div>
        <AddButton
          label="Nova atividade"
          onClick={() => edit({ ...(newEntry('task') as WorkTask), date })}
        />
      </div>
      <div className="view-toolbar">
        <div className="segmented">
          {[
            ['day', 'Dia'],
            ['week', 'Semana'],
            ['overdue', 'Atrasadas'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={mode === value ? 'active' : ''}
              onClick={() => setMode(value as any)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          aria-label="Dia da agenda"
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
        <button className="button secondary" onClick={() => ai({ action: 'plan' })}>
          <Sparkles size={16} />
          Planejar com IA
        </button>
      </div>
      {mode !== 'overdue' && (
        <div className="week-strip">
          {days.map((day) => (
            <button
              key={day}
              className={`${day === date ? 'selected' : ''} ${day === localDate() ? 'today' : ''}`}
              onClick={() => {
                setDate(day);
                setMode('day');
              }}
            >
              <small>{dateLabel(day, { weekday: 'short' })}</small>
              <strong>{dateLabel(day, { day: '2-digit' })}</strong>
              <span>{tasks.filter((t) => t.date === day && !t.done).length || '—'}</span>
            </button>
          ))}
        </div>
      )}
      <div className="planner-summary">
        <span>
          <b>{shown.filter((t) => !t.done).length}</b> atividades pendentes
        </span>
        <span>
          <Clock3 size={14} />
          {shown.reduce((s, t) => s + t.duration, 0)} min planejados
        </span>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>
            {mode === 'overdue'
              ? 'Vamos reorganizar?'
              : mode === 'week'
                ? 'Sua semana'
                : dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
        </div>
        {shown.length ? (
          shown.map((t) => (
            <div key={t.id}>
              {mode !== 'day' && (
                <div className="task-date-label">
                  {dateLabel(t.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              )}
              <TaskRow
                task={t}
                project={projects.find((p) => p.id === t.projectId)}
                edit={edit}
                save={save}
              />
            </div>
          ))
        ) : (
          <Empty
            title={mode === 'overdue' ? 'Tudo em dia' : 'Espaço para o que importa'}
            description={
              mode === 'overdue'
                ? 'Não há atividades atrasadas.'
                : 'Adicione uma atividade e defina seu próximo passo.'
            }
          />
        )}
      </section>
    </>
  );
}

export function ContentStudio(props: ViewProps) {
  const { entries, edit, ai, record } = props;
  const [layout, setLayout] = useState('board');
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState('all');
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const contents = select<Content>(entries, 'content').filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) &&
      (format === 'all' || c.format === format),
  );
  const prefs = select<Preferences>(entries, 'preferences')[0];
  const goal = prefs?.goal || 3;
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekEnd = new Date(monday);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const published = contents.filter(
    (c) => c.status === 'Publicado' && c.date >= localDate(monday) && c.date <= localDate(weekEnd),
  ).length;
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const offset = (new Date(month + '-01T12:00:00').getDay() + 6) % 7;
  const card = (c: Content) => (
    <article className="content-card" key={c.id}>
      <button className="content-card-main" onClick={() => edit(c)}>
        <div className="content-card-meta">
          <Pill
            tone={c.format === 'Reels' ? 'peach' : c.format === 'Carrossel' ? 'lilac' : 'green'}
          >
            {c.format === 'Reels' ? <Video size={11} /> : <LayoutGrid size={11} />} {c.format}
          </Pill>
          <MoreHorizontal size={16} />
        </div>
        <h3>{c.title}</h3>
        <p>{c.pillar}</p>
        {c.hook && <blockquote>{c.hook}</blockquote>}
        <div className="content-card-bottom">
          <span>
            <CalendarDays size={12} />
            {dateLabel(c.date)}
          </span>
          {c.script && <FileText size={13} />}
        </div>
      </button>
      {c.status === 'Gravar' && (
        <button className="record-card-button" onClick={() => record(c)}>
          <Play size={13} />
          Modo de gravação <ArrowUpRight size={13} />
        </button>
      )}
    </article>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DO QUE VOCÊ SABE AO QUE VOCÊ PUBLICA</span>
          <h1>
            Estúdio de conteúdo<span className="accent-text">.</span>
          </h1>
          <p>Ideias que conectam. Conteúdo que abre conversas de negócio.</p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => ai({ action: 'ideas' })}>
            <Sparkles size={16} />
            Gerar ideias
          </button>
          <AddButton label="Novo conteúdo" onClick={() => edit(newEntry('content'))} />
        </div>
      </div>
      <div className="studio-banner">
        <div>
          <span className="heading-symbol peach">
            <Target size={20} />
          </span>
          <div>
            <strong>Sua expertise, na frente de quem decide.</strong>
            <p>Sistemas, sites, aplicativos e IA para empresários.</p>
          </div>
        </div>
        <div className="weekly-goal">
          <span>
            <b>{published}</b> / {goal} publicados nesta semana
          </span>
          <div className="progress-track">
            <i style={{ width: `${Math.min((published / goal) * 100, 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="view-toolbar">
        <div className="segmented">
          <button className={layout === 'board' ? 'active' : ''} onClick={() => setLayout('board')}>
            <LayoutGrid size={14} />
            Produção
          </button>
          <button
            className={layout === 'calendar' ? 'active' : ''}
            onClick={() => setLayout('calendar')}
          >
            <CalendarDays size={14} />
            Calendário
          </button>
        </div>
        <label className="search-input">
          <Search size={15} />
          <input
            aria-label="Buscar conteúdo"
            placeholder="Buscar uma ideia…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar formato"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <option value="all">Todos os formatos</option>
          {['Reels', 'Carrossel', 'Stories'].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>
      {layout === 'board' ? (
        <div className="content-board">
          {contentStages.map((stage, i) => {
            const items = contents.filter((c) => c.status === stage);
            return (
              <section className="content-column" key={stage}>
                <div className="column-heading">
                  <h2>
                    <span className={`stage-dot stage-${i}`} />
                    {stage}
                    <span className="count">{items.length}</span>
                  </h2>
                  <IconButton
                    label={`Adicionar em ${stage}`}
                    onClick={() => edit({ ...(newEntry('content') as Content), status: stage })}
                  >
                    <Plus size={15} />
                  </IconButton>
                </div>
                {items.map(card)}
                <button
                  className="column-add"
                  onClick={() => edit({ ...(newEntry('content') as Content), status: stage })}
                >
                  <Plus size={14} />
                  Adicionar conteúdo
                </button>
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <div className="calendar-toolbar">
            <IconButton
              label="Mês anterior"
              onClick={() => setMonth(shiftMonth(month + '-01', -1).slice(0, 7))}
            >
              <ChevronLeft size={18} />
            </IconButton>
            <h2>{dateLabel(month + '-01', { month: 'long', year: 'numeric' })}</h2>
            <IconButton
              label="Próximo mês"
              onClick={() => setMonth(shiftMonth(month + '-01', 1).slice(0, 7))}
            >
              <ChevronRight size={18} />
            </IconButton>
          </div>
          <div className="editorial-calendar">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((s) => (
              <div key={s} className="calendar-day-name">
                {s}
              </div>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <div className="calendar-cell blank" key={`blank${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, '0')}`;
              return (
                <div key={date} className={`calendar-cell ${date === localDate() ? 'today' : ''}`}>
                  <button
                    className="calendar-date"
                    aria-label={`Novo conteúdo em ${dateLabel(date)}`}
                    onClick={() => edit({ ...(newEntry('content') as Content), date })}
                  >
                    {i + 1}
                    <Plus size={12} />
                  </button>
                  {contents
                    .filter((c) => c.date === date)
                    .map((c) => (
                      <button className="calendar-entry" key={c.id} onClick={() => edit(c)}>
                        <span>
                          {c.format} · {c.status}
                        </span>
                        {c.title}
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
          {contents.some((c) => !c.date) && (
            <div className="panel unscheduled">
              <h3>Sem data definida</h3>
              <p className="muted small">Estas ideias ainda não aparecem no calendário.</p>
              <div className="unscheduled-grid">{contents.filter((c) => !c.date).map(card)}</div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export function Projects(props: ViewProps) {
  const { entries, edit, save, notify } = props;
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [projectType, setProjectType] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const projects = select<WorkProject>(entries, 'project');
  const clients = select<Client>(entries, 'client');
  const selectedProject = projects.find((p) => p.id === selected);
  if (selectedProject) {
    const p = selectedProject;
    const ancestors = projectAncestors(p, projects);
    const children = projects.filter((child) => child.parentProjectId === p.id);
    const client = clients.find((c) => c.id === p.clientId);
    const tx = select<Transaction>(entries, 'transaction').filter((t) => t.projectId === p.id);
    const tasks = select<WorkTask>(entries, 'task').filter((t) => t.projectId === p.id);
    return (
      <>
        <button className="text-button back-link" onClick={() => setSelected(null)}>
          <ChevronLeft size={16} />
          Todos os projetos
        </button>
        {ancestors.length > 0 && (
          <nav className="project-breadcrumbs" aria-label="Hierarquia do projeto">
            {ancestors.map((ancestor) => (
              <React.Fragment key={ancestor.id}>
                <button className="text-button" onClick={() => setSelected(ancestor.id)}>
                  {ancestor.title}
                </button>
                <ChevronRight size={14} aria-hidden="true" />
              </React.Fragment>
            ))}
            <span aria-current="page">{p.title}</span>
          </nav>
        )}
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              {p.projectType === 'personal'
                ? 'PROJETO PESSOAL'
                : client?.company || 'PROJETO PROFISSIONAL'}
            </div>
            <h1>{p.title}</h1>
            <p>{p.description || 'Adicione um escopo para deixar o objetivo claro.'}</p>
          </div>
          <button className="button primary" onClick={() => edit(p)}>
            Editar projeto
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="project-detail-stats">
          <Pill tone="green">{p.status}</Pill>
          <span>
            <CalendarDays size={16} />
            Entrega {dateLabel(p.deadline)}
          </span>
          <span>
            {p.projectType === 'personal' ? 'Orçamento' : 'Contrato'} <b>{currency(p.budget)}</b>
          </span>
          <span>
            {p.projectType === 'personal' ? 'Gastos previstos' : 'Recebido'}{' '}
            <b className="accent-text">
              {currency(
                p.projectType === 'personal'
                  ? projectExpenses(p, tx).expenses
                  : financialSummary(tx).received,
              )}
            </b>
          </span>
        </div>
        {p.projectType === 'personal' && <ProjectCosts project={p} transactions={tx} edit={edit} />}
        <div className="detail-grid">
          <section className="panel subprojects-panel">
            <div className="section-heading">
              <h2>
                Subprojetos <span className="muted small">({children.length})</span>
              </h2>
              <button
                className="button secondary"
                onClick={() =>
                  edit({
                    ...(newEntry('project') as WorkProject),
                    parentProjectId: p.id,
                    clientId: p.clientId,
                    projectType: p.projectType || 'work',
                  })
                }
              >
                <Plus size={15} />
                Novo subprojeto
              </button>
            </div>
            {children.length ? (
              children.map((child) => (
                <button
                  className="subproject-row"
                  key={child.id}
                  onClick={() => setSelected(child.id)}
                >
                  <FolderKanban size={19} aria-hidden="true" />
                  <span className="subproject-info">
                    <strong>{child.title}</strong>
                    <small>
                      {child.stages.filter((stage) => stage.done).length}/{child.stages.length}{' '}
                      etapas · Entrega {dateLabel(child.deadline)}
                    </small>
                  </span>
                  <Pill tone={child.status === 'Concluído' ? 'green' : 'muted'}>
                    {child.status}
                  </Pill>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ))
            ) : (
              <Empty
                title="Divida a entrega em subprojetos"
                description="Organize módulos ou frentes de trabalho com prazos, etapas e documentação próprios."
              />
            )}
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>Etapas e entregas</h2>
              <span className="muted small">
                {p.stages.filter((s) => s.done).length}/{p.stages.length}
              </span>
            </div>
            {p.stages.map((s, i) => (
              <div className="project-stage" key={s.id}>
                <button
                  className={`task-check ${s.done ? 'checked' : ''}`}
                  aria-label={`${s.done ? 'Reabrir' : 'Concluir'} ${s.title}`}
                  onClick={() =>
                    void save({
                      ...p,
                      stages: p.stages.map((stage) =>
                        stage.id === s.id ? { ...stage, done: !stage.done } : stage,
                      ),
                    }).catch(() => {})
                  }
                >
                  {s.done ? <Check size={13} /> : null}
                </button>
                <div>
                  <small>ETAPA {String(i + 1).padStart(2, '0')}</small>
                  <h3>{s.title}</h3>
                </div>
                <span className={s.date && s.date < localDate() && !s.done ? 'negative' : 'muted'}>
                  {dateLabel(s.date)}
                </span>
              </div>
            ))}
            <button className="panel-add" onClick={() => edit(p)}>
              <Plus size={15} />
              Gerenciar etapas
            </button>
          </section>
          {p.projectType !== 'personal' && (
            <section className="panel">
              <div className="section-heading">
                <h2>Cliente</h2>
                <Users size={17} />
              </div>
              {client ? (
                <div className="client-summary">
                  <div className="client-avatar">{client.title.slice(0, 2).toUpperCase()}</div>
                  <h3>{client.company || client.title}</h3>
                  <p>{client.title}</p>
                  {client.email && (
                    <a href={`mailto:${client.email}`}>
                      <Mail size={14} />
                      {client.email}
                    </a>
                  )}
                  {client.phone && (
                    <p>
                      <Phone size={14} />
                      {client.phone}
                    </p>
                  )}
                  <button className="text-button" onClick={() => edit(client)}>
                    Ver cadastro
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              ) : (
                <Empty
                  title="Vincule um cliente"
                  description="Associe o projeto ao contato responsável."
                  action={
                    <button className="text-button" onClick={() => edit(p)}>
                      Vincular cliente
                    </button>
                  }
                />
              )}
            </section>
          )}
          <section className="panel documentation-panel">
            <div className="section-heading">
              <h2>
                <FileText size={17} />
                Documentação do projeto
              </h2>
              <button className="text-button" onClick={() => edit(p)}>
                Editar
                <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="documentation">
              {p.documentation ||
                'Centralize aqui briefing, decisões, links e critérios de aceite.'}
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>Atividades do projeto</h2>
            </div>
            {tasks.length ? (
              tasks.map((t) => <TaskRow key={t.id} task={t} project={p} edit={edit} save={save} />)
            ) : (
              <Empty
                title="Qual é o próximo passo?"
                description="Divida a entrega em atividades que cabem no dia."
              />
            )}
            <button
              className="panel-add"
              onClick={() => edit({ ...(newEntry('task') as WorkTask), projectId: p.id })}
            >
              <Plus size={15} />
              Adicionar atividade
            </button>
          </section>
        </div>
      </>
    );
  }
  const filtered = projects.filter(
    (p) =>
      (search.trim() ||
        filter !== 'all' ||
        !projects.some((parent) => parent.id === p.parentProjectId)) &&
      (filter === 'all' || p.status === filter) &&
      (projectType === 'all' || (p.projectType || 'work') === projectType) &&
      `${projectLabel(p, projects)} ${clients.find((c) => c.id === p.clientId)?.company || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DA PRIMEIRA CONVERSA À ENTREGA</span>
          <h1>
            Projetos com direção<span className="accent-text">.</span>
          </h1>
          <p>Trabalho, casamento, casa e seus próximos planos em um só lugar.</p>
        </div>
        <AddButton label="Novo projeto" onClick={() => edit(newEntry('project'))} />
      </div>
      <div className="personal-project-templates" aria-label="Começar um projeto pessoal">
        <div>
          <strong>Projetos pessoais</strong>
          <span>Organize os planos que fazem parte da sua vida.</span>
        </div>
        <button className="button secondary" onClick={() => edit(personalProject('wedding'))}>
          Meu casamento
        </button>
        <button className="button secondary" onClick={() => edit(personalProject('home'))}>
          Minha casa
        </button>
        <button className="text-button" onClick={() => edit(personalProject())}>
          <Plus size={15} /> Outro projeto pessoal
        </button>
      </div>
      <div className="view-toolbar">
        <label className="search-input">
          <Search size={15} />
          <input
            aria-label="Buscar projeto"
            placeholder="Buscar projeto ou cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Situação do projeto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Todas as situações</option>
          {['Em proposta', 'Em andamento', 'Pausado', 'Concluído'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar tipo de projeto"
          value={projectType}
          onChange={(e) => setProjectType(e.target.value)}
        >
          <option value="all">Pessoais e profissionais</option>
          <option value="personal">Pessoais</option>
          <option value="work">Profissionais</option>
        </select>
      </div>
      {filtered.length ? (
        <div className="projects-grid">
          {filtered.map((p, i) => {
            const progress = p.stages.length
              ? (p.stages.filter((s) => s.done).length / p.stages.length) * 100
              : 0;
            return (
              <button className="project-card panel" key={p.id} onClick={() => setSelected(p.id)}>
                <div className="project-icon-row">
                  <span className={`project-monogram ${i % 2 ? 'lilac' : 'peach'}`}>
                    <FolderKanban size={24} />
                  </span>
                  <Pill tone={p.status === 'Concluído' ? 'green' : 'muted'}>{p.status}</Pill>
                </div>
                <span className="eyebrow">
                  {p.projectType === 'personal'
                    ? 'PROJETO PESSOAL'
                    : clients.find((c) => c.id === p.clientId)?.company || 'PROJETO PROFISSIONAL'}
                </span>
                <h2>{p.title}</h2>
                {p.parentProjectId && (
                  <span className="project-parent-label">
                    Dentro de{' '}
                    {projects.find((parent) => parent.id === p.parentProjectId)?.title ||
                      'projeto indisponível'}
                  </span>
                )}
                <p>{p.description || 'Defina o escopo e acompanhe cada etapa.'}</p>
                {p.projectType === 'personal' && (
                  <span className="personal-project-spent">
                    {currency(
                      projectExpenses(p, select<Transaction>(entries, 'transaction')).expenses,
                    )}{' '}
                    em gastos · {currency(p.budget)} de orçamento
                  </span>
                )}
                {projects.some((child) => child.parentProjectId === p.id) && (
                  <Pill>
                    {projects.filter((child) => child.parentProjectId === p.id).length}{' '}
                    subprojeto(s)
                  </Pill>
                )}
                <div className="project-progress-label">
                  <span>
                    {p.stages.filter((s) => s.done).length} de {p.stages.length} etapas
                  </span>
                  <b>{Math.round(progress)}%</b>
                </div>
                <div className="progress-track">
                  <i style={{ width: `${progress}%` }} />
                </div>
                <div className="project-card-footer">
                  <span
                    className={
                      p.deadline && p.deadline < localDate() && p.status !== 'Concluído'
                        ? 'negative'
                        : ''
                    }
                  >
                    <Clock3 size={13} />
                    {dateLabel(p.deadline)}
                  </span>
                  <span>
                    {currency(p.budget)}
                    <ArrowUpRight size={15} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Seu próximo projeto começa aqui"
          description="Cadastre o cliente e organize a entrega em etapas."
          action={<AddButton label="Criar projeto" onClick={() => edit(newEntry('project'))} />}
        />
      )}
    </>
  );
}

export function Clients({ entries, edit }: ViewProps) {
  const [search, setSearch] = useState('');
  const clients = select<Client>(entries, 'client').filter((c) =>
    `${c.title} ${c.company} ${c.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  const projects = select<WorkProject>(entries, 'project');
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BOAS ENTREGAS COMEÇAM COM BOAS RELAÇÕES</span>
          <h1>Seus clientes</h1>
          <p>O contexto de cada negócio, sempre por perto.</p>
        </div>
        <AddButton label="Novo cliente" onClick={() => edit(newEntry('client'))} />
      </div>
      <div className="view-toolbar">
        <label className="search-input">
          <Search size={15} />
          <input
            aria-label="Buscar cliente"
            placeholder="Buscar nome, empresa ou e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="muted small">{clients.length} clientes</span>
      </div>
      {clients.length ? (
        <div className="clients-grid">
          {clients.map((c) => (
            <article className="panel client-card" key={c.id}>
              <div className="section-heading">
                <div className="client-avatar">
                  {c.company
                    ? c.company.slice(0, 2).toUpperCase()
                    : c.title.slice(0, 2).toUpperCase()}
                </div>
                <IconButton label={`Editar ${c.title}`} onClick={() => edit(c)}>
                  <MoreHorizontal size={20} />
                </IconButton>
              </div>
              <h2>{c.company || c.title}</h2>
              <p>{c.company ? c.title : 'Contato principal'}</p>
              <div className="client-contact">
                {c.email && (
                  <a href={`mailto:${c.email}`}>
                    <Mail size={15} />
                    {c.email}
                  </a>
                )}
                {c.phone && (
                  <span>
                    <Phone size={15} />
                    {c.phone}
                  </span>
                )}
              </div>
              {c.notes && <p className="client-note">{c.notes}</p>}
              <div className="client-card-bottom">
                <span>
                  <FolderKanban size={14} />
                  {projects.filter((p) => p.clientId === c.id).length} projetos
                </span>
                <button className="text-button" onClick={() => edit(c)}>
                  Ver cadastro
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Conheça melhor quem confia em você"
          description="Cadastre seus clientes e conecte cada um aos seus projetos."
          action={<AddButton label="Cadastrar cliente" onClick={() => edit(newEntry('client'))} />}
        />
      )}
    </>
  );
}

function exportCSV(rows: Transaction[], projects: WorkProject[]) {
  const escape = (v: unknown) =>
    `"${String(v ?? '')
      .replace(/"/g, '""')
      .replace(/^[=+@-]/, "'$&")}"`;
  const text =
    '\uFEFF' +
    [
      [
        'Descrição',
        'Tipo',
        'Valor',
        'Vencimento',
        'Situação',
        'Categoria',
        'Projeto',
        'Origem',
        'Incluído nos totais',
        'Parcela',
      ],
      ...rows.map((t) => [
        t.title,
        t.type === 'income' ? 'Receita' : 'Despesa',
        t.amount.toFixed(2).replace('.', ','),
        t.date,
        t.paid ? 'Liquidado' : 'Pendente',
        t.category,
        projects.find((p) => p.id === t.projectId)
          ? projectLabel(
              projects.find((p) => p.id === t.projectId)!,
              projects,
            )
          : '',
        t.bank?.accountName || 'Manual',
        t.excludedFromTotals ? 'Não' : 'Sim',
        t.bank?.totalInstallments
          ? `${t.bank.installmentNumber || '?'}/${t.bank.totalInstallments}`
          : '',
      ]),
    ]
      .map((row) => row.map(escape).join(';'))
      .join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vontta-financeiro.csv';
  a.click();
  URL.revokeObjectURL(url);
}
export function Finance({
  entries,
  edit,
  save,
  notify,
  demo,
  onRefresh,
}: ViewProps & { demo: boolean; onRefresh: () => Promise<void> }) {
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState('all');
  const [accountId, setAccountId] = useState('all');
  const [allMonths, setAllMonths] = useState(false);
  const [showBanks, setShowBanks] = useState(false);
  const all = select<Transaction>(entries, 'transaction');
  const transactions = all.filter(
    (t) =>
      (allMonths || t.date.startsWith(month)) &&
      (projectId === 'all' || t.projectId === projectId) &&
      (accountId === 'all' || (accountId === 'manual' ? !t.bank : t.bank?.accountId === accountId)),
  );
  const accountNames = new Map(
    all.filter((t) => t.bank).map((t) => [t.bank!.accountId, t.bank!.accountName]),
  );
  const totals = financialSummary(transactions);
  const filtered = transactions
    .filter(
      (t) =>
        (filter === 'all' || t.type === filter) &&
        (status === 'all' ||
          (status === 'paid'
            ? t.paid
            : status === 'overdue'
              ? !t.paid && t.date < localDate()
              : !t.paid)) &&
        `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const projects = select<WorkProject>(entries, 'project');
  const recur = async () => {
    const candidates = transactions.filter(
      (t) => !t.bank && t.date.startsWith(month) && t.recurrence === 'monthly',
    );
    const next = shiftMonth(month + '-01', 1).slice(0, 7);
    setBusy(true);
    try {
      let count = 0;
      for (const t of candidates) {
        const sourceId = t.sourceId || t.id;
        const id = `recurrence-${sourceId}-${next}`;
        if (
          all.some((e) => (e.sourceId === sourceId || e.id === sourceId) && e.date.startsWith(next))
        )
          continue;
        await save({
          ...t,
          id: await stableId(id),
          sourceId,
          date: shiftMonth(t.date, 1),
          paid: false,
          createdAt: new Date().toISOString(),
        });
        count++;
      }
      notify(
        count
          ? `${count} lançamento(s) criado(s) em ${dateLabel(next + '-01', { month: 'long' })}.`
          : 'Nenhuma recorrência nova para gerar.',
      );
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CLAREZA PARA CRESCER COM TRANQUILIDADE</span>
          <h1>
            Seu financeiro<span className="accent-text">.</span>
          </h1>
          <p>Saiba o que entrou, o que vem e o que precisa de atenção.</p>
        </div>
        <AddButton
          label="Novo lançamento"
          onClick={() =>
            edit({
              ...(newEntry('transaction') as Transaction),
              date: month === localDate().slice(0, 7) ? localDate() : month + '-01',
            })
          }
        />
      </div>
      <div className="finance-month">
        <button
          className="button secondary"
          aria-expanded={showBanks}
          onClick={() => setShowBanks(!showBanks)}
        >
          <Building2 size={16} /> {showBanks ? 'Fechar bancos' : 'Conectar bancos'}
        </button>
        <label className="check-field">
          <input
            type="checkbox"
            checked={allMonths}
            onChange={(e) => setAllMonths(e.target.checked)}
          />{' '}
          Todo o período
        </label>
        <IconButton
          label="Mês anterior"
          onClick={() => setMonth(shiftMonth(month + '-01', -1).slice(0, 7))}
        >
          <ChevronLeft size={18} />
        </IconButton>
        <label>
          <CalendarDays size={16} />
          <input
            aria-label="Mês financeiro"
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </label>
        <IconButton
          label="Próximo mês"
          onClick={() => setMonth(shiftMonth(month + '-01', 1).slice(0, 7))}
        >
          <ChevronRight size={18} />
        </IconButton>
        <div className="action-spacer" />
        <button className="button secondary" disabled={busy || allMonths} onClick={recur}>
          <Repeat2 size={15} />
          {busy ? 'Gerando…' : 'Gerar recorrências'}
        </button>
        <button className="button secondary" onClick={() => exportCSV(filtered, projects)}>
          <Download size={15} />
          Exportar
        </button>
      </div>
      {showBanks && <BankConnectionPanel demo={demo} onRefresh={onRefresh} />}
      <div className="view-toolbar finance-scope-filters">
        <label className="field">
          <span>Projeto financeiro</span>
          <select
            aria-label="Filtrar lançamentos por projeto"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="all">Todos os projetos</option>
            <option value="">Sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {projectLabel(p, projects)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Origem dos lançamentos</span>
          <select
            aria-label="Filtrar conta bancária"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="all">Todas as origens</option>
            <option value="manual">Lançamentos manuais</option>
            {[...accountNames].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="finance-stats">
        <div className="stat-card">
          <div className="stat-top">
            <span>Recebido</span>
            <ArrowDownLeft size={18} />
          </div>
          <strong className="accent-text">{currency(totals.received)}</strong>
          <small>{currency(totals.receivable)} a receber</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>Pago</span>
            <ArrowUpRight size={18} />
          </div>
          <strong className="coral-text">{currency(totals.paid)}</strong>
          <small>{currency(totals.payable)} a pagar</small>
        </div>
        <div className="stat-card balance-card">
          <div className="stat-top">
            <span>Saldo realizado</span>
            <Wallet size={18} />
          </div>
          <strong className={totals.balance < 0 ? 'negative' : ''}>
            {currency(totals.balance)}
          </strong>
          <small>Previsão do mês: {currency(totals.forecast)}</small>
        </div>
      </div>
      <section className="panel finance-panel">
        <div className="section-heading">
          <h2>{allMonths ? 'Lançamentos de todo o período' : 'Lançamentos do mês'}</h2>
          <Pill>{transactions.length} registros</Pill>
        </div>
        <div className="view-toolbar finance-filters">
          <div className="segmented">
            {[
              ['all', 'Todos'],
              ['income', 'Receitas'],
              ['expense', 'Despesas'],
            ].map(([value, label]) => (
              <button
                className={filter === value ? 'active' : ''}
                key={value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            aria-label="Situação financeira"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todas as situações</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Liquidados</option>
            <option value="overdue">Vencidos</option>
          </select>
          <label className="search-input">
            <Search size={14} />
            <input
              aria-label="Buscar lançamento"
              placeholder="Buscar lançamento…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="transaction-header">
          <span>Descrição</span>
          <span>Vencimento</span>
          <span>Situação</span>
          <span>Valor</span>
          <span />
        </div>
        {filtered.length ? (
          filtered.map((t) => (
            <div className="transaction-row" key={t.id}>
              <button className="transaction-info" onClick={() => edit(t)}>
                <span className={`transaction-icon ${t.type === 'income' ? 'mint' : 'peach'}`}>
                  {t.type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </span>
                <span>
                  <strong>{t.title}</strong>
                  <small>
                    {t.category}
                    {t.projectId &&
                      ` · ${projects.find((p) => p.id === t.projectId)?.title || 'Projeto'}`}
                    {t.recurrence === 'monthly' && ' · Mensal'}
                    {t.bank &&
                      ` · ${t.bank.accountName}${t.bank.totalInstallments ? ` · ${t.bank.installmentNumber || '?'}/${t.bank.totalInstallments}` : ''}`}
                    {t.excludedFromTotals && ' · Fora dos totais'}
                  </small>
                </span>
              </button>
              <time>{dateLabel(t.date)}</time>
              <button
                className="status-toggle"
                disabled={!!t.bank && t.bank.accountType === 'BANK'}
                title={
                  t.bank?.accountType === 'BANK'
                    ? 'Situação informada pelo banco'
                    : 'Clique para alternar pagamento'
                }
                onClick={() => void save({ ...t, paid: !t.paid }).catch(() => {})}
              >
                <Pill tone={t.paid ? 'green' : t.date < localDate() ? 'red' : 'amber'}>
                  {t.paid
                    ? t.type === 'income'
                      ? 'Recebido'
                      : 'Pago'
                    : t.date < localDate()
                      ? 'Vencido'
                      : 'Pendente'}
                </Pill>
              </button>
              <strong
                className={`transaction-amount ${t.type === 'income' ? 'accent-text' : 'coral-text'}`}
              >
                {t.type === 'income' ? '+' : '−'} {currency(t.amount)}
              </strong>
              <IconButton label={`Editar lançamento ${t.title}`} onClick={() => edit(t)}>
                <MoreHorizontal size={18} />
              </IconButton>
            </div>
          ))
        ) : (
          <Empty
            title="Tudo começa com clareza"
            description="Adicione uma receita ou despesa, ou ajuste os filtros para encontrar seus registros."
          />
        )}
        <div className="finance-footnote">
          <span>
            <span className="inline-dot" />
            Saldo considera pagamentos e recebimentos confirmados. Lançamentos excluídos não entram
            nos totais. Filtros de projeto e origem também filtram os indicadores.
          </span>
          <span>{filtered.length} lançamento(s) exibido(s)</span>
        </div>
      </section>
    </>
  );
}
async function stableId(input: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)),
  );
  const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function Settings({
  entries,
  edit,
  demo,
  onImport,
  onLogout,
}: {
  entries: Entry[];
  edit: (e: Entry) => void;
  demo: boolean;
  onImport: () => void;
  onLogout: () => void;
}) {
  const p =
    select<Preferences>(entries, 'preferences')[0] || (newEntry('preferences') as Preferences);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">UM ESPAÇO COM A SUA CARA</span>
          <h1>Preferências</h1>
          <p>Seu contexto deixa o planejamento e as sugestões mais úteis.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>
              <Sparkles size={18} />
              Perfil de conteúdo e IA
            </h2>
            <button className="text-button" onClick={() => edit({ ...p, title: 'Meu perfil B2B' })}>
              Personalizar
              <ArrowUpRight size={15} />
            </button>
          </div>
          <dl className="profile-definition">
            <dt>Público</dt>
            <dd>{p.audience}</dd>
            <dt>Seus serviços</dt>
            <dd>{p.services}</dd>
            <dt>Tom de voz</dt>
            <dd>{p.voice}</dd>
            <dt>Meta semanal</dt>
            <dd>{p.goal} publicações</dd>
          </dl>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Seus dados</h2>
            <Pill tone={demo ? 'amber' : 'green'}>
              {demo ? 'Demonstração local' : 'Conta conectada'}
            </Pill>
          </div>
          <div className="settings-body">
            <p>
              {demo
                ? 'Você está explorando um espaço de demonstração salvo neste navegador. Os exemplos são fictícios.'
                : 'Os registros deste espaço são protegidos pela sua conta no Supabase.'}
            </p>
            <button
              className="button secondary"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      JSON.stringify(
                        { version: 1, exportedAt: new Date().toISOString(), entries },
                        null,
                        2,
                      ),
                    ],
                    { type: 'application/json' },
                  ),
                );
                const a = document.createElement('a');
                a.href = url;
                a.download = 'vontta-backup.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download size={16} />
              Baixar backup deste espaço
            </button>
            {!demo && (
              <button className="button secondary" onClick={onImport}>
                <FolderKanban size={16} />
                Importar dados da versão anterior
              </button>
            )}
            <button className="text-button" onClick={onLogout}>
              Sair da conta <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <AISettingsPanel demo={demo} />
      </div>
    </>
  );
}
