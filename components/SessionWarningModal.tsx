import React from 'react';
import { useSession } from '../contexts/SessionContext';

const SessionWarningModal: React.FC = () => {
    const { showWarning, warningLevel, timeRemaining, extendSession, dismissWarning } = useSession();

    if (!showWarning) return null;

    // Format time remaining
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Get warning message based on level
    const getWarningMessage = () => {
        if (warningLevel === '10min') {
            return 'Sua sessão expirará em breve devido à inatividade.';
        } else if (warningLevel === '5min') {
            return 'Sua sessão está prestes a expirar! Você será desconectado em breve.';
        }
        return 'Sua sessão está prestes a expirar.';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-slideUp border border-slate-200 dark:border-slate-700">
                {/* Icon and Title */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-shrink-0 w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600 dark:text-blue-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                            Sessão Expirando
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Por segurança
                        </p>
                    </div>
                </div>

                {/* Message */}
                <div className="mb-6">
                    <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed">
                        {getWarningMessage()}
                    </p>
                </div>

                {/* Countdown Display */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 mb-6 border border-blue-200 dark:border-blue-800">
                    <div className="text-center">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Tempo Restante
                        </p>
                        <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">
                            {formattedTime}
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                            {minutes === 0 ? 'Menos de 1 minuto' : `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={extendSession}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Estender por 30 Min</span>
                    </button>
                    <button
                        onClick={dismissWarning}
                        className="sm:w-auto bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium py-3.5 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Fazer Logout
                    </button>
                </div>

                {/* Info Text */}
                <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
                    Qualquer atividade após estender a sessão resetará o timer automaticamente.
                </p>
            </div>

            <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
        </div>
    );
};

export default SessionWarningModal;
