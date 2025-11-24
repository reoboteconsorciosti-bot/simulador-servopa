import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';

// Session configuration
const SESSION_CONFIG = {
    TIMEOUT_DURATION: 30 * 60 * 1000,      // 30 minutes total
    WARNING_10_MIN: 10 * 60 * 1000,        // Warning when 10 min remaining
    WARNING_5_MIN: 5 * 60 * 1000,          // Warning when 5 min remaining
    EXTENSION_DURATION: 30 * 60 * 1000,    // Extension adds 30 minutes
    ACTIVITY_EVENTS: ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'],
    STORAGE_KEY_EXPIRES: 'sim-pro-session-expires-at',
    THROTTLE_MS: 30 * 1000 // Only write to storage every 30s to avoid perf issues
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

    // State
    const [timeRemaining, setTimeRemaining] = useState<number>(() => {
        const stored = localStorage.getItem(SESSION_CONFIG.STORAGE_KEY_EXPIRES);
        if (stored) {
            const remaining = parseInt(stored, 10) - Date.now();
            // If expired or invalid, return default (it will be handled by effect)
            if (isNaN(remaining)) return SESSION_CONFIG.TIMEOUT_DURATION;
            return Math.max(0, remaining);
        }
        return SESSION_CONFIG.TIMEOUT_DURATION;
    });
    const [showWarning, setShowWarning] = useState(false);
    const [warningLevel, setWarningLevel] = useState<'10min' | '5min' | null>(null);

    // Refs for throttling and intervals
    const lastUpdateRef = useRef<number>(Date.now());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to get expiration time from storage
    const getExpirationTime = useCallback(() => {
        const stored = localStorage.getItem(SESSION_CONFIG.STORAGE_KEY_EXPIRES);
        return stored ? parseInt(stored, 10) : null;
    }, []);

    // Helper to set expiration time (updates storage)
    const setExpirationTime = useCallback((timestamp: number) => {
        localStorage.setItem(SESSION_CONFIG.STORAGE_KEY_EXPIRES, timestamp.toString());
    }, []);

    // Initialize session (or reset)
    const resetSession = useCallback(() => {
        const newExpiresAt = Date.now() + SESSION_CONFIG.TIMEOUT_DURATION;
        setExpirationTime(newExpiresAt);
        setTimeRemaining(SESSION_CONFIG.TIMEOUT_DURATION);
        setShowWarning(false);
        setWarningLevel(null);
    }, [setExpirationTime]);

    // Handle session expiration
    const handleSessionExpired = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        localStorage.removeItem(SESSION_CONFIG.STORAGE_KEY_EXPIRES);
        setShowWarning(false);
        toast.error('Sua sessão expirou por inatividade. Faça login novamente.');
        logout();
    }, [logout, toast]);

    // Main polling loop (runs every 1s)
    useEffect(() => {
        if (!user) return;

        // If no expiration set, set it now
        if (!getExpirationTime()) {
            resetSession();
        }

        const tick = () => {
            const expiresAt = getExpirationTime();
            if (!expiresAt) return;

            const now = Date.now();
            const remaining = expiresAt - now;

            // Update state
            setTimeRemaining(Math.max(0, remaining));

            // Check for expiration
            if (remaining <= 0) {
                handleSessionExpired();
                return;
            }

            // Check for warnings
            if (remaining <= SESSION_CONFIG.WARNING_5_MIN) {
                if (warningLevel !== '5min') {
                    setWarningLevel('5min');
                    setShowWarning(true);
                }
            } else if (remaining <= SESSION_CONFIG.WARNING_10_MIN) {
                if (warningLevel !== '10min') {
                    setWarningLevel('10min');
                    setShowWarning(true);
                }
            } else {
                // Clear warning if we have enough time (e.g. after extension)
                if (showWarning) {
                    setShowWarning(false);
                    setWarningLevel(null);
                }
            }
        };

        // Run immediately to avoid flash
        tick();

        // Start interval
        intervalRef.current = setInterval(tick, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user, getExpirationTime, handleSessionExpired, resetSession, warningLevel, showWarning]);

    // Handle user activity (Throttled)
    const handleActivity = useCallback(() => {
        if (!user) return;

        // Don't extend if warning is showing (user must explicitly click extend)
        // BUT we should allow activity to extend if it's just normal usage before warning
        // Wait, the requirement says "Qualquer atividade após estender a sessão resetará o timer".
        // Usually, if warning is shown, we want explicit action.
        // If warning is NOT shown, activity auto-extends.

        if (showWarning) return;

        const now = Date.now();
        // Throttle updates to avoid spamming localStorage
        if (now - lastUpdateRef.current > SESSION_CONFIG.THROTTLE_MS) {
            const newExpiresAt = now + SESSION_CONFIG.TIMEOUT_DURATION;
            setExpirationTime(newExpiresAt);
            lastUpdateRef.current = now;

            // Sync local state immediately for better UX
            setTimeRemaining(SESSION_CONFIG.TIMEOUT_DURATION);
        }
    }, [user, showWarning, setExpirationTime]);

    // Extend session (Explicit action)
    const extendSession = useCallback(() => {
        resetSession();
        toast.success('Sessão estendida por mais 30 minutos!');
    }, [resetSession, toast]);

    // Dismiss warning (Logout)
    const dismissWarning = useCallback(() => {
        handleSessionExpired();
    }, [handleSessionExpired]);

    // Setup activity listeners
    useEffect(() => {
        if (!user) return;

        const onActivity = () => handleActivity();

        SESSION_CONFIG.ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, onActivity, { passive: true });
        });

        // Listen for storage changes (Sync across tabs)
        const onStorage = (e: StorageEvent) => {
            if (e.key === SESSION_CONFIG.STORAGE_KEY_EXPIRES) {
                // If another tab updated the session, we just let the poller pick it up
                // But we can force a tick if needed. The poller runs every 1s so it's fast enough.
            }
        };
        window.addEventListener('storage', onStorage);

        return () => {
            SESSION_CONFIG.ACTIVITY_EVENTS.forEach(event => {
                window.removeEventListener(event, onActivity);
            });
            window.removeEventListener('storage', onStorage);
        };
    }, [user, handleActivity]);

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
