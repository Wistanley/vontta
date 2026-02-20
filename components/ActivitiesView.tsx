
import React, { useState } from 'react';
import { Task, User, Project, Status } from '../types';
import { Badge } from './ui/Badge';
import { Search, Filter, Users, User as UserIcon, Copy, Trash2, CheckCircle2, FileEdit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  tasks: Task[];
  projects: Project[];
  users: User[];
  currentUser: User;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const ActivitiesView: React.FC<Props> = ({ 
  tasks, 
  projects, 
  users, 
  currentUser, 
  onEdit, 
  onDuplicate, 
  onDelete 
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterScope, setFilterScope] = useState<'ALL' | 'MINE'>('ALL');

  // Helper to resolve Project Name
  const getProjectName = (projectId: string) => {
     return projects.find(p => p.id === projectId)?.name || 'Projeto Desconhecido';
  };

  // Helper to format YYYY-MM-DD to DD/MM/YYYY without timezone shift
  const formatDate = (dateString: string) => {
      if (!dateString) return '-';
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
  };

  // Filtering Logic
  const filteredTasks = tasks.filter(t => {
    const projectName = getProjectName(t.projectId).toLowerCase();
    const matchesSearch = projectName.includes(search.toLowerCase()) || 
                          t.plannedActivity.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchesScope = filterScope === 'ALL' || t.collaboratorId === currentUser.id;

    return matchesSearch && matchesStatus && matchesScope;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
       {/* Header & Filters */}
       <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-start sm:items-center p-1">
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Buscar por projeto ou atividade..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-navy-800 border border-slate-700 text-sm rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
          
          <div className="flex gap-4 items-center">
             {/* Scope Toggle */}
             <div className="bg-navy-800 p-1 rounded-lg border border-slate-700 flex items-center">
                <button
                  onClick={() => setFilterScope('ALL')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                    filterScope === 'ALL' 
                      ? 'bg-slate-700 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Users size={14} />
                  Todas
                </button>
                <button
                  onClick={() => setFilterScope('MINE')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                    filterScope === 'MINE' 
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <UserIcon size={14} />
                  Minhas
                </button>
             </div>

             <div className="h-6 w-px bg-slate-800"></div>

             <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-navy-800 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-primary focus:border-primary block pl-9 pr-8 py-2 appearance-none outline-none cursor-pointer hover:bg-navy-700 transition-colors"
                >
                  <option value="ALL">Todos os Status</option>
                  {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
          </div>
       </div>

       {/* Table Container */}
       <div className="bg-navy-800/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-xl flex-1 min-h-0">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-navy-900/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Projeto / Colaborador</th>
                  <th className="px-6 py-4 font-medium">Atividade Planejada</th>
                  <th className="px-6 py-4 font-medium">Prioridade</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Entrega</th>
                  <th className="px-6 py-4 font-medium text-right">Horas</th>
                  <th className="px-6 py-4 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <AnimatePresence>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Nenhuma atividade encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const user = users.find(u => u.id === task.collaboratorId);
                    const isOwner = currentUser.id === task.collaboratorId || currentUser.role === 'admin';
                    const projectName = getProjectName(task.projectId);
                    
                    return (
                      <motion.tr 
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="bg-navy-900/20 hover:bg-white/[0.02] group transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 relative">
                              <img className="w-8 h-8 rounded-full border border-slate-700" src={user?.avatar} alt="" />
                              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-navy-900 ${user?.id === currentUser.id ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                            </div>
                            <div>
                              <div className="font-medium text-white">{projectName}</div>
                              <div className="text-xs text-slate-500">{user?.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-slate-300 truncate font-medium">{task.plannedActivity}</div>
                          {task.deliveredActivity && (
                            <div className="text-xs text-emerald-500/80 truncate mt-0.5 flex items-center gap-1">
                               <CheckCircle2 size={10} /> {task.deliveredActivity}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge type="priority" value={task.priority} />
                        </td>
                        <td className="px-6 py-4">
                          <Badge type="status" value={task.status} />
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                           {formatDate(task.dueDate)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                          {task.hoursDedicated}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              
                              {/* CLONE: Available to Everyone now */}
                              <button onClick={() => onDuplicate(task)} className="p-1.5 hover:bg-emerald-500/20 rounded text-emerald-400 transition-colors" title="Duplicar">
                                <Copy size={16} />
                              </button>

                              {/* EDIT/DELETE: Restricted to Owner/Admin */}
                              {isOwner && (
                                <>
                                  <button onClick={() => onEdit(task)} className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400 transition-colors" title="Editar">
                                    <FileEdit size={16} />
                                  </button>
                                  <button onClick={() => onDelete(task.id)} className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors" title="Excluir">
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-800 bg-navy-900/50 text-xs text-slate-500 flex justify-between items-center">
             <span>Mostrando {filteredTasks.length} registros</span>
             <span>Última atualização: {new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
       </div>
    </div>
  );
};
