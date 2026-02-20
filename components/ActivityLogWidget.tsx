
import React from 'react';
import { ActivityLog, User } from '../types';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  logs: ActivityLog[];
  users: User[];
}

export const ActivityLogWidget: React.FC<Props> = ({ logs, users }) => {
  
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Se for hoje, mostra só a hora
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    // Se for anterior, mostra dia/mês
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="bg-navy-800/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4 h-full flex flex-col">
      <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
        <Clock size={18} className="text-primary" />
        Atividades Recentes
      </h3>
      <div className="overflow-y-auto flex-1 pr-2 space-y-4 custom-scrollbar">
        <AnimatePresence initial={false}>
          {logs.map((log) => {
            const user = users.find(u => u.id === log.userId);
            // Fallback para usuário deletado ou sistema
            const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=S&background=0f172a&color=cbd5e1`;
            const userName = user?.name || 'Sistema / Usuário Removido';

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-3 group"
              >
                {/* Avatar Column */}
                <div className="mt-1 flex-shrink-0">
                   <img 
                     src={avatarUrl} 
                     className="w-9 h-9 rounded-full border border-slate-700 object-cover bg-navy-900" 
                     alt="avatar" 
                     onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=?'; }}
                   />
                </div>
                
                {/* Content Column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-slate-200 text-xs truncate mr-2">{userName}</span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{formatTime(log.timestamp)}</span>
                  </div>
                  
                  <p className="text-slate-400 text-xs mt-0.5 leading-snug break-words">
                    {log.description}
                  </p>
                  
                  {/* Status Indicator Bar */}
                  <div className={`mt-1.5 h-0.5 w-8 rounded-full ${
                      log.action === 'CREATE' ? 'bg-emerald-500/50' :
                      log.action === 'DELETE' ? 'bg-rose-500/50' :
                      'bg-cyan-500/50'
                  }`}></div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-600">
             <Clock size={24} className="mb-2 opacity-50" />
             <p className="text-xs">Nenhuma atividade recente.</p>
          </div>
        )}
      </div>
    </div>
  );
};
