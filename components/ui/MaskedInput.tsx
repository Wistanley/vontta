import React, { ChangeEvent } from 'react';

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeText: (val: string) => void;
}

export const MaskedInput: React.FC<MaskedInputProps> = ({ value, onChangeText, className, ...props }) => {
  
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/[^0-9]/g, '');
    
    // Logic to enforce HH:MM format roughly
    if (input.length > 4) input = input.slice(0, 4);

    let formatted = input;
    if (input.length > 2) {
      formatted = `${input.slice(0, 2)}:${input.slice(2)}`;
    }

    onChangeText(formatted);
  };

  return (
    <input
      {...props}
      value={value}
      onChange={handleChange}
      className={`bg-navy-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 placeholder-slate-500 transition-all duration-200 ${className}`}
      maxLength={5}
    />
  );
};