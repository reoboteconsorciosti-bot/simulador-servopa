import React from 'react';

interface Option {
    value: string | number;
    label: string;
}

interface SegmentedControlProps {
    options: Option[];
    value: string | number;
    onChange: (value: any) => void;
    name?: string;
    label?: string;
    tooltip?: string;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange, label, tooltip }) => {
    return (
        <div className="mb-4">
            {label && (
                <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        {label}
                    </label>
                    {tooltip && (
                        <div className="group relative">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-slate-800 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                {tooltip}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {options.map((option) => {
                    const isSelected = option.value === value;
                    return (
                        <button
                            key={String(option.value)}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${isSelected
                                    ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SegmentedControl;
