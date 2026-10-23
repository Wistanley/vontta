import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  LayoutDashboard,
  CalendarDays,
  Video,
  FolderKanban,
  Wallet,
  Users,
  Settings2,
  Sparkles,
  Plus,
  Search,
  ArrowUpRight,
  ChevronDown,
  Menu,
  X,
  Loader2,
  ArrowRight,
  Check,
  Cloud,
  LogOut,
  Command,
  Bell,
  TriangleAlert,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import {
  Entry,
  View,
  Kind,
  Content,
  WorkProject,
  WorkTask,
  Transaction,
  Client,
  localDate,
  fetchEntries,
  persistEntry,
  deleteEntry,
  demoData,
  newEntry,
  base,
  canSetProjectParent,
} from './lib/workspace';
import {
  Overview,
  Planner,
  ContentStudio,
  Projects,
  Clients,
  Finance,
  Settings,
  ViewProps,
} from './components/WorkspaceViews';
import { EntryEditor, Modal, IconButton, RecordingMode, Pill } from './components/WorkspaceUI';
import { AssistantPanel, AIRequest } from './components/AssistantPanel';
const LegacyApp = lazy(() => import('./LegacyApp'));
const PostCreator = lazy(() => import('./components/PostCreator'));
const navigation = [
  { view: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { view: 'planner', label: 'Minha agenda', icon: CalendarDays },
  { view: 'content', label: 'Estúdio de conteúdo', icon: Video },
  { view: 'posts', label: 'Criador de posts', icon: Sparkles },
  { view: 'projects', label: 'Projetos', icon: FolderKanban },
  { view: 'finance', label: 'Financeiro', icon: Wallet },
  { view: 'clients', label: 'Clientes', icon: Users },
] as const;
const titles: Record<View, string> = {
  overview: 'Visão geral',
  planner: 'Minha agenda',
  content: 'Estúdio de conteúdo',
  posts: 'Criador de posts',
  projects: 'Projetos',
  finance: 'Financeiro',
  clients: 'Clientes',
  settings: 'Preferências',
};
const demoKey = 'vontta-workspace-demo-v1';
function loadDemo(): Entry[] {
  try {
    const saved = localStorage.getItem(demoKey);
    if (saved) {
      const data = JSON.parse(saved);
      if (Array.isArray(data) && data.every((e) => e.id && e.kind)) return data;
    }
  } catch {}
  return demoData();
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <i />
        <i />
        <i />
      </span>
      <span>
        vontta<span className="brand-period">.</span>
      </span>
    </div>
  );
}
function Login({ onDemo }: { onDemo: () => void }) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!isSupabaseConfigured)
        throw new Error(
          'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para conectar sua conta.',
        );
      if (signup) {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        if (!data.session)
          setMessage('Conta criada. Verifique seu e-mail para confirmar o acesso.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-story">
        <Brand />
        <div>
          <Pill tone="green">SEU DIA COM DIREÇÃO</Pill>
          <h1>
            Organize o trabalho.
            <br />
            Dê espaço às ideias.
            <br />
            <span>Faça acontecer.</span>
          </h1>
          <p>
            Rotina, conteúdo e negócios.
            <br />
            Um espaço para conectar tudo o que você faz.
          </p>
          <div className="login-features">
            <span>
              <CalendarDays size={16} />
              Planeje com clareza
            </span>
            <span>
              <Video size={16} />
              Crie com consistência
            </span>
            <span>
              <FolderKanban size={16} />
              Entregue com confiança
            </span>
          </div>
        </div>
        <span className="small muted">FEITO PARA O SEU RITMO.</span>
      </div>
      <div className="login-form-side">
        <div className="login-form">
          <span className="eyebrow">BEM-VINDO AO SEU ESPAÇO</span>
          <h2>{signup ? 'Vamos começar?' : 'Bom ter você por aqui.'}</h2>
          <p className="muted">
            {signup
              ? 'Crie sua conta para conectar suas próximas entregas.'
              : 'Entre para dar o próximo passo no seu dia.'}
          </p>
          <form onSubmit={submit}>
            {signup && (
              <label className="field">
                <span>Seu nome</span>
                <input
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              <span>E-mail</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
              />
            </label>
            <label className="field">
              <span>Senha</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={signup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
              />
            </label>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {message && <p className="success-message">{message}</p>}
            <button className="button primary" disabled={busy}>
              {busy ? <Loader2 className="spin" size={17} /> : <ArrowRight size={17} />}{' '}
              {signup ? 'Criar minha conta' : 'Entrar no meu espaço'}
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setSignup(!signup);
              setError('');
            }}
          >
            {signup ? 'Já tenho conta' : 'Criar uma conta'}
          </button>
          <div className="login-divider">
            <span>ou conheça antes</span>
          </div>
          <button className="button secondary" onClick={onDemo}>
            Explorar demonstração
            <ArrowUpRight size={17} />
          </button>
          {!isSupabaseConfigured && (
            <p className="small muted">
              Ambiente local: configure o Supabase para usar sua conta. A demonstração está pronta
              para explorar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [view, setView] = useState<View>(() => {
    const hash = location.hash.slice(1);
    return hash in titles ? (hash as View) : 'overview';
  });
  const [editing, setEditing] = useState<Entry | null>(null);
  const [ai, setAI] = useState<AIRequest | null>(null);
  const [recording, setRecording] = useState<Content | null>(null);
  const [menu, setMenu] = useState(false);
  const [quick, setQuick] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [loadError, setLoadError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [saving, setSaving] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const revision = useRef(0);
  const savingIds = useRef(new Set<string>());
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 5000);
  }, []);
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive) {
          setUser(data.session?.user || null);
          if (error) setLoadError('Não foi possível verificar sua sessão. Entre novamente.');
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) setDemo(false);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let alive = true;
    generation.current++;
    if (demo) {
      setEntries(loadDemo());
      setLoadError('');
      return;
    }
    if (!user) {
      setEntries([]);
      return;
    }
    setLoading(true);
    setEntries([]);
    fetchEntries(user.id)
      .then((data) => {
        if (alive) {
          setEntries(data);
          setLoadError('');
        }
      })
      .catch((e) => {
        if (alive) setLoadError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id, demo]);
  useEffect(() => {
    if (demo || !user) return;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      const gen = generation.current;
      const rev = revision.current;
      fetchEntries(user.id)
        .then((data) => {
          if (gen === generation.current && rev === revision.current) {
            setEntries(data);
            setLoadError('');
          }
        })
        .catch(() =>
          notify('Não foi possível atualizar os dados da nuvem. Verifique sua conexão.'),
        );
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [user?.id, demo, notify]);
  useEffect(() => {
    const onHash = () => {
      const next = location.hash.slice(1);
      if (next in titles) setView(next as View);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const navigate = (next: View) => {
    setView(next);
    location.hash = next;
    setMenu(false);
    window.scrollTo({ top: 0 });
  };
  const save = async (entry: Entry) => {
    if (!entry.title.trim()) throw new Error('Preencha o título.');
    if (
      entry.kind === 'project' &&
      !canSetProjectParent(
        entry.id,
        entry.parentProjectId || '',
        entries.filter((e): e is WorkProject => e.kind === 'project'),
      )
    )
      throw new Error(
        'Escolha um projeto pai válido. Um projeto não pode ficar dentro de si ou de um de seus subprojetos.',
      );
    if (savingIds.current.has(entry.id)) return;
    savingIds.current.add(entry.id);
    revision.current++;
    const gen = generation.current;
    setSaving((v) => v + 1);
    try {
      if (!demo) {
        if (!user) throw new Error('Sua sessão expirou. Entre novamente.');
        if (loadError) throw new Error('Recarregue os dados antes de fazer alterações.');
        entry = await persistEntry(user.id, entry);
      }
      if (gen !== generation.current) return;
      setEntries((current) => {
        const next = current.some((e) => e.id === entry.id)
          ? current.map((e) => (e.id === entry.id ? entry : e))
          : [...current, entry];
        if (demo) {
          try {
            localStorage.setItem(demoKey, JSON.stringify(next));
          } catch {
            notify('O navegador não conseguiu guardar esta alteração. Exporte um backup.');
          }
        }
        return next;
      });
    } catch (e) {
      notify((e as Error).message);
      throw e;
    } finally {
      revision.current++;
      savingIds.current.delete(entry.id);
      setSaving((v) => v - 1);
    }
  };
  const remove = async (entry: Entry) => {
    if (
      entry.kind === 'project' &&
      entries.some((e) => e.kind === 'project' && e.parentProjectId === entry.id)
    )
      throw new Error(
        'Este projeto possui subprojetos. Mova ou exclua os subprojetos antes de excluir o projeto principal.',
      );
    if (
      entry.kind === 'client' &&
      entries.some((e) => e.kind === 'project' && e.clientId === entry.id)
    )
      throw new Error(
        'Este cliente está vinculado a um projeto. Remova o vínculo antes de excluir.',
      );
    if (
      entry.kind === 'project' &&
      entries.some(
        (e) => (e.kind === 'task' || e.kind === 'transaction') && e.projectId === entry.id,
      )
    )
      throw new Error(
        'Remova os vínculos das atividades e dos lançamentos antes de excluir este projeto.',
      );
    if (!demo && user) await deleteEntry(user.id, entry.id);
    setEntries((current) => {
      const next = current.filter((e) => e.id !== entry.id);
      if (demo) localStorage.setItem(demoKey, JSON.stringify(next));
      return next;
    });
    notify('Registro excluído.');
  };
  const logout = async () => {
    if (!demo) await supabase.auth.signOut();
    setDemo(false);
    setUser(null);
    setEntries([]);
    setEditing(null);
    setAI(null);
    setLoadError('');
  };
  const importLegacy = async () => {
    if (!user) return;
    setImportBusy(true);
    try {
      const names = ['projects', 'tasks', 'financial_costs', 'financial_income'];
      const results = await Promise.all(names.map((name) => supabase.from(name).select('*')));
      for (let i = 0; i < results.length; i++)
        if (results[i].error)
          throw new Error(`Não foi possível ler ${names[i]}. Nenhum dado foi importado.`);
      const existing = new Set(entries.map((e) => e.id));
      const incoming: Entry[] = [];
      for (const p of results[0].data || [])
        if (!existing.has(p.id))
          incoming.push({
            ...(newEntry('project') as WorkProject),
            id: p.id,
            title: p.name || 'Projeto importado',
          });
      for (const t of results[1].data || [])
        if (!existing.has(t.id))
          incoming.push({
            ...(newEntry('task') as WorkTask),
            id: t.id,
            title: t.planned_activity || 'Atividade importada',
            date: t.due_date?.slice(0, 10) || localDate(),
            done: t.status === 'Concluído',
            priority: ['Alta', 'Baixa', 'Média'].includes(t.priority) ? t.priority : 'Média',
            projectId: t.project_id || '',
          });
      for (const [index, type] of [
        [2, 'expense'],
        [3, 'income'],
      ] as const)
        for (const t of results[index].data || []) {
          if (
            t.user_id !== user.id ||
            existing.has(t.id) ||
            (type === 'expense' && t.active === false)
          )
            continue;
          const day = Math.max(
            1,
            Math.min(
              Number(t.due_day) || 1,
              new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
            ),
          );
          incoming.push({
            ...(newEntry('transaction') as Transaction),
            id: t.id,
            title: t.name,
            amount: Number(t.value) || 0,
            type,
            category: t.category || 'Importado',
            date: localDate().slice(0, 8) + String(day).padStart(2, '0'),
            recurrence: t.is_fixed || t.is_recurring ? 'monthly' : 'none',
            paid: false,
          });
        }
      for (const entry of incoming) await save(entry);
      notify(`${incoming.length} registro(s) importado(s). Confira datas e valores.`);
      setImportOpen(false);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setImportBusy(false);
    }
  };
  const startDemo = () => {
    setDemo(true);
    setLoading(false);
  };
  if (loading)
    return (
      <div className="loading-screen">
        <Brand />
        <Loader2 className="spin" size={25} />
        <p>Organizando seu espaço…</p>
      </div>
    );
  if (!user && !demo) return <Login onDemo={startDemo} />;
  if (legacy)
    return (
      <div>
        <button className="legacy-return button primary" onClick={() => setLegacy(false)}>
          Voltar ao novo espaço
        </button>
        <Suspense fallback={<p>Carregando versão anterior…</p>}>
          <LegacyApp />
        </Suspense>
      </div>
    );
  const name = demo ? 'Alex' : user?.user_metadata?.name || user?.email?.split('@')[0] || 'Você';
  const props: ViewProps = {
    entries,
    edit: setEditing,
    save,
    navigate,
    ai: setAI,
    record: setRecording,
    notify,
  };
  const count = entries.filter((e) => e.kind === 'task' && !e.done && e.date <= localDate()).length;
  const renderNavigation = () => (
    <>
      <span className="nav-section-label">MEU ESPAÇO</span>
      {navigation.map(({ view: next, label, icon: Icon }) => (
        <button
          key={next}
          aria-current={view === next ? 'page' : undefined}
          className={`nav-item ${view === next ? 'active' : ''}`}
          onClick={() => navigate(next)}
        >
          <Icon size={19} />
          <span>{label}</span>
          {next === 'planner' && count > 0 ? <span className="nav-count">{count}</span> : null}
          {next === 'content' && <span className="new-label">NOVO</span>}
        </button>
      ))}
    </>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-main">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Brand />
        <button className="workspace-switch" onClick={() => navigate('settings')}>
          <span className="workspace-avatar">{name.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>Meu workspace</strong>
            <small>Desenvolvimento & criação</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <nav aria-label="Menu principal">{renderNavigation()}</nav>
        <div className="sidebar-bottom">
          <button className="sidebar-ai" onClick={() => setAI({ action: 'ideas' })}>
            <span className="sidebar-ai-icon">
              <Sparkles size={19} />
            </span>
            <strong>Uma ideia por vez.</strong>
            <p>
              Seu próximo passo pode
              <br />
              começar com uma conversa.
            </p>
            <span>
              Conversar com a IA
              <ArrowUpRight size={14} />
            </span>
          </button>
          <button
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <Settings2 size={18} />
            Preferências
          </button>
          <button className="profile-button" onClick={() => navigate('settings')}>
            <span className="user-avatar">{name.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{name}</strong>
              <small>Meu espaço pessoal</small>
            </span>
            <MoreDots />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <IconButton
              className="mobile-menu-button"
              label="Abrir menu"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </IconButton>
            <span className="breadcrumb-workspace">
              Meu workspace<span>/</span>
            </span>
            <strong>{titles[view]}</strong>
          </div>
          <div className="topbar-actions">
            <span className="top-date">
              {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
            </span>
            <button className="global-search" onClick={() => setSearchOpen(true)}>
              <Search size={15} />
              <span>Buscar no espaço</span>
              <kbd>Ctrl K</kbd>
            </button>
            <IconButton label="Adicionar novo registro" onClick={() => setQuick(true)}>
              <Plus size={19} />
            </IconButton>
            <button
              className="top-avatar"
              aria-label="Abrir preferências"
              onClick={() => navigate('settings')}
            >
              {name.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main id="workspace-main" className={`workspace-main view-${view}`}>
          <div className="workspace-status">
            {demo ? (
              <span>
                <span className="inline-dot amber" />
                Demonstração · dados fictícios salvos neste navegador
              </span>
            ) : (
              <span>
                <Cloud size={12} />
                {saving ? 'Salvando alterações…' : 'Seu espaço conectado'}
              </span>
            )}
            {demo && (
              <button className="text-button" onClick={() => void logout()}>
                Conectar minha conta
                <ArrowUpRight size={12} />
              </button>
            )}
          </div>
          {loadError ? (
            <div className="connection-error" role="alert">
              <TriangleAlert size={25} />
              <h2>Vamos reconectar seu espaço</h2>
              <p>{loadError}</p>
              <button className="button primary" onClick={() => location.reload()}>
                Tentar novamente
              </button>
              <button className="button secondary" onClick={() => setLegacy(true)}>
                Abrir versão anterior
              </button>
            </div>
          ) : (
            <>
              {!demo && entries.length === 0 && view === 'overview' && (
                <div className="onboarding-banner">
                  <div>
                    <h2>Seu espaço está pronto para começar.</h2>
                    <p>Traga os registros da versão anterior ou cadastre sua primeira entrega.</p>
                  </div>
                  <button className="button secondary" onClick={() => setImportOpen(true)}>
                    Importar meus registros
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
              {view === 'overview' && <Overview {...props} />}
              {view === 'planner' && <Planner {...props} />}
              {view === 'content' && <ContentStudio {...props} />}
              {view === 'posts' && (
                <Suspense fallback={<p>Carregando criador de posts…</p>}>
                  <PostCreator key={demo ? 'demo' : user?.id} demo={demo} />
                </Suspense>
              )}
              {view === 'projects' && <Projects {...props} />}
              {view === 'clients' && <Clients {...props} />}
              {view === 'finance' && (
                <Finance
                  {...props}
                  demo={demo}
                  onRefresh={async () => {
                    if (!user || demo) return;
                    const gen = generation.current;
                    const data = await fetchEntries(user.id);
                    if (gen === generation.current) {
                      setEntries(data);
                      setLoadError('');
                    }
                  }}
                />
              )}
              {view === 'settings' && (
                <Settings
                  entries={entries}
                  edit={setEditing}
                  demo={demo}
                  onImport={() => setImportOpen(true)}
                  onLogout={() => void logout()}
                />
              )}
            </>
          )}
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
        {[
          { view: 'overview', label: 'Início', icon: LayoutDashboard },
          { view: 'planner', label: 'Agenda', icon: CalendarDays },
          { view: 'content', label: 'Conteúdo', icon: Video },
          { view: 'projects', label: 'Projetos', icon: FolderKanban },
          { view: 'finance', label: 'Finanças', icon: Wallet },
        ].map(({ view: next, label, icon: Icon }) => (
          <button
            aria-current={view === next ? 'page' : undefined}
            className={view === next ? 'active' : ''}
            key={next}
            onClick={() => navigate(next as View)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {menu && (
        <div
          className="mobile-menu-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMenu(false);
          }}
        >
          <aside className="mobile-drawer">
            <div className="section-heading">
              <Brand />
              <IconButton label="Fechar menu" onClick={() => setMenu(false)}>
                <X size={20} />
              </IconButton>
            </div>
            <nav>
              {renderNavigation()}
              <button className="nav-item" onClick={() => navigate('settings')}>
                <Settings2 size={19} />
                Preferências
              </button>
            </nav>
            <button
              className="button secondary"
              onClick={() => {
                setMenu(false);
                setAI({ action: 'ideas' });
              }}
            >
              <Sparkles size={17} />
              Conversar com a IA
            </button>
          </aside>
        </div>
      )}
      {editing && (
        <EntryEditor
          key={editing.id}
          initial={editing}
          entries={entries}
          onSave={save}
          onDelete={remove}
          onClose={() => setEditing(null)}
          onAI={(action, content) => {
            setEditing(null);
            setAI({ action, content });
          }}
        />
      )}
      {ai && (
        <AssistantPanel
          request={ai}
          entries={entries}
          demo={demo}
          onClose={() => {
            if (ai.content)
              setEditing(entries.find((entry) => entry.id === ai.content?.id) || ai.content);
            setAI(null);
          }}
          onSave={save}
        />
      )}
      {recording && (
        <RecordingMode
          content={recording}
          onClose={() => setRecording(null)}
          onRecorded={() => save({ ...recording, status: 'Editar' })}
        />
      )}
      {quick && (
        <Modal title="O que vamos colocar em movimento?" onClose={() => setQuick(false)}>
          <div className="quick-grid">
            {[
              {
                kind: 'task',
                label: 'Atividade',
                desc: 'Um próximo passo na sua agenda',
                icon: CalendarDays,
              },
              {
                kind: 'content',
                label: 'Ideia de conteúdo',
                desc: 'Capture antes que ela passe',
                icon: Video,
              },
              {
                kind: 'project',
                label: 'Projeto',
                desc: 'Organize uma nova entrega',
                icon: FolderKanban,
              },
              {
                kind: 'transaction',
                label: 'Lançamento',
                desc: 'Uma receita ou despesa',
                icon: Wallet,
              },
              {
                kind: 'client',
                label: 'Cliente',
                desc: 'Uma nova relação de negócio',
                icon: Users,
              },
            ].map(({ kind, label, desc, icon: Icon }) => (
              <button
                key={kind}
                onClick={() => {
                  setQuick(false);
                  setEditing(newEntry(kind as Kind));
                }}
              >
                <Icon size={21} />
                <strong>{label}</strong>
                <span>{desc}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {searchOpen && (
        <Modal title="Encontre no seu espaço" onClose={() => setSearchOpen(false)}>
          <label className="search-input global-search-field">
            <Search size={18} />
            <input
              autoFocus
              aria-label="Busca global"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Atividades, clientes, projetos, conteúdo…"
            />
          </label>
          <div className="search-results">
            {query.length < 2 ? (
              <p className="muted">Digite pelo menos 2 letras para buscar.</p>
            ) : (
              entries
                .filter(
                  (e) =>
                    e.kind !== 'preferences' &&
                    e.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
                )
                .slice(0, 20)
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setEditing(e);
                    }}
                  >
                    <span>
                      <small>
                        {
                          {
                            task: 'ATIVIDADE',
                            content: 'CONTEÚDO',
                            project: 'PROJETO',
                            client: 'CLIENTE',
                            transaction: 'FINANCEIRO',
                            preferences: '',
                          }[e.kind]
                        }
                      </small>
                      <strong>{e.title}</strong>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))
            )}
            {query.length >= 2 &&
              !entries.some((e) => e.title.toLowerCase().includes(query.toLowerCase())) && (
                <p className="muted">Nenhum resultado. Tente outra palavra.</p>
              )}
          </div>
        </Modal>
      )}
      {importOpen && (
        <Modal title="Traga seu histórico para perto" onClose={() => setImportOpen(false)}>
          <div className="import-description">
            <p>
              Importe projetos, atividades e custos/receitas da versão anterior. Os registros
              originais são preservados. Registros com o mesmo identificador não são duplicados.
            </p>
            <p>
              O financeiro anterior não registra pagamentos por mês. Por isso, os valores ativos
              entram como pendentes no mês atual. Revise datas, parcelas e situações após importar.
            </p>
            <p>
              Os dados colaborativos de projetos e atividades acessíveis à sua conta serão copiados
              para este espaço pessoal. O quadro, o chat e os fechamentos semanais continuam
              disponíveis na versão anterior.
            </p>
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => {
                  setImportOpen(false);
                  setLegacy(true);
                }}
              >
                Ver versão anterior
              </button>
              <button disabled={importBusy} className="button primary" onClick={importLegacy}>
                {importBusy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />}
                Importar registros
              </button>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <IconButton label="Fechar aviso" onClick={() => setToast('')}>
            <X size={15} />
          </IconButton>
        </div>
      )}
    </div>
  );
}
function MoreDots() {
  return (
    <span aria-hidden="true" className="more-dots">
      ···
    </span>
  );
}
