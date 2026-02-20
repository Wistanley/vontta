import React from 'react';
import { Priority, Status } from '../../types';

interface BadgeProps {
  type: 'priority' | 'status' | 'sector';
  value: string;
}

const getPriorityColor = (p: string) => {
  switch (p) {
    case Priority.CRITICAL: return 'bg-red-500/20 text-red-400 border-red-500/30';
    case Priority.HIGH: return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case Priority.MEDIUM: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case Priority.LOW: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

const getStatusColor = (s: string) => {
  switch (s) {
    case Status.COMPLETED: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case Status.IN_PROGRESS: return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case Status.BLOCKED: return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

export const Badge: React.FC<BadgeProps> = ({ type, value }) => {
  let className = "px-2.5 py-0.5 rounded-full text-xs font-medium border ";
  
  if (type === 'priority') className += getPriorityColor(value);
  else if (type === 'status') className += getStatusColor(value);
  else className += 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span className={className}>
      {value}
    </span>
  );
};