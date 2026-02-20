
import React, { useMemo } from 'react';
import { Task, Project, Status, User } from '../types';
import { PieChart, BarChart3, TrendingUp, CheckCircle2, Users, Clock, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { backend } from '../services/supabaseBackend';

interface Props {
  tasks: Task[];
  projects: Project[];
  users: User[];
}

export const DashboardAnalytics: React.FC<Props> = ({ tasks, projects, users }) => {

  const handleCloseWeek = async () => {
    const confirmText = "FECHAMENTO SEMANAL\n\nTem certeza? Isso irá:\n1. Salvar os dados atuais no histórico\n2. Limpar todas as atividades\n3. Zerar as contagens\n\nEssa ação é irreversível.";
    if (confirm(confirmText)) {
      try {
        await backend.closeWeek();
        alert("Semana fechada com sucesso! O histórico foi salvo.");
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // --- Logic: Hours per Project ---
  const projectStats = useMemo(() => {
    const map = new Map<string, number>(); // ProjectId -> Minutes

    tasks.forEach(t => {
      if (!t.hoursDedicated) return;
      const [h, m] = t.hoursDedicated.split(':').map(Number);
      const minutes = (h * 60) + m;
      if (minutes > 0) {
        const current = map.get(t.projectId) || 0;
        map.set(t.projectId, current + minutes);
      }
    });

    // Convert to Array, Sort and Top 5
    const sorted = Array.from(map.entries())
      .map(([pid, mins]) => ({
        name: projects.find(p => p.id === pid)?.name || 'Desconhecido',
        minutes: mins,
        formatted: `${Math.floor(mins / 60)}h ${(mins % 60).toString().padStart(2, '0')}`
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    const maxMinutes = sorted[0]?.minutes || 1; // Avoid division by zero

    return { data: sorted, max: maxMinutes };
  }, [tasks, projects]);

  // --- Logic: Status Distribution (Donut) ---
  const statusStats = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return { percent: 0, completed: 0, pending: 0 };

    const completed = tasks.filter(t => t.status === Status.COMPLETED).length;
    const pending = total - completed;
    const percent = Math.round((completed / total) * 100);

    return { percent, completed, pending, total };
  }, [tasks]);

  // --- Logic: Hours per Collaborator (Fixed 44h scale) ---
  const collaboratorStats = useMemo(() => {
    const map = new Map<string, number>(); // UserId -> Minutes

    // Sum hours
    tasks.forEach(t => {
      if (!t.hoursDedicated) return;
      const [h, m] = t.hoursDedicated.split(':').map(Number);
      const minutes = (h * 60) + m;
      if (minutes > 0) {
        const current = map.get(t.collaboratorId) || 0;
        map.set(t.collaboratorId, current + minutes);
      }
    });

    const MAX_HOURS = 44;
    const MAX_MINUTES = MAX_HOURS * 60;

    const stats = users.map(user => {
      const minutes = map.get(user.id) || 0;
      // Cap percentage at 100% for visual purposes, but allow hours to show correctly
      const percentage = Math.min((minutes / MAX_MINUTES) * 100, 100);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const formatted = `${hours}h ${mins.toString().padStart(2, '0')}`;

      // Determine color based on load
      let colorClass = 'from-blue-600 to-cyan-400';
      if (hours > 44) colorClass = 'from-rose-600 to-rose-400'; // Overtime
      else if (hours > 40) colorClass = 'from-amber-500 to-orange-400'; // High load

      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        minutes,
        percentage,
        formatted,
        colorClass
      };
    }).sort((a, b) => b.minutes - a.minutes); // Show busiest first

    return { data: stats, maxLimit: MAX_HOURS };
  }, [tasks, users]);

  // SVG Helper for Donut
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (statusStats.percent / 100) * circumference;

  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 md:gap-6 mb-8 w-full">

      {/* Header Actions */}
      <div className="flex justify-end">
        <button
          onClick={handleCloseWeek}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
        >
          <Layers size={16} />
          Fechar Semana
        </button>
      </div>

      {/* Row 1: Projects & Status */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6"
      >
        {/* --- Card 1: Hours by Project (Bar Chart) --- */}
        <div className="xl:col-span-2 bg-navy-800/50 border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-primary" size={20} />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Horas por Projeto</h3>
          </div>

          <div className="space-y-4">
            {projectStats.data.length > 0 ? (
              projectStats.data.map((item, index) => (
                <div key={index} className="group">
                  <div className="flex justify-between items-end text-xs mb-1.5 gap-2">
                    <span className="text-slate-300 font-medium truncate max-w-[70%]">{item.name}</span>
                    <span className="text-slate-400 font-mono whitespace-nowrap">{item.formatted}</span>
                  </div>
                  <div className="w-full bg-navy-900 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.minutes / projectStats.max) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full group-hover:brightness-110 transition-all"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
                Sem horas registradas no período.
              </div>
            )}
          </div>
        </div>

        {/* --- Card 2: Completion Rate (Donut Chart) --- */}
        <div className="bg-navy-800/50 border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg backdrop-blur-sm flex flex-col items-center justify-center relative overflow-hidden min-h-[280px] xl:min-h-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-300"></div>

          <div className="flex items-center gap-2 mb-4 w-full">
            <PieChart className="text-emerald-400" size={20} />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Taxa de Entrega</h3>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 w-full">
            <div className="relative w-36 h-36 sm:w-40 sm:h-40">
              {/* SVG Donut */}
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Circle */}
                <circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-navy-900"
                />
                {/* Progress Circle */}
                <motion.circle
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  cx="50%"
                  cy="50%"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeLinecap="round"
                  className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                />
              </svg>

              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <span className="text-2xl sm:text-3xl font-bold tracking-tighter">{statusStats.percent}%</span>
                <span className="text-[10px] text-slate-400 uppercase font-medium">Concluído</span>
              </div>
            </div>

            <div className="w-full mt-6 grid grid-cols-2 gap-3 text-center">
              <div className="bg-navy-900/50 rounded-lg p-3 border border-slate-800">
                <span className="block text-xl font-bold text-emerald-400">{statusStats.completed}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Entregues</span>
              </div>
              <div className="bg-navy-900/50 rounded-lg p-3 border border-slate-800">
                <span className="block text-xl font-bold text-blue-400">{statusStats.pending}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pendentes</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Row 2: Collaborator Hours (New 0-44h Chart) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-navy-800/50 border border-slate-700/50 rounded-xl p-4 sm:p-6 shadow-lg backdrop-blur-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div className="flex items-center gap-2">
            <Users className="text-primary" size={20} />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Carga Horária Semanal (Máx: 44h)</h3>
          </div>
          <div className="flex items-center gap-3 text-[10px] sm:text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Normal</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Atenção</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Hora Extra</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {collaboratorStats.data.map((user) => (
            <div key={user.id} className="flex items-center gap-3 group p-3 rounded-xl bg-navy-900/30 hover:bg-navy-900/60 transition-colors border border-transparent hover:border-slate-800">
              <img src={user.avatar} className="w-10 h-10 rounded-full border border-slate-700 object-cover bg-navy-950" alt={user.name} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-sm font-medium text-slate-200 truncate pr-2">{user.name}</span>
                  <span className={`text-xs font-mono font-bold whitespace-nowrap ${user.minutes > (44 * 60) ? 'text-rose-400' : 'text-slate-400'}`}>
                    {user.formatted}
                  </span>
                </div>

                <div className="relative w-full h-2 bg-navy-950 rounded-full overflow-hidden border border-slate-800/50">
                  {/* Grid Lines for visual context (0, 22, 44) */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-800/50 z-10"></div>

                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${user.percentage}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className={`h-full rounded-full bg-gradient-to-r ${user.colorClass}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
