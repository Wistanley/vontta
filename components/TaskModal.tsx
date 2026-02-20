import React, { useState, useEffect } from 'react';
import { Task, Priority, Status, Project, Sector, User } from '../types';
import { backend } from '../services/supabaseBackend';
import { TimeInput } from './ui/TimeInput';
import { X, Copy } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  initialData?: Task | null;
  projects: Project[];
  sectors: Sector[];
  users: User[];
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

// Helper to get Today in SP Timezone as YYYY-MM-DD
const getTodayInSP = () => {
    const now = new Date();
    const brazil = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const y = brazil.getFullYear();
    const m = String(brazil.getMonth() + 1).padStart(2, '0');
    const d = String(brazil.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const TaskModal: React.FC<Props> = ({ isOpen, onClose, taskToEdit, initialData, projects, sectors, users }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    projectId: '',
    collaboratorId: backend.currentUser?.id || '',
    sector: '',
    plannedActivity: '',
    deliveredActivity: '',
    priority: Priority.MEDIUM,
    status: Status.PENDING,
    hoursDedicated: '00:00',
    notes: '',
    dueDate: getTodayInSP(),
  });

  useEffect(() => {
    if (taskToEdit) {
      // Modo Edição
      setFormData({ ...taskToEdit });
    } else if (initialData) {
      // Modo Duplicação
      setFormData({
        projectId: initialData.projectId,
        collaboratorId: backend.currentUser?.id || initialData.collaboratorId, // Atribui ao usuário atual ou mantém o original? Geralmente quem duplica assume.
        sector: initialData.sector,
        plannedActivity: `${initialData.plannedActivity} (Cópia)`,
        deliveredActivity: '', // Reseta o entregue
        priority: initialData.priority,
        status: Status.PENDING, // Reseta para pendente
        hoursDedicated: '00:00', // Reseta horas
        notes: initialData.notes,
        dueDate: initialData.dueDate,
      });
    } else {
      // Modo Criação (Reset)
      setFormData({
        projectId: '',
        collaboratorId: backend.currentUser?.id || '',
        sector: '',
        plannedActivity: '',
        deliveredActivity: '',
        priority: Priority.MEDIUM,
        status: Status.PENDING,
        hoursDedicated: '00:00',
        notes: '',
        dueDate: getTodayInSP(),
      });
    }
  }, [taskToEdit, initialData, isOpen]);

  // Logic to auto-fill Sector based on Project selection
  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    let sectorName = '';
    
    if (project) {
        const sector = sectors.find(s => s.id === project.sectorId);
        if (sector) sectorName = sector.name;
    }

    setFormData({ 
        ...formData, 
        projectId: projectId, 
        sector: sectorName 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskToEdit) {
      backend.updateTask(taskToEdit.id, formData);
    } else {
      // Create new (also handles duplication submit)
      backend.createTask(formData as Omit<Task, 'id' | 'updatedAt'>);
    }
    onClose();
  };

  const canEdit = backend.currentUser?.role === 'admin' || (taskToEdit?.collaboratorId === backend.currentUser?.id) || !taskToEdit;

  // Determine Title
  const getTitle = () => {
    if (taskToEdit) return 'Editar Atividade';
    if (initialData) return 'Duplicar Atividade';
    return 'Nova Atividade Planejada';
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={overlayVariants}
    >
      <motion.div
        className="bg-navy-800 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        variants={modalVariants}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-navy-900/50">
          <div className="flex items-center gap-2">
             {initialData && !taskToEdit && <Copy size={20} className="text-primary" />}
             <h2 className="text-xl font-semibold text-white">
               {getTitle()}
             </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Projeto</label>
              <select
                required
                disabled={!canEdit}
                value={formData.projectId}
                onChange={e => handleProjectChange(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Selecione um projeto...</option>
                {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Colaborador</label>
              <select
                disabled={!canEdit || backend.currentUser?.role !== 'admin'}
                value={formData.collaboratorId}
                onChange={e => setFormData({ ...formData, collaboratorId: e.target.value })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary outline-none"
              >
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Atividade Planejada</label>
              <input
                required
                disabled={!canEdit}
                value={formData.plannedActivity}
                onChange={e => setFormData({ ...formData, plannedActivity: e.target.value })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary outline-none"
                placeholder="Descrição da tarefa"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
              <select
                disabled={!canEdit}
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as Status })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary outline-none"
              >
                {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Prioridade</label>
              <select
                 disabled={!canEdit}
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary outline-none"
              >
                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

           <div className="grid grid-cols-3 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Data Entrega</label>
              <input
                type="date"
                disabled={!canEdit}
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary outline-none"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Horas (HH:mm)</label>
              <TimeInput
                disabled={!canEdit}
                value={formData.hoursDedicated || '00:00'}
                onChange={val => setFormData({ ...formData, hoursDedicated: val })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Setor</label>
              <input
                disabled
                value={formData.sector}
                placeholder="Automático pelo Projeto"
                className="w-full bg-navy-900/50 border border-slate-800 rounded-lg p-2.5 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Atividade Entregue (Realizado)</label>
            <textarea
              disabled={!canEdit}
              rows={2}
              value={formData.deliveredActivity}
              onChange={e => setFormData({ ...formData, deliveredActivity: e.target.value })}
              className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary outline-none resize-none"
              placeholder="O que foi efetivamente feito..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-transparent hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            {canEdit && (
              <button
                type="submit"
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105"
              >
                {taskToEdit ? 'Salvar Alterações' : 'Criar Atividade'}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
