
import React, { useState, useEffect } from 'react';
import { BoardTask, BoardStatus, Subtask, User } from '../types';
import { backend } from '../services/supabaseBackend';
import { X, Plus, Trash2, CheckCircle2, Circle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: BoardTask | null;
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

export const BoardTaskModal: React.FC<Props> = ({ isOpen, onClose, taskToEdit, users }) => {
  const [formData, setFormData] = useState<Partial<BoardTask>>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    memberIds: [],
    status: 'TODO',
    subtasks: []
  });

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setFormData({ ...taskToEdit });
    } else {
      setFormData({
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        memberIds: [],
        status: 'TODO',
        subtasks: []
      });
    }
  }, [taskToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskToEdit) {
      backend.updateBoardTask(taskToEdit.id, formData);
    } else {
      backend.createBoardTask(formData as Omit<BoardTask, 'id' | 'updatedAt'>);
    }
    onClose();
  };

  // Subtask Handlers
  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle,
      completed: false
    };
    setFormData(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), newSubtask] }));
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (id: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks?.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    }));
  };

  const removeSubtask = (id: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks?.filter(s => s.id !== id)
    }));
  };

  // Member Handlers
  const toggleMember = (userId: string) => {
    setFormData(prev => {
      const current = prev.memberIds || [];
      if (current.includes(userId)) {
        return { ...prev, memberIds: current.filter(id => id !== userId) };
      } else {
        return { ...prev, memberIds: [...current, userId] };
      }
    });
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
        className="bg-navy-800 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        variants={modalVariants}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-navy-900/50">
          <h2 className="text-xl font-semibold text-white">
            {taskToEdit ? 'Editar Tarefa do Quadro' : 'Nova Tarefa do Quadro'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-6">
          <form id="boardTaskForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title & Status */}
            <div className="flex flex-col md:flex-row gap-4">
               <div className="flex-1">
                 <label className="block text-sm font-medium text-slate-400 mb-1">Título</label>
                 <input
                   required
                   value={formData.title}
                   onChange={e => setFormData({ ...formData, title: e.target.value })}
                   className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                   placeholder="Ex: Refatorar módulo de login"
                 />
               </div>
               <div className="w-full md:w-1/3">
                 <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                 <select
                   value={formData.status}
                   onChange={e => setFormData({ ...formData, status: e.target.value as BoardStatus })}
                   className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary outline-none"
                 >
                   <option value="TODO">A Fazer</option>
                   <option value="DOING">Em Progresso</option>
                   <option value="DONE">Concluído</option>
                   <option value="CANCELED">Cancelado</option>
                 </select>
               </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                   <Calendar size={14} /> Data Início
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                   <Calendar size={14} /> Data Término
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Descrição</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-primary outline-none resize-none"
                placeholder="Detalhes da tarefa..."
              />
            </div>

            {/* Members Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Membros Envolvidos</label>
              <div className="flex flex-wrap gap-2">
                {users.map(user => {
                  const isSelected = formData.memberIds?.includes(user.id);
                  return (
                    <button
                      type="button"
                      key={user.id}
                      onClick={() => toggleMember(user.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                         isSelected 
                           ? 'bg-primary/20 border-primary text-primary' 
                           : 'bg-navy-900 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <img src={user.avatar} className="w-5 h-5 rounded-full" alt="" />
                      <span className="text-xs font-medium">{user.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subtasks */}
            <div className="bg-navy-900/40 p-4 rounded-xl border border-slate-800">
               <label className="block text-sm font-medium text-slate-300 mb-3">Subtarefas</label>
               
               <div className="flex gap-2 mb-3">
                 <input 
                    type="text" 
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                    placeholder="Nova subtarefa..."
                    className="flex-1 bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                 />
                 <button 
                   type="button" 
                   onClick={addSubtask}
                   className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg"
                 >
                   <Plus size={18} />
                 </button>
               </div>

               <div className="space-y-2">
                 {formData.subtasks?.map(sub => (
                   <div key={sub.id} className="flex items-center gap-3 group p-2 rounded hover:bg-navy-900/50">
                      <button type="button" onClick={() => toggleSubtask(sub.id)} className={`${sub.completed ? 'text-emerald-500' : 'text-slate-500'}`}>
                         {sub.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <span className={`flex-1 text-sm ${sub.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                        {sub.title}
                      </span>
                      <button type="button" onClick={() => removeSubtask(sub.id)} className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                   </div>
                 ))}
                 {(!formData.subtasks || formData.subtasks.length === 0) && (
                   <p className="text-xs text-slate-500 text-center py-2 italic">Nenhuma subtarefa adicionada.</p>
                 )}
               </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-navy-900/50 flex justify-end gap-3">
           <button
             onClick={onClose}
             className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-transparent hover:bg-slate-800 rounded-lg transition-colors"
           >
             Cancelar
           </button>
           <button
             form="boardTaskForm"
             type="submit"
             className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg shadow-lg shadow-blue-500/20 transition-all"
           >
             {taskToEdit ? 'Salvar Alterações' : 'Criar Tarefa'}
           </button>
        </div>

      </motion.div>
    </motion.div>
  );
};
