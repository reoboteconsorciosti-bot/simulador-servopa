import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getHistory, clearHistory } from '../services/historyService';
import { SavedSimulation, SimulationInputs, UserRole } from '../types';
import Card from '../components/Card';
import ConfirmModal from '../components/ConfirmModal';
import Select from '../components/Select';
import Input from '../components/Input';

interface HistoryViewProps {
    onLoadSimulation: (inputs: SimulationInputs) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onLoadSimulation }) => {
    const { user, users } = useAuth();
    const [history, setHistory] = useState<SavedSimulation[]>([]);
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

    // Server-side filters (Admin/Manager/Supervisor)
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [selectedTeam, setSelectedTeam] = useState<string>('');

    // Client-side filters (All users)
    const [filterName, setFilterName] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            if (user) {
                const data = await getHistory({
                    userId: selectedUser || undefined,
                    teamId: selectedTeam || undefined
                });
                setHistory(data);
            }
        };
        fetchHistory();
    }, [user, selectedUser, selectedTeam]);

    const handleClearHistory = () => {
        setClearConfirmOpen(true);
    };

    const confirmClearHistory = () => {
        if (user) {
            clearHistory(user.uid);
            setHistory([]);
        }
        setClearConfirmOpen(false);
    };

    const cancelClearHistory = () => {
        setClearConfirmOpen(false);
    };

    const formatCurrency = (value: number | string) => {
        if (value === '' || value === null) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filter options
    const userOptions = useMemo(() => {
        let filteredUsers = users;
        if (selectedTeam) {
            filteredUsers = users.filter(u => u.profile.teamId === selectedTeam);
        }
        return [
            { value: '', label: 'Todos os Usuários' },
            ...filteredUsers.map(u => ({ value: u.uid, label: u.profile.name }))
        ];
    }, [users, selectedTeam]);

    const teamOptions = useMemo(() => {
        const teams = Array.from(new Set(users.map(u => u.profile.teamId).filter(Boolean)));
        return [
            { value: '', label: 'Todas as Equipes' },
            ...teams.map(t => ({ value: t as string, label: `Equipe ${t}` }))
        ];
    }, [users]);

    const canFilterServer = user?.profile.role === UserRole.Admin ||
        user?.profile.role === UserRole.Gerente ||
        user?.profile.role === UserRole.Supervisor;

    const filteredHistory = useMemo(() => {
        return history.filter(sim => {
            const matchesName = filterName
                ? (sim.clienteNome || '').toLowerCase().includes(filterName.toLowerCase())
                : true;

            const matchesDate = filterDate
                ? new Date(sim.timestamp).toLocaleDateString('pt-BR') === new Date(filterDate).toLocaleDateString('pt-BR')
                : true;

            return matchesName && matchesDate;
        });
    }, [history, filterName, filterDate]);

    // Check if any filters are active
    const hasActiveFilters = filterName !== '' || filterDate !== '' || selectedUser !== '' || selectedTeam !== '';

    // Clear all filters
    const handleClearFilters = () => {
        setFilterName('');
        setFilterDate('');
        setSelectedUser('');
        setSelectedTeam('');
    };

    if (!user) {
        return null;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Histórico de Simulações</h1>
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Limpar Filtros
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        {canFilterServer && (
                            <>
                                <Select
                                    label="Equipe"
                                    name="teamFilter"
                                    value={selectedTeam}
                                    onChange={(name, val) => setSelectedTeam(val as string)}
                                    options={teamOptions}
                                    placeholder="Todas as Equipes"
                                />
                                <Select
                                    label="Usuário"
                                    name="userFilter"
                                    value={selectedUser}
                                    onChange={(name, val) => setSelectedUser(val as string)}
                                    options={userOptions}
                                    placeholder="Todos os Usuários"
                                />
                            </>
                        )}
                        <Input
                            label="Buscar Cliente"
                            name="filterName"
                            value={filterName}
                            onChange={(name, value) => setFilterName(value as string)}
                            placeholder="Nome do cliente..."
                        />
                        <Input
                            label="Filtrar Data"
                            name="filterDate"
                            type="date"
                            value={filterDate}
                            onChange={(name, value) => setFilterDate(value as string)}
                        />
                    </div>

                    {/* Results Counter */}
                    {history.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>
                                {filteredHistory.length === history.length ? (
                                    <><strong>{history.length}</strong> {history.length === 1 ? 'simulação' : 'simulações'} no total</>
                                ) : (
                                    <><strong>{filteredHistory.length}</strong> de <strong>{history.length}</strong> {history.length === 1 ? 'simulação encontrada' : 'simulações encontradas'}</>
                                )}
                            </span>
                        </div>
                    )}
                </div>

                <Card title="">
                    {filteredHistory.length > 0 ? (
                        <>
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={handleClearHistory}
                                    className="bg-red-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors shadow-md shadow-red-500/20"
                                >
                                    Limpar Histórico
                                </button>
                            </div>
                            <div className="space-y-4">
                                {filteredHistory.map((sim) => (
                                    <div key={sim.id} className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-100 dark:border-slate-700">
                                        <div className="flex-1 w-full">
                                            <div className="flex justify-between items-start mb-2 sm:mb-0">
                                                <div>
                                                    <p className="font-bold text-lg text-slate-800 dark:text-white mb-1">{sim.clienteNome || 'Cliente não informado'}</p>

                                                    {/* Contextual Info Badges */}
                                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                                        {/* Asset Type Badge */}
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sim.tipoBem === 'Imóvel'
                                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                            }`}>
                                                            {sim.tipoBem === 'Imóvel' ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                                </svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                </svg>
                                                            )}
                                                            {sim.tipoBem || 'Bem'}
                                                        </span>

                                                        {/* Consultant Name (Visible to Supervisor+) */}
                                                        {user?.profile.role !== UserRole.Consultor && sim.consultorNome && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                </svg>
                                                                {sim.consultorNome}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-600 sm:hidden">
                                                    {formatDate(sim.timestamp).split(' ')[0]}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm text-slate-600 dark:text-slate-300">
                                                <p>Crédito: <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(sim.credito)}</span></p>
                                                <p className="hidden sm:inline text-slate-300 dark:text-slate-600">|</p>
                                                <p>Prazo: <span className="font-bold text-slate-900 dark:text-white">{sim.qtdMeses} meses</span></p>
                                            </div>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 hidden sm:block">
                                                Simulado em: {formatDate(sim.timestamp)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => onLoadSimulation(sim)}
                                            className="bg-blue-600 text-white px-6 py-3 sm:py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors w-full sm:w-auto shadow-md shadow-blue-500/20 active:scale-95 transform duration-100"
                                        >
                                            Carregar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10">
                            {history.length === 0 ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        Nenhuma simulação realizada ainda.
                                    </p>
                                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                                        Realize sua primeira simulação para começar!
                                    </p>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        Nenhuma simulação encontrada com os filtros aplicados.
                                    </p>
                                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                                        Tente ajustar os filtros ou limpe-os para ver todas as simulações.
                                    </p>
                                    {hasActiveFilters && (
                                        <button
                                            onClick={handleClearFilters}
                                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Limpar Filtros
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </Card>
            </div>

            <ConfirmModal
                isOpen={clearConfirmOpen}
                title="Limpar Histórico"
                message="Tem certeza que deseja limpar todo o histórico de simulações? Esta ação não pode ser desfeita."
                confirmText="Limpar"
                cancelText="Cancelar"
                onConfirm={confirmClearHistory}
                onCancel={cancelClearHistory}
                variant="warning"
            />
        </>
    );
};

export default HistoryView;

