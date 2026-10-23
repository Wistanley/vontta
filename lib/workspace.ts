import { supabase } from './supabaseClient';

export type View =
  'overview' | 'planner' | 'content' | 'posts' | 'projects' | 'finance' | 'clients' | 'settings';
export type Kind = 'task' | 'content' | 'project' | 'client' | 'transaction' | 'preferences';
export type ContentStatus = 'Ideia' | 'Roteiro' | 'Gravar' | 'Editar' | 'Agendado' | 'Publicado';
export const contentStages: ContentStatus[] = [
  'Ideia',
  'Roteiro',
  'Gravar',
  'Editar',
  'Agendado',
  'Publicado',
];
export interface Base {
  id: string;
  kind: Kind;
  title: string;
  createdAt: string;
}
export interface WorkTask extends Base {
  kind: 'task';
  date: string;
  time: string;
  duration: number;
  done: boolean;
  priority: 'Alta' | 'Média' | 'Baixa';
  projectId: string;
  notes?: string;
}
export interface Content extends Base {
  kind: 'content';
  status: ContentStatus;
  format: 'Reels' | 'Carrossel' | 'Stories';
  pillar: string;
  date: string;
  hook: string;
  script: string;
  caption: string;
  cta: string;
  checklist: string[];
}
export interface Client extends Base {
  kind: 'client';
  company: string;
  email: string;
  phone: string;
  notes: string;
}
export interface Stage {
  id: string;
  title: string;
  done: boolean;
  date: string;
}
export interface WorkProject extends Base {
  kind: 'project';
  projectType?: 'work' | 'personal';
  parentProjectId?: string;
  clientId: string;
  deadline: string;
  status: 'Em andamento' | 'Em proposta' | 'Concluído' | 'Pausado';
  budget: number;
  description: string;
  documentation: string;
  stages: Stage[];
}
export interface Transaction extends Base {
  kind: 'transaction';
  type: 'income' | 'expense';
  amount: number;
  date: string;
  paid: boolean;
  category: string;
  projectId: string;
  recurrence: 'none' | 'monthly';
  sourceId?: string;
  excludedFromTotals?: boolean;
  bank?: {
    provider: 'pluggy';
    accountId: string;
    transactionId: string;
    accountName: string;
    accountType: 'BANK' | 'CREDIT';
    status: 'PENDING' | 'POSTED';
    originalDate: string;
    installmentNumber?: number;
    totalInstallments?: number;
    billForecastDate?: string;
    operationType?: string;
    syncedAt: string;
  };
}
export interface Preferences extends Base {
  kind: 'preferences';
  audience: string;
  services: string;
  voice: string;
  goal: number;
}
export type Entry = WorkTask | Content | Client | WorkProject | Transaction | Preferences;
export function projectAncestors(project: WorkProject, projects: WorkProject[]) {
  const ancestors: WorkProject[] = [];
  const seen = new Set([project.id]);
  let parentId = project.parentProjectId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = projects.find((p) => p.id === parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    parentId = parent.parentProjectId;
  }
  return ancestors;
}
export function projectLabel(project: WorkProject, projects: WorkProject[]) {
  return [...projectAncestors(project, projects), project].map((p) => p.title).join(' / ');
}
export function canSetProjectParent(id: string, parentId: string, projects: WorkProject[]) {
  const seen = new Set([id]);
  let current = parentId;
  while (current) {
    if (seen.has(current)) return false;
    seen.add(current);
    const parent = projects.find((p) => p.id === current);
    if (!parent) return false;
    current = parent.parentProjectId || '';
  }
  return true;
}
export const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dayOffset(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDate(d);
}
export function dateLabel(
  value: string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' },
) {
  return value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', options) : 'Sem data';
}
export function shiftMonth(value: string, delta: number) {
  const [y, m, d] = value.split('-').map(Number);
  const target = new Date(y, m - 1 + delta, 1);
  target.setDate(Math.min(d, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
  return localDate(target);
}
export function financialSummary(items: Transaction[]) {
  const sum = (type: Transaction['type'], paid?: boolean) =>
    items
      .filter(
        (t) => !t.excludedFromTotals && t.type === type && (paid === undefined || t.paid === paid),
      )
      .reduce((s, t) => s + Math.round(t.amount * 100), 0) / 100;
  return {
    income: sum('income'),
    expenses: sum('expense'),
    received: sum('income', true),
    paid: sum('expense', true),
    receivable: sum('income', false),
    payable: sum('expense', false),
    balance: sum('income', true) - sum('expense', true),
    forecast: sum('income') - sum('expense'),
  };
}
export function projectExpenses(project: WorkProject, items: Transaction[]) {
  const expenses = items.filter(
    (t) => t.projectId === project.id && t.type === 'expense' && !t.excludedFromTotals,
  );
  const totals = financialSummary(expenses);
  return {
    ...totals,
    remaining: project.budget - totals.expenses,
    percent: project.budget > 0 ? (totals.expenses / project.budget) * 100 : 0,
    categories: [...new Set(expenses.map((t) => t.category))]
      .map((category) => ({
        category,
        amount: financialSummary(expenses.filter((t) => t.category === category)).expenses,
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}
export function personalProject(template: 'wedding' | 'home' | 'custom' = 'custom'): WorkProject {
  const stages =
    template === 'wedding'
      ? ['Planejamento', 'Cerimônia', 'Festa e fornecedores', 'Lua de mel']
      : template === 'home'
        ? ['Planejamento e projeto', 'Fundação e estrutura', 'Instalações', 'Acabamentos']
        : [];
  return {
    ...(newEntry('project') as WorkProject),
    projectType: 'personal',
    title: template === 'wedding' ? 'Meu casamento' : template === 'home' ? 'Minha casa' : '',
    stages: stages.map((title) => ({ id: crypto.randomUUID(), title, done: false, date: '' })),
  };
}
export const base = <K extends Kind>(kind: K, title = '') => ({
  id: crypto.randomUUID(),
  kind,
  title,
  createdAt: new Date().toISOString(),
});
export const defaults: Omit<Preferences, keyof Base> = {
  audience: 'Empresários e gestores de pequenas e médias empresas (B2B)',
  services: 'Desenvolvimento de sistemas, aplicativos e sites. Implantação de IA nas empresas.',
  voice: 'Direto, didático e consultivo. Foco em resultado de negócio, sem jargão.',
  goal: 3,
};
export function newEntry(kind: Kind): Entry {
  const b = base(kind);
  switch (kind) {
    case 'task':
      return {
        ...b,
        kind,
        date: localDate(),
        time: '09:00',
        duration: 30,
        done: false,
        priority: 'Média',
        projectId: '',
      };
    case 'content':
      return {
        ...b,
        kind,
        status: 'Ideia',
        format: 'Reels',
        pillar: 'IA nos negócios',
        date: '',
        hook: '',
        script: '',
        caption: '',
        cta: '',
        checklist: [],
      };
    case 'project':
      return {
        ...b,
        kind,
        clientId: '',
        parentProjectId: '',
        deadline: '',
        status: 'Em andamento',
        budget: 0,
        description: '',
        documentation: '',
        stages: [
          'Descoberta e briefing',
          'Design e aprovação',
          'Desenvolvimento',
          'Testes e entrega',
        ].map((title) => ({ id: crypto.randomUUID(), title, done: false, date: '' })),
      };
    case 'client':
      return { ...b, kind, company: '', email: '', phone: '', notes: '' };
    case 'transaction':
      return {
        ...b,
        kind,
        type: 'income',
        amount: 0,
        date: localDate(),
        paid: false,
        category: 'Projetos',
        projectId: '',
        recurrence: 'none',
      };
    case 'preferences':
      return { ...b, kind, ...defaults };
  }
}
export function demoData(): Entry[] {
  const c1: Client = {
    ...(newEntry('client') as Client),
    title: 'Mariana Costa',
    company: 'Estúdio Forma',
    email: 'mariana@example.com',
    phone: '(11) 99999-0101',
    notes: 'Dados fictícios para demonstração.',
  };
  const c2: Client = {
    ...(newEntry('client') as Client),
    title: 'Rafael Alves',
    company: 'Nexo Consultoria',
    email: 'rafael@example.com',
    phone: '',
    notes: 'Dados fictícios para demonstração.',
  };
  const p1: WorkProject = {
    ...(newEntry('project') as WorkProject),
    title: 'Novo site institucional',
    clientId: c1.id,
    deadline: dayOffset(8),
    budget: 6500,
    description: 'Um site que transforma visitas em conversas comerciais.',
    documentation:
      'Objetivo: comunicar o posicionamento e captar leads qualificados.\n\nEntregas: página inicial, serviços, sobre e contato.\n\nCritérios de aceite: responsividade, formulário testado e aprovação do cliente.',
  };
  p1.stages = p1.stages.map((s, i) => ({ ...s, done: i < 2, date: dayOffset(i * 3) }));
  const p2: WorkProject = {
    ...(newEntry('project') as WorkProject),
    title: 'Assistente de IA comercial',
    clientId: c2.id,
    deadline: dayOffset(15),
    budget: 9800,
    description: 'Qualificação de oportunidades e apoio ao time de vendas.',
  };
  p2.stages = p2.stages.map((s, i) => ({ ...s, done: i === 0, date: dayOffset(i * 4) }));
  const ideas: [string, ContentStatus, string, string][] = [
    [
      'Sua empresa ainda depende de planilhas?',
      'Gravar',
      'Sistemas sob medida',
      'Se a operação para quando uma planilha quebra, este vídeo é para você.',
    ],
    [
      '3 tarefas que a IA já pode fazer pela sua equipe',
      'Roteiro',
      'IA nos negócios',
      'Quanto tempo sua equipe perde repetindo a mesma tarefa?',
    ],
    [
      'Um site bonito não paga as contas. Um site estratégico, sim.',
      'Ideia',
      'Sites que vendem',
      'Seu site está gerando oportunidades ou só ocupando um endereço?',
    ],
    [
      'Do processo manual ao sistema: bastidores de uma entrega',
      'Editar',
      'Bastidores',
      'Veja como um processo de horas pode virar uma rotina de minutos.',
    ],
  ];
  return [
    c1,
    c2,
    p1,
    p2,
    ...ideas.map(([title, status, pillar, hook], i): Content => ({
      ...(newEntry('content') as Content),
      title,
      status,
      pillar,
      hook,
      date: dayOffset(i),
      script:
        i === 0
          ? 'Você ainda copia informações de uma planilha para outra?\n\nEsse retrabalho custa tempo e abre espaço para erros. Um sistema sob medida conecta as etapas e dá visibilidade do que está acontecendo.\n\nAntes de investir, mapeie o processo que mais consome horas da sua equipe. Comece por ele.'
          : '',
      cta: 'Me conte no direct qual processo mais trava sua operação.',
    })),
    ...[
      'Revisar proposta da Nexo',
      'Finalizar página de serviços',
      'Gravar um Reel sobre sistemas',
      'Organizar a próxima semana',
    ].map((title, i): WorkTask => ({
      ...(newEntry('task') as WorkTask),
      title,
      time: ['09:00', '10:30', '14:00', '16:00'][i],
      duration: [30, 90, 30, 20][i],
      priority: i === 0 ? 'Alta' : 'Média',
      projectId: i === 1 ? p1.id : i === 0 ? p2.id : '',
      done: i === 0,
    })),
    ...[
      {
        title: 'Site Forma · entrada',
        amount: 3250,
        type: 'income',
        paid: true,
        projectId: p1.id,
        category: 'Projetos',
        date: dayOffset(0),
      },
      {
        title: 'Assistente Nexo · primeira etapa',
        amount: 4900,
        type: 'income',
        paid: false,
        projectId: p2.id,
        category: 'Projetos',
        date: dayOffset(3),
      },
      {
        title: 'Ferramentas e assinaturas',
        amount: 389,
        type: 'expense',
        paid: true,
        projectId: '',
        category: 'Software',
        date: dayOffset(0),
      },
      {
        title: 'Infraestrutura e hospedagem',
        amount: 180,
        type: 'expense',
        paid: false,
        projectId: '',
        category: 'Infraestrutura',
        date: dayOffset(2),
      },
    ].map((t) => ({ ...newEntry('transaction'), ...t }) as Transaction),
    newEntry('preferences'),
  ];
}
export async function fetchEntries(owner: string): Promise<Entry[]> {
  const entries: Entry[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('workspace_entries')
      .select('payload')
      .eq('owner_id', owner)
      .order('created_at')
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error)
      throw new Error(
        'Não foi possível carregar seu espaço. Confira a conexão e aplique a migração do banco.',
      );
    entries.push(...(data || []).map((row) => row.payload as Entry));
    if (!data || data.length < pageSize) return entries;
  }
}
export async function persistEntry(owner: string, entry: Entry) {
  if (entry.kind === 'transaction' && entry.bank) {
    const { data, error } = await supabase.rpc('update_pluggy_annotation', {
      p_id: entry.id,
      p_project_id: entry.projectId,
      p_category: entry.category,
      p_excluded: !!entry.excludedFromTotals,
      p_paid: entry.paid,
    });
    if (error || !data)
      throw new Error(
        'Não foi possível atualizar o lançamento importado. Recarregue e tente novamente.',
      );
    return data as Transaction;
  }
  const { error } = await supabase.from('workspace_entries').upsert(
    {
      id: entry.id,
      owner_id: owner,
      kind: entry.kind,
      payload: entry,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'owner_id,id' },
  );
  if (error) throw new Error('Não foi possível salvar. Verifique sua conexão e tente novamente.');
  return entry;
}
export async function deleteEntry(owner: string, id: string) {
  const { error } = await supabase
    .from('workspace_entries')
    .delete()
    .eq('id', id)
    .eq('owner_id', owner);
  if (error) throw new Error('Não foi possível excluir. Tente novamente.');
}
