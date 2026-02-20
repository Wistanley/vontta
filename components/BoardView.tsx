
import React, { useState } from 'react';
import { BoardTask, BoardStatus, User } from '../types';
import { backend } from '../services/supabaseBackend';
import { BoardTaskModal } from './BoardTaskModal';
import { Plus, Calendar, CheckSquare, Edit2, Trash2, Kanban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  tasks: BoardTask[];
  users: User[];
}

export const BoardView: React.FC<Props> = ({ tasks, users }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<BoardTask | null>(null);
  
  // State to track visual feedback during drag
  const [activeDropZone, setActiveDropZone] = useState<BoardStatus | null>(null);

  const columns: { id: BoardStatus; title: string; color: string }[] = [
    { id: 'TODO', title: 'A Fazer', color: 'bg-slate-500' },
    { id: 'DOING', title: 'Em Progresso', color: 'bg-blue-500' },
    { id: 'DONE', title: 'Concluído', color: 'bg-emerald-500' },
    { id: 'CANCELED', title: 'Cancelado', color: 'bg-rose-500' },
  ];

  const handleCreate = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEdit = (task: BoardTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir esta tarefa do quadro?')) {
      backend.deleteBoardTask(id);
    }
  };

  const getProgress = (task: BoardTask) => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(s => s.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const formatDate = (dateStr: string) => {
     const [y, m, d] = dateStr.split('-');
     return `${d}/${m}`;
  };

  // --- Drag and Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (status: BoardStatus) => {
    setActiveDropZone(status);
  };

  const handleDragLeave = () => {
    // Optional: could debounce clearing to prevent flickering
    // setActiveDropZone(null); 
  };

  const handleDrop = (e: React.DragEvent, newStatus: BoardStatus) => {
    e.preventDefault();
    setActiveDropZone(null);
    const taskId = e.dataTransfer.getData("taskId");
    
    if (taskId) {
        // Find task to ensure we aren't dropping on same status (optional optimization)
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            backend.updateBoardTask(taskId, { status: newStatus });
        }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="mb-6 flex justify-between items-center px-1">
         <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
               <Kanban className="text-primary" size={28} />
               Quadro de Tarefas
            </h2>
            <p className="text-slate-400 mt-1 text-sm">Gerencie o fluxo de trabalho da equipe visualmente.</p>
         </div>
         <button 
           onClick={handleCreate}
           className="bg-primary hover:bg-sky-400 text-white px-4 py-2 rounded-lg shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all font-medium text-sm"
         >
           <Plus size={18} />
           Nova Tarefa
         </button>
      </header>

      <div className="flex-1 overflow-x-auto custom-scrollbar pb-2">
         <div className="flex gap-6 h-full min-w-[1300px]">
            {columns.map(col => {
               const colTasks = tasks.filter(t => t.status === col.id);
               const isOver = activeDropZone === col.id;

               return (
                  <div 
                    key={col.id} 
                    className={`flex-1 flex flex-col rounded-xl border transition-colors duration-200 max-w-sm ${
                        isOver 
                        ? 'bg-navy-800/80 border-primary/50 shadow-[0_0_15px_rgba(14,165,233,0.15)]' 
                        : 'bg-navy-900/40 border-slate-800/60'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter(col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                     {/* Column Header */}
                     <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 backdrop-blur-sm rounded-t-xl z-10">
                        <div className="flex items-center gap-2">
                           <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                           <h3 className="font-semibold text-slate-200">{col.title}</h3>
                           <span className="bg-navy-800 text-slate-400 text-xs px-2 py-0.5 rounded-full border border-slate-700">{colTasks.length}</span>
                        </div>
                     </div>

                     {/* Column Content */}
                     <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-[100px]">
                        <AnimatePresence>
                           {colTasks.map(task => {
                              const progress = getProgress(task);
                              const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
                              const totalSubtasks = task.subtasks?.length || 0;

                              return (
                                 <motion.div
                                    key={task.id}
                                    layoutId={task.id} // Enables smooth transition between columns
                                    draggable={true}
                                    onDragStart={(e) => {
                                        // Need to cast to any/dragEvent because React types for framer motion component can be strict
                                        handleDragStart(e as unknown as React.DragEvent, task.id);
                                    }}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -2 }}
                                    whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing' }}
                                    className="bg-navy-800 border border-slate-700 rounded-lg p-4 shadow-sm hover:border-slate-500 hover:shadow-md transition-all group cursor-grab active:cursor-grabbing relative z-0"
                                    onClick={() => handleEdit(task)}
                                 >
                                    <h4 className="font-medium text-slate-200 mb-2 line-clamp-2 select-none">{task.title}</h4>
                                    
                                    {task.description && (
                                       <p className="text-xs text-slate-400 mb-3 line-clamp-2 select-none">{task.description}</p>
                                    )}

                                    {/* Stats Row */}
                                    <div className="flex items-center justify-between mb-3">
                                       {/* Members */}
                                       <div className="flex -space-x-2">
                                          {task.memberIds?.slice(0, 3).map(mid => {
                                             const user = users.find(u => u.id === mid);
                                             return (
                                                <img 
                                                   key={mid} 
                                                   src={user?.avatar} 
                                                   title={user?.name}
                                                   className="w-6 h-6 rounded-full border border-navy-800 bg-navy-900 object-cover pointer-events-none" 
                                                />
                                             );
                                          })}
                                          {(task.memberIds?.length || 0) > 3 && (
                                             <div className="w-6 h-6 rounded-full bg-navy-700 border border-navy-800 flex items-center justify-center text-[8px] text-white pointer-events-none">
                                                +{task.memberIds!.length - 3}
                                             </div>
                                          )}
                                       </div>

                                       {/* Date */}
                                       <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-navy-900/50 px-1.5 py-0.5 rounded border border-slate-700 select-none">
                                          <Calendar size={10} />
                                          {formatDate(task.endDate)}
                                       </div>
                                    </div>

                                    {/* Subtasks Progress */}
                                    {totalSubtasks > 0 && (
                                       <div className="mt-2 select-none">
                                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                             <div className="flex items-center gap-1">
                                                <CheckSquare size={10} />
                                                <span>{completedSubtasks}/{totalSubtasks}</span>
                                             </div>
                                             <span>{progress}%</span>
                                          </div>
                                          <div className="h-1.5 w-full bg-navy-900 rounded-full overflow-hidden">
                                             <div 
                                                className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} 
                                                style={{ width: `${progress}%` }}
                                             ></div>
                                          </div>
                                       </div>
                                    )}
                                    
                                    <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-slate-700/50">
                                       <button 
                                          onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                                       >
                                          <Trash2 size={14} />
                                       </button>
                                       <button 
                                          onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                                          className="text-slate-500 hover:text-primary transition-colors p-1"
                                       >
                                          <Edit2 size={14} />
                                       </button>
                                    </div>

                                 </motion.div>
                              );
                           })}
                        </AnimatePresence>
                        
                        {/* Drop Zone Placeholder */}
                         {isOver && colTasks.length === 0 && (
                            <div className="h-24 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center bg-primary/5">
                               <p className="text-primary/50 text-xs">Soltar aqui</p>
                            </div>
                         )}
                     </div>
                  </div>
               );
            })}
         </div>
      </div>

      <BoardTaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        taskToEdit={editingTask}
        users={users}
      />
    </div>
  );
};
