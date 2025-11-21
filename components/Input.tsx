import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  name: string;
  onChange: (name: string, value: string | number) => void;
  mask?: 'currency';
  tooltip?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, name, value, onChange, type = 'text', mask, readOnly, tooltip, error, ...rest }) => {

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    const numericValue = inputValue.replace(/\D/g, '');
    if (numericValue === '') {
      onChange(name, ''); // Pass empty string when cleared
      return;
    }
    const valueAsNumber = Number(numericValue) / 100;
    onChange(name, valueAsNumber);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mask === 'currency') {
      handleCurrencyChange(e);
      return;
    }

    if (type === 'number') {
      if (e.target.value === '') {
        onChange(name, '');
      } else if (!isNaN(e.target.valueAsNumber)) {
        onChange(name, e.target.valueAsNumber);
      }
    } else {
      onChange(name, e.target.value);
    }
  };

  const formatCurrency = (val: string | number) => {
    if (val === '') return ''; // Don't format empty string to "R$ 0,00"
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(val));
  };

  const displayValue = mask === 'currency' ? formatCurrency(value as string) : value;

  const errorClasses = error
    ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
    : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500';

  return (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <label htmlFor={name} className="block text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {tooltip && (
          <div className="group relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="absolute bottom-full mb-2 w-60 sm:w-72 bg-slate-800 text-white text-xs sm:text-sm rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 left-1/2 -translate-x-1/2">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
            </div>
          </div>
        )}
      </div>
      <input
        id={name}
        name={name}
        type={type === 'number' && mask === 'currency' ? 'text' : type}
        value={displayValue}
        onChange={handleChange}
        readOnly={readOnly}
        className={`w-full px-4 py-3 sm:py-2.5 bg-white dark:bg-slate-900 border rounded-md focus:outline-none focus:ring-2 text-slate-900 dark:text-white transition-colors text-base min-h-[48px] sm:min-h-[44px]
          ${errorClasses}
          ${readOnly
            ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
            : 'hover:border-slate-400 dark:hover:border-slate-500'
          }`
        }
        {...rest}
      />
      {error && <p className="mt-1.5 text-sm sm:text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default Input;