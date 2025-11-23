import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { ToastProvider } from './contexts/ToastContext';
import PasswordInput from './components/PasswordInput';
import { UserRole, SimulationInputs } from './types';
import SimulatorView from './views/SimulatorView';
import InsightsView from './views/InsightsView';
import AdminView from './views/AdminView';
import HistoryView from './views/HistoryView';
import UserModal from './components/UserModal';

const LoginScreen: React.FC<{ onLogin: (email: string, password?: string) => void }> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-gray-900 relative overflow-hidden">
            {/* Blurred background logo */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-10"
                style={{
                    backgroundImage: 'url(/logo_reobote.jpg)',
                    filter: 'blur(20px) grayscale(50%)',
                    transform: 'scale(1.1)'
                }}
            />

            <div className="p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md relative z-10">
                <div className="text-center mb-6">
                    {/* Reobote Logo */}
                    <div className="flex justify-center mb-4">
                        <img
                            src="/logo_reobote.jpg"
                            alt="Reobote Consórcios"
                            className="h-24 w-auto object-contain rounded-lg"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Simulador Reobote</h1>
                    <p className="text-slate-500 dark:text-slate-400">Consórcios</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Digite seu e-mail"
                        className="w-full px-4 py-3 mb-4 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        required
                    />
                    <PasswordInput
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Digite sua senha"
                        className="px-4 py-3 mb-4 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        required
                    />
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-semibold">
                        Entrar
                    </button>
                </form>
                <div className="mt-6 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <p className="font-bold text-center mb-2">Credenciais de Acesso:</p>
                    <ul className="text-center space-y-1">
                        <li>Email: admin@servopa.com.br</li>
                        <li>Senha: admin</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

type View = 'simulator' | 'insights' | 'admin' | 'history';

const MainApp: React.FC = () => {
    const { user, logout, updateUser, users } = useAuth();
    const { theme, toggleTheme } = useTheme();

    // Initialize view from localStorage or default to 'simulator'
    const [currentView, setCurrentView] = useState<View>(() => {
        const savedView = localStorage.getItem('sim-pro-current-view');
        return (savedView as View) || 'simulator';
    });

    const [simulationToLoad, setSimulationToLoad] = useState<SimulationInputs | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (!user) {
        return null; // Should not happen if wrapped correctly
    }

    const handleLoadSimulation = (simulation: any) => {
        setSimulationToLoad(simulation);
        setCurrentView('simulator');
        setIsMenuOpen(false);
    };

    const handleSaveProfile = (userData: any) => {
        if (user && userData.uid === user.uid) {
            updateUser(user.uid, userData.profile, userData.password);
            setIsProfileModalOpen(false);
        }
    };

    const handleViewChange = (view: View) => {
        setCurrentView(view);
        localStorage.setItem('sim-pro-current-view', view);
        setIsMenuOpen(false);
    };

    // Navigation Tabs Configuration
    const tabs: { id: View; label: string }[] = [
        { id: 'simulator', label: 'Simulador' },
        { id: 'history', label: 'Histórico' },
    ];

    if (user.profile.role === UserRole.Admin || user.profile.role === UserRole.Supervisor || user.profile.role === UserRole.Gerente) {
        tabs.push({ id: 'insights', label: 'Insights' });
    }

    if (user.profile.role === UserRole.Admin) {
        tabs.push({ id: 'admin', label: 'Admin' });
    }

    // Sliding Pill Logic
    const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const navRefs = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});

    React.useEffect(() => {
        const element = navRefs.current[currentView];

        if (element) {
            setPillStyle({
                left: element.offsetLeft,
                width: element.offsetWidth,
                opacity: 1
            });
        }
    }, [currentView, user.profile.role]); // Recalculate when currentView changes

    const renderView = () => {
        switch (currentView) {
            case 'simulator':
                return <SimulatorView
                    simulationToLoad={simulationToLoad}
                    onSimulationLoaded={() => setSimulationToLoad(null)}
                />;
            case 'insights':
                return <InsightsView />;
            case 'admin':
                return <AdminView />;
            case 'history':
                return <HistoryView
                    onLoadSimulation={handleLoadSimulation}
                />;
            default:
                return <SimulatorView
                    simulationToLoad={simulationToLoad}
                    onSimulationLoaded={() => setSimulationToLoad(null)}
                />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-gray-900 text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <nav className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            {/* Mobile menu button */}
                            <div className="flex items-center md:hidden mr-2">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="inline-flex items-center justify-center p-3 rounded-lg text-slate-500 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
                                    aria-expanded="false"
                                >
                                    <span className="sr-only">Open main menu</span>
                                    {isMenuOpen ? (
                                        <svg className="block h-7 w-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    ) : (
                                        <svg className="block h-7 w-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center space-x-2 lg:space-x-3 cursor-pointer" onClick={() => handleViewChange('simulator')}>
                                <img
                                    src="/logo_reobote.jpg"
                                    alt="Reobote"
                                    className="h-7 lg:h-8 w-7 lg:w-8 object-cover rounded-md"
                                />
                                <span className="text-lg lg:text-2xl font-bold text-blue-600 dark:text-blue-400">Simulador Servopa</span>
                            </div>
                            <div className="hidden md:flex ml-4 lg:ml-10 space-x-0.5 lg:space-x-1 relative items-center bg-slate-100 dark:bg-slate-700/50 p-1 rounded-full">
                                {/* Sliding Pill Background */}
                                <div
                                    className="absolute bg-white dark:bg-slate-600 rounded-full shadow-sm transition-all duration-300 ease-out h-[calc(100%-8px)] top-1"
                                    style={{
                                        left: pillStyle.left,
                                        width: pillStyle.width,
                                        opacity: pillStyle.opacity,
                                    }}
                                />

                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        ref={(el) => (navRefs.current[tab.id] = el)}
                                        onClick={() => handleViewChange(tab.id)}
                                        className={`relative z-10 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-medium transition-colors duration-200 ${currentView === tab.id
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 lg:space-x-4">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                aria-label="Toggle Theme"
                            >
                                {theme === 'dark' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>
                            <div
                                className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors"
                                onClick={() => setIsProfileModalOpen(true)}
                            >
                                <div className="text-right hidden lg:block">
                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{user.profile.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{user.profile.role}</div>
                                </div>
                                <img
                                    className="h-10 w-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600"
                                    src={user.profile.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.profile.name.replace(/\s/g, '')}`}
                                    alt={user.profile.name}
                                />
                            </div>
                            <button
                                onClick={logout}
                                className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium transition-colors hidden md:block"
                            >
                                Sair
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu, show/hide based on menu state */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 absolute w-full left-0 shadow-lg z-50">
                        <div className="px-4 pt-4 pb-6 space-y-2">
                            <button
                                onClick={() => handleViewChange('simulator')}
                                className={`${currentView === 'simulator' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'} block px-4 py-3 rounded-lg text-base font-medium w-full text-left transition-colors`}
                            >
                                Simulador
                            </button>
                            <button
                                onClick={() => handleViewChange('history')}
                                className={`${currentView === 'history' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'} block px-4 py-3 rounded-lg text-base font-medium w-full text-left transition-colors`}
                            >
                                Histórico
                            </button>
                            {(user.profile.role === UserRole.Admin || user.profile.role === UserRole.Supervisor || user.profile.role === UserRole.Gerente) && (
                                <button
                                    onClick={() => handleViewChange('insights')}
                                    className={`${currentView === 'insights' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'} block px-4 py-3 rounded-lg text-base font-medium w-full text-left transition-colors`}
                                >
                                    Insights
                                </button>
                            )}
                            {user.profile.role === UserRole.Admin && (
                                <button
                                    onClick={() => handleViewChange('admin')}
                                    className={`${currentView === 'admin' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'} block px-4 py-3 rounded-lg text-base font-medium w-full text-left transition-colors`}
                                >
                                    Admin
                                </button>
                            )}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
                                <button
                                    onClick={logout}
                                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 block px-4 py-3 rounded-lg text-base font-medium w-full text-left transition-colors"
                                >
                                    Sair
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderView()}
            </main>

            {isProfileModalOpen && (
                <UserModal
                    userToEdit={user}
                    onClose={() => setIsProfileModalOpen(false)}
                    onSave={handleSaveProfile}
                    isProfileMode={true}
                    users={users}
                />
            )}
        </div>
    );
};

const AppContent: React.FC = () => {
    const { user, login } = useAuth();
    return user ? <MainApp /> : <LoginScreen onLogin={login} />;
};

const App: React.FC = () => {
    return (
        <ToastProvider>
            <AuthProvider>
                <ThemeProvider>
                    <AppContent />
                </ThemeProvider>
            </AuthProvider>
        </ToastProvider>
    );
};

export default App;
