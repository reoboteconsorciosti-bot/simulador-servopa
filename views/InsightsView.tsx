import React, { useMemo } from 'react';
import Card from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import { getHistory } from '../services/historyService';
import { SavedSimulation } from '../types';

const KPICard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="!p-4">
        <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg mr-4">
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
            </div>
        </div>
    </Card>
);


interface InsightsData {
    totalSimulations: number;
    averageCredit: number;
    averageTerm: number;
    creditRanges: Record<string, number>;
    assetTypes: Record<string, number>;
}

import Select from '../components/Select';
import { UserRole } from '../types';

const InsightsView: React.FC = () => {
    const { user, users } = useAuth();
    const [history, setHistory] = React.useState<SavedSimulation[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedUser, setSelectedUser] = React.useState<string>('');
    const [selectedTeam, setSelectedTeam] = React.useState<string>('');

    React.useEffect(() => {
        if (user) {
            setLoading(true);
            getHistory({
                userId: selectedUser || undefined,
                teamId: selectedTeam || undefined
            }).then(data => {
                setHistory(data);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [user, selectedUser, selectedTeam]);

    // Filter options
    const userOptions = React.useMemo(() => {
        let filteredUsers = users;
        if (selectedTeam) {
            filteredUsers = users.filter(u => u.profile.teamId === selectedTeam);
        }
        return [
            { value: '', label: 'Todos os Usuários' },
            ...filteredUsers.map(u => ({ value: u.uid, label: u.profile.name }))
        ];
    }, [users, selectedTeam]);

    const teamOptions = React.useMemo(() => {
        const teams = Array.from(new Set(users.map(u => u.profile.teamId).filter(Boolean)));
        return [
            { value: '', label: 'Todas as Equipes' },
            ...teams.map(t => ({ value: t as string, label: `Equipe ${t}` }))
        ];
    }, [users]);

    const canFilter = user?.profile.role === UserRole.Admin ||
        user?.profile.role === UserRole.Gerente ||
        user?.profile.role === UserRole.Supervisor;

    const insightsData = useMemo<InsightsData | null>(() => {
        if (!history.length) {
            return null;
        }

        const totalSimulations = history.length;
        const totalCredit = history.reduce((acc, sim) => acc + (Number(sim.credito) || 0), 0);
        const totalMonths = history.reduce((acc, sim) => acc + (Number(sim.qtdMeses) || 0), 0);

        const averageCredit = totalCredit / totalSimulations;
        const averageTerm = totalMonths / totalSimulations;

        const creditRanges = {
            'R$ 0 - 50k': history.filter(s => Number(s.credito) <= 50000).length,
            'R$ 50k - 100k': history.filter(s => Number(s.credito) > 50000 && Number(s.credito) <= 100000).length,
            'R$ 100k - 200k': history.filter(s => Number(s.credito) > 100000 && Number(s.credito) <= 200000).length,
            'Acima de R$ 200k': history.filter(s => Number(s.credito) > 200000).length,
        };

        const assetTypes = {
            'Imóvel': history.filter(s => s.tipoBem === 'Imóvel').length,
            'Automóvel': history.filter(s => s.tipoBem === 'Automóvel').length,
        };

        return {
            totalSimulations,
            averageCredit,
            averageTerm,
            creditRanges,
            assetTypes
        };
    }, [history]);

    const maxCreditRangeValue = insightsData ? Math.max(...(Object.values(insightsData.creditRanges) as number[])) : 0;
    const totalAssetTypes = insightsData ? insightsData.assetTypes['Imóvel'] + insightsData.assetTypes['Automóvel'] : 0;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Insights & Relatórios</h1>

                {canFilter && (
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="w-full sm:w-48">
                            <Select
                                label=""
                                name="teamFilter"
                                value={selectedTeam}
                                onChange={(name, val) => setSelectedTeam(val as string)}
                                options={teamOptions}
                                placeholder="Filtrar por Equipe"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <Select
                                label=""
                                name="userFilter"
                                value={selectedUser}
                                onChange={(name, val) => setSelectedUser(val as string)}
                                options={userOptions}
                                placeholder="Filtrar por Usuário"
                            />
                        </div>
                    </div>
                )}
            </div>

            {!insightsData ? (
                <Card title="Insights & Relatórios">
                    <div className="text-center py-10">
                        <p className="text-slate-500 dark:text-slate-400">
                            Não há dados suficientes para exibir os insights.
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            Realize algumas simulações para começar a ver os gráficos e relatórios.
                        </p>
                    </div>
                </Card>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <KPICard
                            title="Total de Simulações"
                            value={insightsData.totalSimulations.toString()}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5l4 4h5a2 2 0 012 2v5a2 2 0 01-2 2z" /></svg>}
                        />
                        <KPICard
                            title="Crédito Médio Simulado"
                            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(insightsData.averageCredit)}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
                        />
                        <KPICard
                            title="Prazo Médio"
                            value={`${Math.round(insightsData.averageTerm)} meses`}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Bar Chart */}
                        <Card title="Distribuição de Crédito por Simulação" className="lg:col-span-3">
                            <div className="space-y-4 pt-4">
                                {Object.entries(insightsData.creditRanges).map(([range, count]) => (
                                    <div key={range} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-full sm:w-28 text-left sm:text-right pr-0 sm:pr-4">{range}</span>
                                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-6 w-full">
                                            <div
                                                className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2 text-white font-bold text-xs transition-all duration-500"
                                                style={{ width: `${Number(maxCreditRangeValue) > 0 ? (Number(count) / Number(maxCreditRangeValue)) * 100 : 0}%`, minWidth: '24px' }}
                                            >
                                                {count}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Doughnut Chart */}
                        <Card title="Simulações por Tipo de Bem" className="lg:col-span-2">
                            <div className="flex flex-col items-center justify-center h-full gap-6 py-4">
                                <div
                                    className="relative w-40 h-40 rounded-full flex items-center justify-center"
                                    style={{
                                        background: `conic-gradient(
                                    #3b82f6 0% ${totalAssetTypes > 0 ? (Number(insightsData.assetTypes['Imóvel']) / totalAssetTypes) * 100 : 0}%,
                                    #f97316 ${totalAssetTypes > 0 ? (Number(insightsData.assetTypes['Imóvel']) / totalAssetTypes) * 100 : 0}% 100%
                                )`
                                    }}
                                >
                                    <div className="absolute w-28 h-28 bg-white dark:bg-gray-800 rounded-full"></div>
                                    <span className="z-10 text-2xl font-bold text-slate-800 dark:text-white">{totalAssetTypes}</span>
                                </div>
                                <div className="flex flex-col space-y-2 text-sm">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-blue-600 mr-2"></div>
                                        <span className="text-slate-600 dark:text-slate-300">Imóvel:</span>
                                        <span className="font-bold ml-1 text-slate-800 dark:text-white">{insightsData.assetTypes['Imóvel']}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                                        <span className="text-slate-600 dark:text-slate-300">Automóvel:</span>
                                        <span className="font-bold ml-1 text-slate-800 dark:text-white">{insightsData.assetTypes['Automóvel']}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
};

export default InsightsView;
