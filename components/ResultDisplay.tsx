
import React from 'react';

interface ResultDisplayProps {
  label: string;
  value: string | number;
  currency?: boolean;
  className?: string;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ label, value, currency = false, className = '' }) => {
  const formattedValue = currency 
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
    : value;

  return (
    <div className={`flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-white">{formattedValue}</span>
    </div>
  );
};

export default ResultDisplay;
