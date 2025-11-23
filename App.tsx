import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from './hooks/useAuth';
import { UserRole } from './types';
import Sidebar from './components/Sidebar';
import SimulatorView from './views/SimulatorView';
import HistoryView from './views/HistoryView';
import AdminView from './views/AdminView';
import InsightsView from './views/InsightsView';
import { ToastProvider, useToast } from './contexts/ToastContext';

// Login Screen Component
const LoginScreen = () => {
    const { login, register } = useAuth();
    const { error: toastError } = useToast();
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegistering) {
                await register(email, password, name);
            } else {
                await login(email, password);
            }
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.message || err.message || 'Ocorreu um erro. Tente novamente.';
            setError(errorMessage);
            toastError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
                    Simulador Reobote
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                    Consórcios
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 dark:border-slate-700">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {isRegistering && (
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Nome Completo
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        autoComplete="name"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:text-white transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Endereço de e-mail
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:text-white transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Senha
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-700 dark:text-white transition-colors"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Processando...' : (isRegistering ? 'Cadastrar' : 'Entrar')}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-300 dark:border-slate-600" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    Ou
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-3">
                            <button
                                onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    setError('');
                                }}
                                className="w-full flex justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-sm font-medium text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                {isRegistering ? 'Já tenho uma conta' : 'Criar nova conta'}
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 text-xs text-slate-500 dark:text-slate-400">
                        <p className="font-semibold mb-1">Credenciais de Acesso:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Email: admin@servopa.com.br</li>
                            <li>Senha: admin</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: UserRole[] }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.profile.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

const MainApp = () => {
    const { user, logout } = useAuth();
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' ||
                (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const toggleTheme = () => {
        setDarkMode(!darkMode);
    };

    return (
        <Router>
            <Routes>
                <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" replace />} />

                <Route path="/*" element={
                    <ProtectedRoute>
                        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 overflow-hidden">
                            <Sidebar
                                isOpen={sidebarOpen}
                                setIsOpen={setSidebarOpen}
                                userRole={user?.profile.role}
                                onLogout={logout}
                            />

                            <div className="flex-1 flex flex-col overflow-hidden w-full">
                                <header className="bg-white dark:bg-slate-800 shadow-sm z-10 transition-colors duration-200">
                                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                                        <div className="flex items-center">
                                            <button
                                                onClick={() => setSidebarOpen(true)}
                                                className="md:hidden p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                                            >
                                                <span className="sr-only">Open sidebar</span>
                                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className="flex items-center space-x-4">
                                            <button
                                                onClick={toggleTheme}
                                                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 focus:outline-none transition-colors"
                                                title={darkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
                                            >
                                                {darkMode ? (
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                                    </svg>
                                                )}
                                            </button>

                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    <img
                                                        className="h-10 w-10 rounded-full border-2 border-slate-200 dark:border-slate-600"
                                                        src={user?.profile.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.profile.name}`}
                                                        alt={user?.profile.name}
                                                    />
                                                </div>
                                                <div className="ml-3 hidden sm:block">
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user?.profile.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{user?.profile.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </header>

                                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 transition-colors duration-200">
                                    <div className="max-w-7xl mx-auto">
                                        <Routes>
                                            <Route path="/" element={<SimulatorView />} />
                                            <Route path="/history" element={<HistoryView onLoadSimulation={(inputs) => console.log('Load', inputs)} />} />
                                            <Route path="/insights" element={<InsightsView />} />
                                            <Route path="/admin" element={
                                                <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                                                    <AdminView />
                                                </ProtectedRoute>
                                            } />
                                        </Routes>
                                    </div>
                                </main>
                            </div>
                        </div>
                    </ProtectedRoute>
                } />
            </Routes>
        </Router>
    );
};

const App = () => {
    return (
        <ToastProvider>
            <AuthProvider>
                <MainApp />
            </AuthProvider>
        </ToastProvider>
    );
};

export default App;