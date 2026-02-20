
import React, { useState } from 'react';
import { backend } from '../services/supabaseBackend';
import { Project, Sector, User } from '../types';
import { Plus, Trash2, Layers, Folder, FolderPlus, Grid, UserPlus, Users, Shield, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  sectors: Sector[];
  projects: Project[];
  users: User[];
}

export const SettingsView: React.FC<Props> = ({ sectors, projects, users }) => {
  // Sector Input State
  const [newSectorName, setNewSectorName] = useState('');
  const [loading, setLoading] = useState(false);

  // Project Input State
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState('');

  // User Input State
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user', sector: '' });

  // --- Handlers ---
  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSectorName.trim()) {
      setLoading(true);
      try {
        await backend.createSector(newSectorName);
        setNewSectorName('');
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteSector = async (id: string) => {
    if (confirm('Excluir este setor?')) {
      try {
        await backend.deleteSector(id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim() && selectedSectorId) {
      setLoading(true);
      try {
        await backend.createProject(newProjectName, selectedSectorId);
        setNewProjectName('');
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Excluir este projeto?')) {
      try {
        await backend.deleteProject(id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.email && newUser.sector) {
      setLoading(true);
      try {
        await backend.createUser(newUser.name, newUser.email, newUser.role as 'admin' | 'user', newUser.sector);
        setNewUser({ name: '', email: '', role: 'user', sector: '' });
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteUser = async (id: string) => {
    // Prevent deleting self
    if (id === backend.currentUser?.id) {
      alert("Você não pode excluir seu próprio usuário.");
      return;
    }
    if (confirm('Excluir este usuário?')) {
      try {
        await backend.deleteUser(id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleCloseWeek = async () => {
    const confirmText = "Tem certeza? Isso irá:\n1. Salvar os dados atuais no histórico\n2. Limpar todas as atividades e tarefas do quadro\n3. Zerar as contagens da semana\n\nEssa ação não pode ser desfeita.";
    if (confirm(confirmText)) {
      setLoading(true);
      try {
        await backend.closeWeek();
        alert("Semana fechada com sucesso!");
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 h-full overflow-y-auto custom-scrollbar relative"
    >
      {loading && (
        <div className="absolute top-4 right-8 text-primary flex items-center gap-2 bg-navy-800 px-3 py-1 rounded-full border border-primary/20 text-xs shadow-lg z-50">
          <Loader2 className="animate-spin" size={14} />
          Processando...
        </div>
      )}

      <header className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Grid className="text-primary" size={28} />
          Cadastros Gerais
        </h2>
        <p className="text-slate-400 mt-2">Gerencie os setores, projetos e colaboradores da equipe.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* --- 1. Sectors Column --- */}
        <div className="bg-navy-800/50 border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col h-[500px]">
          <div className="flex items-center gap-2 mb-6 text-lg font-semibold text-slate-200">
            <Layers className="text-cyan-400" />
            <h3>Setores</h3>
          </div>

          <form onSubmit={handleAddSector} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Nome do novo setor..."
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
              className="flex-1 bg-navy-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
            />
            <button
              type="submit"
              disabled={!newSectorName.trim() || loading}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
            >
              <Plus size={20} />
            </button>
          </form>

          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
            <AnimatePresence>
              {sectors.map(sector => (
                <motion.div
                  key={sector.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between p-3 bg-navy-900/40 border border-slate-700/50 rounded-lg group"
                >
                  <span className="text-slate-300 font-medium">{sector.name}</span>
                  <button
                    onClick={() => handleDeleteSector(sector.id)}
                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
              {sectors.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-4">Nenhum setor cadastrado.</p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- 2. Projects Column --- */}
        <div className="bg-navy-800/50 border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col h-[500px]">
          <div className="flex items-center gap-2 mb-6 text-lg font-semibold text-slate-200">
            <Folder className="text-blue-400" />
            <h3>Projetos</h3>
          </div>

          <form onSubmit={handleAddProject} className="flex flex-col gap-3 mb-6 bg-navy-900/50 p-4 rounded-xl border border-slate-700/50">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Nome do Projeto</label>
                <input
                  type="text"
                  placeholder="Ex: App Mobile"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="w-1/3">
                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Setor Pai</label>
                <select
                  value={selectedSectorId}
                  onChange={(e) => setSelectedSectorId(e.target.value)}
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={!newProjectName.trim() || !selectedSectorId || loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <FolderPlus size={16} />
              Adicionar Projeto
            </button>
          </form>

          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
            <AnimatePresence>
              {projects.map(project => {
                const parentSector = sectors.find(s => s.id === project.sectorId);
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between p-3 bg-navy-900/40 border border-slate-700/50 rounded-lg group"
                  >
                    <div>
                      <div className="text-slate-300 font-medium">{project.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Layers size={10} />
                        {parentSector?.name || 'Setor desconhecido'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                );
              })}
              {projects.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-4">Nenhum projeto cadastrado.</p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- 3. Users Column --- */}
        <div className="bg-navy-800/50 border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col h-[500px]">
          <div className="flex items-center gap-2 mb-6 text-lg font-semibold text-slate-200">
            <Users className="text-emerald-400" />
            <h3>Colaboradores</h3>
          </div>

          <form onSubmit={handleAddUser} className="flex flex-col gap-3 mb-6 bg-navy-900/50 p-4 rounded-xl border border-slate-700/50">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="email"
                  placeholder="E-mail de acesso"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <select
                  value={newUser.sector}
                  onChange={(e) => setNewUser({ ...newUser, sector: e.target.value })}
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                >
                  <option value="">Setor...</option>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={!newUser.name || !newUser.email || !newUser.sector || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <UserPlus size={16} />
              Adicionar Colaborador
            </button>
          </form>

          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
            <AnimatePresence>
              {users.map(user => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 p-3 bg-navy-900/40 border border-slate-700/50 rounded-lg group"
                >
                  <img src={user.avatar} className="w-8 h-8 rounded-full border border-slate-700" alt="avatar" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 font-medium truncate text-sm">{user.name}</span>
                      {user.role === 'admin' && (
                        <span title="Admin">
                          <Shield size={10} className="text-amber-400" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{user.sector}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* --- 4. Danger Zone --- */}
      <div className="mt-8 bg-red-900/10 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-500" size={24} />
          <h3 className="text-xl font-bold text-white">Zona de Perigo (Gestão Semanal)</h3>
        </div>
        <p className="text-slate-400 mb-6 max-w-2xl">
          Aqui você pode encerrar o ciclo semanal. Isso irá arquivar todas as atividades atuais e limpar o quadro para o início de uma nova semana.
        </p>

        <button
          onClick={handleCloseWeek}
          disabled={loading}
          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"
        >
          <Layers size={18} />
          Fechar Semana e Resetar Dados
        </button>
      </div>

    </motion.div>
  );
};
