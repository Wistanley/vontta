
import React, { useMemo } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface TimeInputProps {
  value: string; // Format "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, disabled, className }) => {
  
  // Generate time slots from 00:00 to 20:00 in 15min intervals
  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let h = 0; h <= 20; h++) {
       // Stop at 20:00 exactly
       const maxMins = h === 20 ? 0 : 45;
       
       for (let m = 0; m <= maxMins; m += 15) {
          const hh = h.toString().padStart(2, '0');
          const mm = m.toString().padStart(2, '0');
          options.push(`${hh}:${mm}`);
       }
    }
    return options;
  }, []);

  // Helpers for nice display label (e.g. "01:30 (1h 30m)")
  const getLabel = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      if (h === 0 && m === 0) return '00:00 (Sem horas)';
      
      let label = timeStr;
      const parts = [];
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      
      if (parts.length > 0) {
          label += `  —  ${parts.join(' ')}`;
      }
      return label;
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`flex items-center bg-navy-900 border border-slate-700 rounded-lg px-3 py-2.5 transition-all duration-200 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <Clock size={16} className="text-slate-500 mr-3 flex-shrink-0" />
        
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-transparent text-white text-sm outline-none appearance-none cursor-pointer font-mono"
        >
          {/* Handle cases where existing value isn't in the list */}
          {!timeOptions.includes(value) && value !== '' && (
             <option value={value}>{value} (Personalizado)</option>
          )}

          {timeOptions.map((time) => (
            <option key={time} value={time} className="bg-navy-900 text-slate-200">
              {getLabel(time)}
            </option>
          ))}
        </select>

        <ChevronDown size={14} className="text-slate-500 ml-2 pointer-events-none absolute right-3" />
      </div>
    </div>
  );
};
