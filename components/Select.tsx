import React from 'react';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  name: string;
  options: { value: string | number; label: string }[];
  onChange: (name: string, value: string | number) => void;
  tooltip?: string;
}

const Select: React.FC<SelectProps> = ({ label, name, value, onChange, options, tooltip, ...rest }) => {

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    // Check if the original option value was a number and convert it back
    const originalOption = options.find(o => String(o.value) === selectedValue);
    const isNumeric = typeof originalOption?.value === 'number';
    onChange(name, isNumeric ? Number(selectedValue) : selectedValue);
  };

  return (
    <div>
      <div className="flex items-center space-x-2 mb-1">
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {tooltip && (
          <div className="group relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="absolute bottom-full mb-2 w-60 bg-slate-800 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
            </div>
          </div>
        )}
      </div>
      <select
        id={name}
        name={name}
        value={value}
        onChange={handleSelectChange}
        className="w-full px-4 py-3 sm:py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white min-h-[48px] sm:min-h-[44px]"
        {...rest}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;