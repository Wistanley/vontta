
import React, { useState, useEffect, useMemo } from 'react';
// SWITCH TO REAL BACKEND
import { backend } from './services/supabaseBackend';
import { Task, User, ActivityLog, Status, Sector, Project, SystemSettings, BoardTask, ChatMessage, ChatChannel, WeeklyHistory } from './types';
import { ActivityLogWidget } from './components/ActivityLogWidget';
import { TaskModal } from './components/TaskModal';
import { SettingsView } from './components/SettingsView';
import { WeeklyPlanningView } from './components/WeeklyPlanningView';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { ActivitiesView } from './components/ActivitiesView';
import { ProfileView } from './components/ProfileView';
import { BoardView } from './components/BoardView';
import { ChatView } from './components/ChatView';
import { HistoryView } from './components/HistoryView'; // NEW IMPORT
import {
  LayoutDashboard,
  CalendarDays,
  Plus,
  ListTodo,
  LogOut,
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  FolderOpen,
  Download,
  Settings,
  Kanban,
  MessageSquare,
  History, // NEW ICON
  Menu, // Mobile Menu Icon
  X // Close Icon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Login Screen Component ---
const LoginScreen: React.FC<{ onLogin: (user: User) => void; settings: SystemSettings }> = ({ onLogin, settings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle fallback if image 404s (e.g. fresh install)
  const [logoError, setLogoError] = useState(false);

  // Sign Up State
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await backend.signUp(email, password, name);
        if (result.error) {
          setError(result.error);
        } else if (result.user) {
          onLogin(result.user);
        } else {
          setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail para confirmar (se necessário) ou faça login.');
          setIsSignUp(false);
        }
      } else {
        const result = await backend.authenticate(email, password);
        if (result.user) {
          onLogin(result.user);
        } else {
          setError(result.error || 'Erro ao autenticar');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#02040a] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 to-cyan-500/5 z-0" />

      <div className="bg-navy-800/80 backdrop-blur-xl p-8 rounded-2xl border border-white/5 shadow-2xl w-full max-w-md z-10 relative">
        <div className="text-center mb-8">
          {/* Dynamic Logo in Login */}
          {settings.logoUrl && !logoError ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-16 w-auto mx-auto mb-4 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 mb-4 shadow-lg shadow-blue-500/20">
              <LayoutDashboard className="text-white" size={24} />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white tracking-tight">{(settings.logoUrl && !logoError) ? '' : 'Vontta'}</h1>
          <p className="text-slate-400 mt-2">{isSignUp ? 'Crie sua conta' : 'Acesse sua conta'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Nome Completo</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
                {/* Reusing Mail icon for simplicity or change to User icon if available */}
                <input
                  type="text"
                  required={isSignUp}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-navy-900 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="Seu Nome"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">E-mail</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                {error}
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isSignUp ? 'Criar Conta' : 'Entrar'}
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMessage(null); }}
              className="text-sm text-slate-400 hover:text-white transition-colors underline decoration-slate-600 hover:decoration-white"
            >
              {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boardTasks, setBoardTasks] = useState<BoardTask[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [settings, setSettings] = useState<SystemSettings>({ logoUrl: null, faviconUrl: null });
  const [logoError, setLogoError] = useState(false);

  // Chat Data
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [history, setHistory] = useState<WeeklyHistory[]>([]); // New State

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // UI State
  const [currentView, setCurrentView] = useState<'dashboard' | 'activities' | 'planning' | 'board' | 'chat' | 'settings' | 'profile' | 'history'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [duplicatingTask, setDuplicatingTask] = useState<Task | null>(null);

  // 1. Init Auth Check
  useEffect(() => {
    const initAuth = async () => {
      const user = await backend.checkSession();
      if (user) setCurrentUser(user);
      setIsLoadingSession(false);
    };
    initAuth();
  }, []);

  // 2. Load Data Subscription
  useEffect(() => {
    // Only run this effect if we have a logged-in user
    if (!currentUser) return;

    const refreshData = () => {
      setUsers(backend.getUsers());
      setTasks(backend.getTasks());
      setBoardTasks(backend.getBoardTasks());
      setLogs(backend.getLogs());
      setSectors(backend.getSectors());
      setProjects(backend.getProjects());
      setSettings(backend.getSettings());
      setChatMessages(backend.getChatMessages());
      setChatChannels(backend.getChatChannels());
      setHistory(backend.getWeeklyHistory()); // Fetch History
      setLogoError(false);

      // Sync currentUser state with backend if profile updated
      if (backend.currentUser && backend.currentUser.id === currentUser.id) {
        setCurrentUser(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(backend.currentUser)) {
            return backend.currentUser;
          }
          return prev;
        });
      }
    };

    // Ensure data is initialized
    backend.initializeData().then(() => {
      refreshData();
    });

    const unsubscribe = backend.subscribe(() => {
      refreshData();
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Update Favicon dynamically
  useEffect(() => {
    if (settings.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
  }, [settings.faviconUrl]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    backend.logout();
    // Clear all local state to ensure no stale data appears on next login
    setTasks([]);
    setBoardTasks([]);
    setLogs([]);
    setUsers([]);
    setSectors([]);
    setProjects([]);
    setChatMessages([]);
    setChatChannels([]);
    setCurrentUser(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setDuplicatingTask(null);
    setIsModalOpen(true);
  };

  const handleDuplicate = (task: Task) => {
    setEditingTask(null);
    setDuplicatingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
      backend.deleteTask(id);
    }
  };

  // Helper to resolve Project Name
  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Projeto Desconhecido';
  };

  // Computed Stats
  const stats = useMemo(() => {
    const myTasks = tasks.filter(t => t.collaboratorId === currentUser?.id);
    const myHours = backend.calculateTotalHours(currentUser?.id);

    const completed = tasks.filter(t => t.status === Status.COMPLETED).length;
    const pending = tasks.length - completed;

    return { myHours, completed, pending, total: tasks.length };
  }, [tasks, currentUser]);

  // Export to CSV Logic
  const handleExportCSV = () => {
    if (tasks.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const headers = [
      'Projeto',
      'Setor',
      'Colaborador',
      'Atividade Planejada',
      'Atividade Entregue',
      'Status',
      'Prioridade',
      'Data Entrega',
      'Horas',
      'Observações'
    ];

    const rows = tasks.map(t => {
      const projectName = getProjectName(t.projectId);
      const collaboratorName = users.find(u => u.id === t.collaboratorId)?.name || 'N/A';
      const escape = (str: string | undefined | null) => {
        const s = str ? String(str) : '';
        return `"${s.replace(/"/g, '""')}"`;
      };

      return [
        escape(projectName),
        escape(t.sector),
        escape(collaboratorName),
        escape(t.plannedActivity),
        escape(t.deliveredActivity),
        escape(t.status),
        escape(t.priority),
        escape(t.dueDate),
        escape(t.hoursDedicated),
        escape(t.notes)
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vontta_relatorio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingSession) {
    return (
      <div className="h-screen bg-[#02040a] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLoginSuccess} settings={settings} />;
  }

  return (
    <div className="flex h-screen bg-[#02040a] text-slate-200 overflow-hidden font-sans">

      {/* Sidebar */}
      <aside className="w-64 bg-navy-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          {/* Dynamic Logo in Sidebar */}
          {settings.logoUrl && !logoError ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-8 w-auto max-w-[150px] object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <LayoutDashboard className="text-white" size={18} />
            </div>
          )}
          {(!settings.logoUrl || logoError) && <span className="font-bold text-lg tracking-tight text-white">Vontta</span>}
        </div>

        <div className="px-4 py-2">
          <div className="bg-navy-800/50 rounded-xl p-4 border border-slate-800">
            <p className="text-xs text-slate-400 font-medium uppercase mb-2">Suas Horas (Semana)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white tracking-tighter">{stats.myHours}</span>
              <span className="text-xs text-slate-500">h</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 mt-6 space-y-1">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'dashboard' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentView('activities')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'activities' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <ListTodo size={18} />
            <span>Atividades</span>
          </button>

          <button
            onClick={() => setCurrentView('planning')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'planning' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <CalendarDays size={18} />
            <span>Planejamento</span>
          </button>

          <button
            onClick={() => setCurrentView('board')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'board' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Kanban size={18} />
            <span>Quadro</span>
          </button>

          <button
            onClick={() => setCurrentView('chat')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'chat' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <MessageSquare size={18} />
            <span>Chat IA</span>
          </button>

          <button
            onClick={() => setCurrentView('history')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'history' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <History size={18} />
            <span>Histórico</span>
          </button>

          <button
            onClick={() => setCurrentView('settings')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'settings' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <FolderOpen size={18} />
            <span>Cadastros</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div
            onClick={() => setCurrentView('profile')}
            className={`flex items-center gap-3 mb-4 p-2 rounded-lg cursor-pointer transition-colors ${currentView === 'profile' ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <img src={currentUser.avatar} className="w-9 h-9 rounded-full border border-slate-600 object-cover" alt="me" />
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 truncate">Editar Perfil</p>
            </div>
            <Settings size={14} className="text-slate-500" />
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors w-full px-2">
            <LogOut size={14} />
            Sair do sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-navy-900/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-white">
              {currentView === 'dashboard' && 'Visão Geral (Analytics)'}
              {currentView === 'activities' && 'Lista de Atividades'}
              {currentView === 'planning' && 'Agenda Semanal'}
              {currentView === 'board' && 'Quadro de Tarefas'}
              {currentView === 'chat' && 'Chat Colaborativo'}
              {currentView === 'settings' && 'Gerenciamento'}
              {currentView === 'profile' && 'Perfil do Usuário'}
              {currentView === 'history' && 'Histórico Semanal'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Common Actions for Dashboard/Activities */}
            {(currentView === 'dashboard' || currentView === 'activities') && (
              <>
                <div className="hidden md:flex items-center gap-6 mr-2 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <span>{stats.completed} Entregues</span>
                  </div>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="hidden sm:flex items-center gap-2 bg-navy-800 border border-slate-700 hover:bg-navy-700 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-all"
                  title="Exportar CSV"
                >
                  <Download size={16} />
                  <span>Exportar</span>
                </button>

                <button
                  onClick={() => { setEditingTask(null); setDuplicatingTask(null); setIsModalOpen(true); }}
                  className="bg-primary hover:bg-sky-400 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Nova Atividade</span>
                  <span className="sm:hidden">Nova</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Dynamic Body */}
        <div className="flex-1 p-4 md:p-6 overflow-hidden flex gap-4 md:gap-6">

          {/* Main View Container */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">

            {/* VIEW: DASHBOARD */}
            {currentView === 'dashboard' && (
              <DashboardAnalytics tasks={tasks} projects={projects} users={users} />
            )}

            {/* VIEW: ACTIVITIES */}
            {currentView === 'activities' && (
              <ActivitiesView
                tasks={tasks}
                projects={projects}
                users={users}
                currentUser={currentUser}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            )}

            {/* VIEW: PLANNING */}
            {currentView === 'planning' && (
              <WeeklyPlanningView tasks={tasks} projects={projects} currentUser={currentUser} />
            )}

            {/* VIEW: BOARD */}
            {currentView === 'board' && (
              <BoardView tasks={boardTasks} users={users} />
            )}

            {/* VIEW: CHAT (NEW) */}
            {currentView === 'chat' && (
              <ChatView
                messages={chatMessages}
                channels={chatChannels}
                currentUser={currentUser}
                users={users}
              />
            )}

            {/* VIEW: HISTORY (NEW) */}
            {currentView === 'history' && (
              <HistoryView history={history} projects={projects} users={users} />
            )}

            {/* VIEW: SETTINGS */}
            {currentView === 'settings' && (
              <SettingsView sectors={sectors} projects={projects} users={users} />
            )}

            {/* VIEW: PROFILE */}
            {currentView === 'profile' && (
              <ProfileView currentUser={currentUser} sectors={sectors} />
            )}

          </div>

          {/* Right Column: Activity Log Widget (Visible on Dashboard and Activities) */}
          {(currentView === 'dashboard' || currentView === 'activities') && (
            <div className="w-80 hidden xl:block">
              <ActivityLogWidget logs={logs} users={users} />
            </div>
          )}

        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-navy-900 border-r border-slate-800 z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-800">
                {/* Dynamic Logo in Mobile Menu */}
                <div className="flex items-center gap-3">
                  {settings.logoUrl && !logoError ? (
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="h-8 w-auto max-w-[120px] object-contain"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <LayoutDashboard className="text-white" size={18} />
                    </div>
                  )}
                  {(!settings.logoUrl || logoError) && <span className="font-bold text-lg tracking-tight text-white">Vontta</span>}
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 border-b border-slate-800 bg-navy-800/30">
                <div className="flex items-center gap-3 mb-3">
                  <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-slate-600 object-cover" alt="me" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                <button
                  onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'dashboard' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <LayoutDashboard size={20} />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => { setCurrentView('activities'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'activities' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <ListTodo size={20} />
                  <span>Atividades</span>
                </button>

                <button
                  onClick={() => { setCurrentView('planning'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'planning' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <CalendarDays size={20} />
                  <span>Planejamento</span>
                </button>

                <button
                  onClick={() => { setCurrentView('board'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'board' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Kanban size={20} />
                  <span>Quadro</span>
                </button>

                <button
                  onClick={() => { setCurrentView('chat'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'chat' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <MessageSquare size={20} />
                  <span>Chat IA</span>
                </button>

                <button
                  onClick={() => { setCurrentView('history'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'history' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <History size={20} />
                  <span>Histórico</span>
                </button>

                <div className="my-4 border-t border-slate-800"></div>

                <button
                  onClick={() => { setCurrentView('profile'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'profile' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Settings size={20} />
                  <span>Perfil</span>
                </button>

                <button
                  onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border font-medium transition-all ${currentView === 'settings' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <FolderOpen size={20} />
                  <span>Cadastros</span>
                </button>

                <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors mt-auto">
                  <LogOut size={20} />
                  <span>Sair do sistema</span>
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        taskToEdit={editingTask}
        initialData={duplicatingTask}
        projects={projects}
        sectors={sectors}
        users={users}
      />
    </div>
  );
}
