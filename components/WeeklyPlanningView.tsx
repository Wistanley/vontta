
import React, { useState } from 'react';
import { Task, Project, Status, Priority } from '../types';
import { backend } from '../services/supabaseBackend';
import { CalendarDays, CheckCircle2, Circle, Plus, AlertCircle, Briefcase, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  tasks: Task[];
  projects: Project[];
  currentUser: { id: string };
}

export const WeeklyPlanningView: React.FC<Props> = ({ tasks, projects, currentUser }) => {
  const [addingToDate, setAddingToDate] = useState<string | null>(null);
  
  // Drag and Drop State
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  
  // Quick Add State
  const [quickProjectId, setQuickProjectId] = useState('');
  const [quickActivity, setQuickActivity] = useState('');

  // Helper to get days of current week (Mon-Fri) respecting Sao Paulo Timezone
  const getWeekDays = () => {
    // 1. Get "Now" in Sao Paulo context
    const now = new Date();
    // Create a date object that represents the time in SP (ignoring the browser's actual timezone offset for a moment to get the correct 'day' value)
    const brazilDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    
    // 2. Calculate distance to Monday
    // getDay(): 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const currentDay = brazilDate.getDay();
    
    // If Sunday (0), we consider it the end of the week, so Monday was 6 days ago.
    // If Monday (1), diff is 0.
    // If Tuesday (2), diff is -1 (Monday was yesterday).
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(brazilDate);
    monday.setDate(brazilDate.getDate() + diffToMonday);

    const week: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      
      // Manual formatting to YYYY-MM-DD to avoid UTC conversion shifts
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      week.push(`${year}-${month}-${day}`);
    }
    return week;
  };

  const weekDays = getWeekDays();
  const weekDayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  const getTasksForDate = (date: string) => {
    return tasks.filter(t => 
      t.dueDate === date && 
      (t.collaboratorId === currentUser.id) // Only show my tasks for planning
    );
  };

  const handleQuickAdd = async (date: string) => {
    if (!quickProjectId || !quickActivity.trim()) return;

    try {
        // Resolve Sector
        const project = projects.find(p => p.id === quickProjectId);
        const sectors = backend.getSectors();
        const sector = sectors.find(s => s.id === project?.sectorId)?.name || '';

        await backend.createTask({
          projectId: quickProjectId,
          collaboratorId: currentUser.id,
          sector: sector,
          plannedActivity: quickActivity,
          deliveredActivity: '',
          priority: Priority.MEDIUM,
          status: Status.PENDING,
          hoursDedicated: '00:00',
          notes: '',
          dueDate: date,
        });

        // Reset
        setQuickActivity('');
        // Keep Project ID selected for convenience
    } catch (err: any) {
        alert(err.message);
    }
  };

  const toggleCheck = async (id: string) => {
    try {
        await backend.toggleTaskCompletion(id);
    } catch (err: any) {
        alert(err.message);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (date: string) => {
    setActiveDropZone(date);
  };

  const handleDragLeave = () => {
    // setActiveDropZone(null); // Optional: keeping it strictly on drop usually feels better or using a debounce
  };

  const handleDrop = async (e: React.DragEvent, newDate: string) => {
    e.preventDefault();
    setActiveDropZone(null);
    const taskId = e.dataTransfer.getData("taskId");
    
    if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        // Only update if date actually changed
        if (task && task.dueDate !== newDate) {
             try {
                await backend.updateTask(taskId, { dueDate: newDate });
             } catch (err: any) {
                console.error("Failed to move task", err);
             }
        }
    }
  };


  // Helper for Display Date (DD/MM) handling timezone correctly for display
  const formatDisplayDate = (isoDate: string) => {
     const [year, month, day] = isoDate.split('-').map(Number);
     // Create date using local arguments to avoid UTC shift
     const date = new Date(year, month - 1, day); 
     return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Helper for Header Date Range
  const headerDateRange = () => {
     if(weekDays.length === 0) return '';
     const start = formatDisplayDate(weekDays[0]);
     const end = formatDisplayDate(weekDays[4]);
     return `${start} - ${end}`;
  };

  // Determine "Today" in YYYY-MM-DD based on SP time for highlighting
  const getTodayISO = () => {
    const now = new Date();
    const brazil = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const y = brazil.getFullYear();
    const m = String(brazil.getMonth() + 1).padStart(2, '0');
    const d = String(brazil.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const todayISO = getTodayISO();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 h-full flex flex-col overflow-hidden"
    >
      <header className="mb-6 flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-3">
             <CalendarDays className="text-primary" size={28} />
             Planejamento Semanal
           </h2>
           <p className="text-slate-400 mt-1 text-sm">Arraste as tarefas entre os dias para reorganizar sua semana.</p>
        </div>
        <div className="text-right">
           <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Semana (Seg-Sexta)</p>
           <p className="text-white font-mono">{headerDateRange()}</p>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto custom-scrollbar pb-4">
        <div className="flex gap-4 min-w-[1200px] h-full">
          {weekDays.map((date, index) => {
            const dayTasks = getTasksForDate(date);
            const isToday = todayISO === date;
            const isAdding = addingToDate === date;
            const isDropActive = activeDropZone === date;

            return (
              <div 
                key={date} 
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(date)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, date)}
                className={`flex-1 flex flex-col rounded-xl border transition-colors duration-200 ${
                    isDropActive 
                      ? 'bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                      : isToday 
                        ? 'bg-navy-800/80 border-primary/30 shadow-[0_0_20px_rgba(14,165,233,0.05)]' 
                        : 'bg-navy-900/40 border-slate-800/60'
                }`}
              >
                {/* Column Header */}
                <div className={`p-4 border-b ${isToday ? 'border-primary/20 bg-primary/5' : 'border-slate-800/60'} rounded-t-xl select-none pointer-events-none`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-slate-400'}`}>
                      {weekDayNames[index]}
                    </span>
                    {isToday && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-bold">HOJE</span>}
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{formatDisplayDate(date)}</span>
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  <AnimatePresence>
                    {dayTasks.map(task => {
                       const project = projects.find(p => p.id === task.projectId);
                       const isDone = task.status === Status.COMPLETED;

                       return (
                         <motion.div
                           key={task.id}
                           layoutId={task.id} // Enable smooth transition between columns
                           draggable={!isDone} // Only pending/in-progress tasks can be dragged logic (optional, but good UX)
                           onDragStart={(e) => {
                               // Must cast type because framer-motion types are strict
                               handleDragStart(e as unknown as React.DragEvent, task.id)
                           }}
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.9 }}
                           whileHover={{ scale: 1.02 }}
                           whileDrag={{ scale: 1.05, cursor: 'grabbing', zIndex: 50 }}
                           className={`p-3 rounded-lg border transition-all group relative cursor-grab active:cursor-grabbing ${
                             isDone 
                               ? 'bg-navy-900/30 border-slate-800 opacity-60 pointer-events-none' // Disable drag for completed
                               : 'bg-navy-800 border-slate-700 hover:border-slate-500 hover:shadow-lg'
                           }`}
                         >
                           {/* Drag Handle Icon (Visual Cue) */}
                           {!isDone && (
                             <div className="absolute right-2 top-2 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical size={14} />
                             </div>
                           )}

                           <div className="flex items-start gap-3">
                             <button 
                               onClick={() => toggleCheck(task.id)}
                               className={`mt-0.5 flex-shrink-0 transition-colors pointer-events-auto ${isDone ? 'text-emerald-500' : 'text-slate-600 hover:text-primary'}`}
                             >
                               {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                             </button>
                             
                             <div className="flex-1 min-w-0 pr-4">
                               <p className={`text-sm font-medium leading-snug break-words select-none ${isDone ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-200'}`}>
                                 {task.plannedActivity}
                               </p>
                               <div className="flex items-center gap-1.5 mt-2 select-none">
                                  <span className="inline-flex items-center gap-1 text-[10px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 max-w-full truncate">
                                    <Briefcase size={10} />
                                    <span className="truncate">{project?.name || 'Geral'}</span>
                                  </span>
                                  {task.priority === Priority.HIGH || task.priority === Priority.CRITICAL ? (
                                     <AlertCircle size={12} className="text-amber-500" />
                                  ) : null}
                               </div>
                             </div>
                           </div>
                         </motion.div>
                       );
                    })}
                  </AnimatePresence>
                  
                  {isDropActive && dayTasks.length === 0 && (
                     <div className="h-full flex items-center justify-center border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
                        <span className="text-primary/50 text-xs font-medium">Solte aqui para mover</span>
                     </div>
                  )}
                </div>

                {/* Add Button / Form */}
                <div className="p-3 border-t border-slate-800/60 bg-navy-900/30 rounded-b-xl">
                   {isAdding ? (
                     <div className="bg-navy-800 border border-slate-700 rounded-lg p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <select
                          value={quickProjectId}
                          onChange={(e) => setQuickProjectId(e.target.value)}
                          className="w-full bg-navy-900 border border-slate-600 text-xs text-white rounded mb-2 p-1.5 focus:border-primary outline-none"
                          autoFocus
                        >
                          <option value="">Selecione o Projeto...</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <textarea
                          placeholder="O que será feito?"
                          value={quickActivity}
                          onChange={(e) => setQuickActivity(e.target.value)}
                          onKeyDown={(e) => {
                             if(e.key === 'Enter' && !e.shiftKey) {
                               e.preventDefault();
                               handleQuickAdd(date);
                             }
                          }}
                          className="w-full bg-navy-900 border border-slate-600 text-sm text-white rounded p-2 focus:border-primary outline-none resize-none h-16 mb-2"
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setAddingToDate(null)}
                            className="text-xs text-slate-400 hover:text-white px-2 py-1"
                          >
                            Cancelar
                          </button>
                          <button 
                             onClick={() => handleQuickAdd(date)}
                             disabled={!quickProjectId || !quickActivity.trim()}
                             className="text-xs bg-primary hover:bg-sky-400 text-white px-3 py-1 rounded font-medium disabled:opacity-50"
                          >
                            Adicionar
                          </button>
                        </div>
                     </div>
                   ) : (
                     <button 
                       onClick={() => setAddingToDate(date)}
                       className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-slate-700 text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium"
                     >
                       <Plus size={16} />
                       Adicionar
                     </button>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
