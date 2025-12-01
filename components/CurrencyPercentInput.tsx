import React, { useState, useEffect } from 'react';
import Input from './Input';

interface CurrencyPercentInputProps {
    label: string;
    name: string;
    value: number | ''; // Always in Percentage
    onChange: (name: string, value: number) => void;
    credit: number;
    readOnly?: boolean;
    tooltip?: string;
    error?: string;
}

const CurrencyPercentInput: React.FC<CurrencyPercentInputProps> = ({
    label,
    name,
    value,
    onChange,
    credit,
    readOnly,
    error,
}) => {
    const [isCurrency, setIsCurrency] = useState(false);
    const [localValue, setLocalValue] = useState<string>('');

    // Update local display value when props change or mode changes
    useEffect(() => {
        const numericValue = Number(value) || 0;
        if (isCurrency) {
            // Convert % to R$
            const currencyVal = (numericValue / 100) * credit;
            setLocalValue(currencyVal.toFixed(2));
        } else {
            // Keep as %
            setLocalValue(numericValue.toString());
        }
    }, [value, isCurrency, credit]);

    const handleToggle = () => {
        setIsCurrency(!isCurrency);
    };

    return (
        <div className="relative">
            <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 border border-slate-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={() => setIsCurrency(false)}
                        className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${!isCurrency ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        %
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCurrency(true)}
                        className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${isCurrency ? 'bg-white dark:bg-slate-600 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        R$
                    </button>
                </div>
            </div>

            <Input
                label="" // Label is handled above
                name={name}
                value={localValue}
                onChange={(n, v) => {
                    const numVal = Number(v);
                    if (isCurrency) {
                        if (credit > 0) {
                            const percentVal = (numVal / credit) * 100;
                            onChange(name, percentVal);
                        } else {
                            onChange(name, 0);
                        }
                    } else {
                        onChange(name, numVal);
                    }
                    setLocalValue(String(v));
                }}
                mask={isCurrency ? 'currency' : undefined}
                type={isCurrency ? 'text' : 'number'}
                step={isCurrency ? undefined : "0.1"}
                readOnly={readOnly}
                error={error}
            />
        </div>
    );
};

export default CurrencyPercentInput;
