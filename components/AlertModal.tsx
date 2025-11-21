import React from 'react';

interface AlertModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
    variant?: 'success' | 'error' | 'warning' | 'info';
}

export default function AlertModal({
    isOpen,
    title,
    message,
    onClose,
    variant = 'info'
}: AlertModalProps) {
    if (!isOpen) return null;

    const variantStyles = {
        success: {
            icon: (
                <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
        },
        error: {
            icon: (
                <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        },
        warning: {
            icon: (
                <svg className="w-12 h-12 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
        },
        info: {
            icon: (
                <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        }
    };

    const currentVariant = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="relative bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md p-6 transform transition-all">
                    {/* Icon */}
                    {currentVariant.icon}

                    {/* Title */}
                    <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
                        {message}
                    </p>

                    {/* Button */}
                    <button
                        onClick={onClose}
                        className={`w-full px-4 py-3 sm:py-2.5 text-white rounded-lg transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 text-base ${currentVariant.button}`}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
