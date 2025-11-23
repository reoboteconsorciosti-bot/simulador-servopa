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

    if (!user) {
        return null;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Histórico de Simulações</h1>

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
                            onChange={(e) => setFilterName(e.target.value)}
                            placeholder="Nome do cliente..."
                        />
                        <Input
                            label="Filtrar Data"
                            name="filterDate"
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
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
                                                <p className="font-bold text-lg text-slate-800 dark:text-white mb-1">{sim.clienteNome || 'Cliente não informado'}</p>
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
                            <p className="text-slate-500 dark:text-slate-400">
                                Nenhuma simulação encontrada.
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">
                                Tente ajustar os filtros ou realize novas simulações.
                            </p>
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
