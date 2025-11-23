import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';

// Session configuration constants
const SESSION_CONFIG = {
    TIMEOUT_DURATION: 30 * 60 * 1000,      // 30 minutes total
    WARNING_10_MIN: 20 * 60 * 1000,        // Warning at 20 min (10 min remaining)
    WARNING_5_MIN: 25 * 60 * 1000,         // Warning at 25 min (5 min remaining)
    EXTENSION_DURATION: 30 * 60 * 1000,    // Extension adds 30 minutes
    ACTIVITY_EVENTS: ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'],
    STORAGE_KEY: 'sim-pro-last-activity'
};

interface SessionContextType {
    timeRemaining: number;
    showWarning: boolean;
    warningLevel: '10min' | '5min' | null;
    extendSession: () => void;
    dismissWarning: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within SessionProvider');
    }
    return context;
};

interface SessionProviderProps {
    children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const toast = useToast();

    const [timeRemaining, setTimeRemaining] = useState(SESSION_CONFIG.TIMEOUT_DURATION);
    const [showWarning, setShowWarning] = useState(false);
    const [warningLevel, setWarningLevel] = useState<'10min' | '5min' | null>(null);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());
    const hasShown10MinWarning = useRef(false);
    const hasShown5MinWarning = useRef(false);

    // Clear all timers
    const clearAllTimers = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }, []);

    // Handle session expiration
    const handleSessionExpired = useCallback(() => {
        clearAllTimers();
        setShowWarning(false);
        localStorage.removeItem(SESSION_CONFIG.STORAGE_KEY);
        toast.error('Sua sessão expirou por inatividade. Faça login novamente.');
        logout();
    }, [clearAllTimers, logout, toast]);

    // Update last activity timestamp
    const updateLastActivity = useCallback(() => {
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem(SESSION_CONFIG.STORAGE_KEY, now.toString());
    }, []);

    // Start countdown interval for warning modal
    const startCountdown = useCallback(() => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        countdownIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current;
            const remaining = SESSION_CONFIG.TIMEOUT_DURATION - elapsed;

            if (remaining <= 0) {
                handleSessionExpired();
            } else {
                setTimeRemaining(remaining);
            }
        }, 1000); // Update every second
    }, [handleSessionExpired]);

    // Reset session timer
    const resetTimer = useCallback(() => {
        clearAllTimers();
        updateLastActivity();
        setShowWarning(false);
        setWarningLevel(null);
        setTimeRemaining(SESSION_CONFIG.TIMEOUT_DURATION);
        hasShown10MinWarning.current = false;
        hasShown5MinWarning.current = false;

        // Set timeout for session expiration
        timeoutRef.current = setTimeout(() => {
            handleSessionExpired();
        }, SESSION_CONFIG.TIMEOUT_DURATION);

        // Set timeout for 10-minute warning
        warningTimeoutRef.current = setTimeout(() => {
            if (!hasShown10MinWarning.current) {
                hasShown10MinWarning.current = true;
                setWarningLevel('10min');
                setShowWarning(true);
                startCountdown();
            }
        }, SESSION_CONFIG.WARNING_10_MIN);

        // Set timeout for 5-minute warning
        setTimeout(() => {
            if (!hasShown5MinWarning.current && !showWarning) {
                hasShown5MinWarning.current = true;
                setWarningLevel('5min');
                setShowWarning(true);
                startCountdown();
            }
        }, SESSION_CONFIG.WARNING_5_MIN);
    }, [clearAllTimers, updateLastActivity, handleSessionExpired, startCountdown, showWarning]);

    // Handle user activity
    const handleActivity = useCallback(() => {
        // Only reset if not showing warning (to avoid dismissing warning on accidental activity)
        if (!showWarning) {
            resetTimer();
        }
    }, [resetTimer, showWarning]);

    // Extend session
    const extendSession = useCallback(() => {
        toast.success('Sessão estendida por mais 30 minutos!');
        resetTimer();
    }, [resetTimer, toast]);

    // Dismiss warning (user wants to logout)
    const dismissWarning = useCallback(() => {
        clearAllTimers();
        setShowWarning(false);
        localStorage.removeItem(SESSION_CONFIG.STORAGE_KEY);
        logout();
    }, [clearAllTimers, logout]);

    // Initialize session on mount
    useEffect(() => {
        if (!user) {
            clearAllTimers();
            return;
        }

        // Check if session expired while page was closed
        const lastActivity = localStorage.getItem(SESSION_CONFIG.STORAGE_KEY);
        if (lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity);
            if (elapsed >= SESSION_CONFIG.TIMEOUT_DURATION) {
                handleSessionExpired();
                return;
            }
        }

        // Start session timer
        resetTimer();

        // Add activity listeners
        SESSION_CONFIG.ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Listen for storage changes (multi-tab sync)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === SESSION_CONFIG.STORAGE_KEY && e.newValue) {
                lastActivityRef.current = parseInt(e.newValue);
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Cleanup
        return () => {
            clearAllTimers();
            SESSION_CONFIG.ACTIVITY_EVENTS.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [user, resetTimer, handleActivity, handleSessionExpired, clearAllTimers]);

    const value: SessionContextType = {
        timeRemaining,
        showWarning,
        warningLevel,
        extendSession,
        dismissWarning
    };

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
};
