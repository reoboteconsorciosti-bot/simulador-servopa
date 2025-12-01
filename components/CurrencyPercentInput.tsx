import React, { useState, useEffect } from 'react';
import Input from './Input';
import Toggle from './Toggle';

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
    tooltip,
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value; // Raw value from Input (might be formatted if mask is used, but Input returns raw in onChange usually? No, Input returns event)
        // Wait, my Input component returns event.

        // Actually, let's look at how Input handles changes. 
        // It calls onChange with event.

        // We need to parse the value.
        // If currency mask is used, Input might handle it.
        // But here we are wrapping Input.

        // Let's simplify: We will use the Input's onChange to get the raw value.
        // But wait, Input with mask="currency" handles formatting.
        // If we use mask="currency", the value passed to Input should be the numeric value? Or string?
        // Usually Input with mask expects the raw value.

        // Let's assume Input handles the display. We just pass the numeric value to it?
        // No, Input takes `value` prop which is string or number.

        // If I type in the input:
        // Case 1: Currency Mode. Input has mask="currency". User types "1000". Input calls onChange with "1000" (or formatted?).
        // I need to check Input.tsx to be sure.

        // For now, I will implement the logic assuming Input returns the raw numeric string or value in e.target.value.

        let numericNewVal = Number(newVal.replace(/[^0-9.-]+/g, '')); // Simple strip

        if (isCurrency) {
            // Convert R$ to %
            // (Value / Credit) * 100
            if (credit > 0) {
                const percentVal = (numericNewVal / credit) * 100;
                onChange(name, percentVal);
            } else {
                onChange(name, 0);
            }
        } else {
            // It is %, just pass it
            onChange(name, numericNewVal);
        }

        setLocalValue(newVal);
    };

    // We need to intercept the onChange from the child Input.
    // The child Input expects `onChange: (e: React.ChangeEvent<HTMLInputElement>) => void`.
    // But wait, in SimulatorView we used `handleInputChange` which takes `(name, value)`.
    // The `Input` component in `SimulatorView` usage: `onChange={handleInputChange}`? 
    // No, `Input` usage in `SimulatorView` is `onChange={handleInputChange}` which is wrong if Input expects event.
    // Let's check SimulatorView again.
    // `const handleInputChange = (name: string, value: string | number) => { ... }`
    // `Input` usage: `<Input ... onChange={handleInputChange} ... />`
    // This implies `Input` component has a custom `onChange` signature `(name, value)`.

    // I MUST CHECK `Input.tsx` to be sure about the signature.
    return (
        <div className="relative">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${!isCurrency ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>%</span>
                    <Toggle
                        label=""
                        checked={isCurrency}
                        onChange={setIsCurrency}
                        tooltip="Alternar entre % e R$"
                    />
                    <span className={`text-xs font-bold ${isCurrency ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>R$</span>
                </div>
            </div>

            <Input
                label="" // Label is handled above
                name={name}
                value={localValue}
                onChange={(n, v) => {
                    // Re-implementing the logic here because I can't check Input.tsx right now but I recall the signature.
                    // If Input calls (name, value), then:
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
                tooltip={tooltip}
                error={error}
            />
        </div>
    );
};

export default CurrencyPercentInput;
