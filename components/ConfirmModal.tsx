import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'danger'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: (
                <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        },
        warning: {
            icon: (
                <svg className="w-12 h-12 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
        },
        info: {
            icon: (
                <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        }
    };

    const currentVariant = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onCancel}
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

                    {/* Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                        <button
                            onClick={onCancel}
                            className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium text-base"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`w-full sm:flex-1 px-4 py-3 sm:py-2.5 text-white rounded-lg transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 text-base ${currentVariant.confirmButton}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
