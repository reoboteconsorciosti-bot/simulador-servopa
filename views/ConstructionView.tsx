import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import ResultDisplay from '../components/ResultDisplay';
import { calculateConstructionSimulation } from '../services/simulationService';
import { sendProposalWebhook } from '../services/webhookService';
import { SimulationInputs, SimulationOutputs, initialInputs } from '../types';
import { useAuth } from '../hooks/useAuth';
import { addToHistory } from '../services/historyService';

interface ConstructionViewProps {
    simulationToLoad: SimulationInputs | null;
    onSimulationLoaded: () => void;
}

const ConstructionView: React.FC<ConstructionViewProps> = ({ simulationToLoad, onSimulationLoaded }) => {
    const { user } = useAuth();
    const resultsRef = useRef<HTMLDivElement>(null);

    const [inputs, setInputs] = useState<SimulationInputs>(() => {
        // A estrutura do App garante que 'user' exista aqui.
        return { ...initialInputs, consultorNome: user!.profile.name || '' };
    });

    const [outputs, setOutputs] = useState<SimulationOutputs | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof SimulationInputs, string>>>({});
    const [resultTitle, setResultTitle] = useState('Resultados da Simulação (Construção)');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [webhookMessage, setWebhookMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [contemplationUnit, setContemplationUnit] = useState<'months' | 'years'>('months');
    const [viewMode, setViewMode] = useState<'consortium' | 'investment'>('consortium');
    const [bidType, setBidType] = useState<'sorteio' | 'fixo' | 'livre'>('livre');

    useEffect(() => {
        if (simulationToLoad && user) {
            const consultantName = simulationToLoad.consultorNome || user.profile.name || '';
            const inputsToLoad = { ...simulationToLoad, consultorNome: consultantName };

            setInputs(inputsToLoad);
            setInputs(inputsToLoad);
            const results = calculateConstructionSimulation(inputsToLoad);
            setOutputs(results);
            if (results) {
                setResultTitle(`Resultados para ${inputsToLoad.clienteNome || 'Cliente'}`);
            } else {
                setResultTitle('Resultados da Simulação (Construção)');
            }
            onSimulationLoaded();

            // Scroll to results when loading from history
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [simulationToLoad, onSimulationLoaded, user]);

    const isLiveMode = useRef(false);

    // Update live mode when outputs are set via the button logic
    useEffect(() => {
        if (outputs) {
            isLiveMode.current = true;
        }
    }, [outputs]);

    // Live calculation effect
    useEffect(() => {
        if (isLiveMode.current) {
            const timer = setTimeout(() => {
                const newResults = calculateConstructionSimulation(inputs);
                if (newResults) {
                    setOutputs(newResults);
                }
            }, 500); // 500ms debounce

            return () => clearTimeout(timer);
        }
    }, [inputs]);

    const handleInputChange = (name: string, value: string | number) => {
        setInputs(prev => {
            const newInputs = { ...prev, [name]: value };

            // Auto-correct contemplation month if term becomes smaller than current contemplation
            if (name === 'qtdMeses') {
                const newTerm = Number(value);
                const currentContemplation = Number(prev.mesContemplacao);
                if (newTerm > 0 && currentContemplation > newTerm) {
                    newInputs.mesContemplacao = newTerm;
                }
            }
            return newInputs;
        });

        setWebhookMessage(null);
        // Clear error for the current field when user starts typing
        if (errors[name as keyof SimulationInputs]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof SimulationInputs];
                return newErrors;
            });
        }
    };

    const handleClearFields = () => {
        if (!user) return;
        setInputs({ ...initialInputs, consultorNome: user.profile.name || '' });
        setOutputs(null);
        setErrors({});
        setResultTitle('Resultados da Simulação (Construção)');
        setWebhookMessage(null);
    };

    const validateInputs = (context: 'simulation' | 'proposal'): Partial<Record<keyof SimulationInputs, string>> => {
        const newErrors: Partial<Record<keyof SimulationInputs, string>> = {};

        // Client Name is only authoritative for the Proposal PDF
        if (context === 'proposal' && !inputs.clienteNome.trim()) {
            newErrors.clienteNome = 'O nome do cliente é obrigatório para gerar a proposta.';
        }

        // Consultant Name is required for both (or maybe just proposal? implied required generally)
        if (!inputs.consultorNome.trim()) newErrors.consultorNome = 'O nome do consultor é obrigatório.';

        if (inputs.credito === '' || Number(inputs.credito) <= 0) newErrors.credito = 'O valor do crédito deve ser maior que zero.';
        if (inputs.qtdMeses === '' || Number(inputs.qtdMeses) <= 0) newErrors.qtdMeses = 'O prazo deve ser maior que zero.';
        if (inputs.taxa === '' || Number(inputs.taxa) <= 0) newErrors.taxa = 'A taxa de administração é obrigatória.';
        if (Number(inputs.percentualEmbutido) > Number(inputs.percentualOfertado)) {
            newErrors.percentualEmbutido = 'O lance embutido não pode ser maior que o lance ofertado.';
        }
        return newErrors;
    };

    const handleSimulate = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validateInputs('simulation');
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setOutputs(null); // Clear previous results
            return;
        }
        setErrors({}); // Clear any existing errors
        const results = calculateConstructionSimulation(inputs);
        setOutputs(results);
        if (results && user) {
            setResultTitle(`Resultados para ${inputs.clienteNome || 'Cliente'}`);
            // Only add to history if client name is present? Or allow anonymous history?
            // User likely wants to save it anyway.
            addToHistory(user.uid, inputs);

            // Smart scroll to results (works for both mobile/stacked and desktop/side-by-side)
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`.replace('.', ',');

    const handleSendProposal = async () => {
        if (!outputs || !user) return;

        // Re-validate before sending
        const validationErrors = validateInputs('proposal');
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setWebhookMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios antes de gerar a proposta.' });
            return;
        }

        setIsSubmitting(true);
        setWebhookMessage(null);
        setProgressMessage('');

        try {
            // Step 1: Solicitação recebida
            setProgressMessage('✓ Solicitação recebida...');
            await new Promise(resolve => setTimeout(resolve, 800));

            // Garante que os valores numéricos sejam números para o payload
            const credito = Number(inputs.credito) || 0;
            const qtdMeses = Number(inputs.qtdMeses) || 0;
            const taxa = Number(inputs.taxa) || 0;
            const percentualOfertado = Number(inputs.percentualOfertado) || 0;
            const percentualEmbutido = Number(inputs.percentualEmbutido) || 0;

            const lanceOfertadoValor = outputs.lanceOfertadoValor || 0;
            const lanceEmbutidoValor = outputs.lanceEmbutidoValor || 0;
            const lancePagoValor = lanceOfertadoValor - lanceEmbutidoValor;

            const payload = {
                nome: inputs.clienteNome,
                consultor: inputs.consultorNome || user.profile.name || 'Consultor Servopa',
                credIndic: formatCurrency(credito),
                credDisp: formatCurrency(outputs.creditoDisponivel),
                saDev: formatCurrency(outputs.saldoDevedor),
                praTotal: qtdMeses,
                praPos: outputs.parcelasAPagarQtd,
                vParcaPag: formatCurrency(outputs.parcelasAPagarValor),
                vParcNorm: formatCurrency(outputs.valorParcela),
                taxaAdm: `${taxa}%`.replace('.', ','),
                percLanceOf: formatPercent(percentualOfertado / 100),
                vLanceOf: formatCurrency(lanceOfertadoValor),
                percLanceEmb: formatPercent(percentualEmbutido / 100),
                vLanceEmb: formatCurrency(lanceEmbutidoValor),
                perRecPro: formatPercent((percentualOfertado - percentualEmbutido) / 100),
                vRecPro: formatCurrency(lancePagoValor),
                parcContem: outputs.parcContem,
                dataSimulacao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
                tipoBem: inputs.tipoBem,
            };

            // Step 2: Enviando para formatação
            setProgressMessage('✓ Solicitação recebida\n⏳ Enviando para formatação...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 3: Construindo PDF
            setProgressMessage('✓ Solicitação recebida\n✓ Enviando para formatação\n⏳ Construindo PDF...');

            // Send webhook
            const response = await sendProposalWebhook(payload);

            // Step 4: Enviando para WhatsApp
            if (response.success) {
                setProgressMessage('✓ Solicitação recebida\n✓ Enviando para formatação\n✓ Construindo PDF\n⏳ Enviando para o WhatsApp...');
                await new Promise(resolve => setTimeout(resolve, 1500));
                setProgressMessage('✓ Solicitação recebida\n✓ Enviando para formatação\n✓ Construindo PDF\n✓ Enviando para o WhatsApp');
            }

            setWebhookMessage({ type: response.success ? 'success' : 'error', text: response.message });
        } catch (error) {
            setWebhookMessage({ type: 'error', text: 'Erro ao gerar proposta. Tente novamente.' });
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setProgressMessage(''), 2000); // Clear progress after 2 seconds
        }
    };




    return (
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-3/5">
                <form onSubmit={handleSimulate}>
                    <Card title="Simulador de Construção - Dados da Proposta" className="mb-8 border-l-4 border-l-blue-600">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <Input label="Nome do Cliente" name="clienteNome" value={inputs.clienteNome} onChange={handleInputChange} tooltip="Nome completo do cliente para identificação na proposta." error={errors.clienteNome} />
                            </div>
                            <Input label="Nome do Consultor" name="consultorNome" value={inputs.consultorNome} onChange={handleInputChange} tooltip="Seu nome, preenchido automaticamente a partir do seu perfil. Você pode editar este campo se necessário." error={errors.consultorNome} />
                        </div>
                    </Card>

                    <Card title="Parâmetros do Crédito" className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Valor do Crédito (R$)" name="credito" value={inputs.credito} onChange={handleInputChange} mask="currency" tooltip="O valor total que o cliente deseja contratar." error={errors.credito} />
                            <div className="relative">
                                <Input label="Prazo (meses)" name="qtdMeses" type="number" min="1" value={inputs.qtdMeses} onChange={handleInputChange} tooltip="O número total de meses para o pagamento do consórcio." error={errors.qtdMeses} />
                                {Number(inputs.qtdMeses) > 0 && (
                                    <div className="absolute top-0 right-0">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                            {(Number(inputs.qtdMeses) / 12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} anos
                                        </span>
                                    </div>
                                )}
                            </div>
                            <Input label="Taxa Adm. (%)" name="taxa" type="number" step="0.1" value={inputs.taxa} onChange={handleInputChange} tooltip="Percentual total de administração cobrado sobre o valor do crédito durante o prazo." error={errors.taxa} />
                            <Select label="Plano Redução" name="planoLight" value={inputs.planoLight} onChange={handleInputChange} options={[{ value: 1, label: 'Integral (Sem redução)' }, { value: 2, label: '10% de Redução' }, { value: 3, label: '20% de Redução' }, { value: 4, label: '30% de Redução' }, { value: 5, label: '40% de Redução' }, { value: 6, label: '50% de Redução' }]} tooltip="Permite iniciar pagando um percentual menor da parcela, com a diferença sendo paga após a contemplação ou no final do plano." />
                            <Select label="Seguro Prestamista" name="seguroPrestamista" value={inputs.seguroPrestamista} onChange={handleInputChange} options={[{ value: 2, label: 'Imóvel' }, { value: 3, label: 'Sem Seguro' }]} tooltip="Garante a quitação do saldo devedor em caso de imprevistos." />
                            <div className="relative">
                                <Input
                                    label="Taxa INCC (%)"
                                    name="inccTaxa"
                                    type="number"
                                    step="0.01"
                                    value={inputs.inccTaxa}
                                    onChange={handleInputChange}
                                    tooltip="Taxa de correção do crédito (INCC)."
                                />
                                <div className="absolute top-0 right-0">
                                    <div className="flex bg-slate-200 dark:bg-slate-700 rounded-md p-0.5 shadow-inner">
                                        <button
                                            type="button"
                                            onClick={() => handleInputChange('inccPeriodo', 'semestral')}
                                            className={`px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-colors ${inputs.inccPeriodo === 'semestral'
                                                ? 'bg-white dark:bg-slate-500 text-blue-600 dark:text-blue-200 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            Semestral
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleInputChange('inccPeriodo', 'anual')}
                                            className={`px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-colors ${inputs.inccPeriodo === 'anual'
                                                ? 'bg-white dark:bg-slate-500 text-blue-600 dark:text-blue-200 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            Anual
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <Input
                                    label="Data de Contemplação"
                                    name="mesContemplacaoDisplay"
                                    type="number"
                                    min="0"
                                    step={contemplationUnit === 'years' ? "0.1" : "1"}
                                    value={
                                        contemplationUnit === 'years'
                                            ? (Number(inputs.mesContemplacao) / 12).toString()
                                            : inputs.mesContemplacao
                                    }
                                    onChange={(name, value) => {
                                        // Internal conversion logic
                                        let finalMonths = 0;
                                        if (contemplationUnit === 'years') {
                                            finalMonths = Math.round(Number(value) * 12);
                                        } else {
                                            finalMonths = Number(value);
                                        }

                                        // Should not exceed term
                                        const maxMonths = Number(inputs.qtdMeses);
                                        if (maxMonths > 0 && finalMonths > maxMonths) {
                                            finalMonths = maxMonths;
                                        }
                                        handleInputChange('mesContemplacao', finalMonths);
                                    }}
                                    tooltip="Mês ou Ano estimadado da contemplação."
                                />
                                <div className="absolute top-0 right-0">
                                    <div className="flex bg-slate-200 dark:bg-slate-700 rounded-md p-0.5 shadow-inner">
                                        <button
                                            type="button"
                                            onClick={() => setContemplationUnit('months')}
                                            className={`px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-colors ${contemplationUnit === 'months'
                                                ? 'bg-white dark:bg-slate-500 text-blue-600 dark:text-blue-200 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            Meses
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setContemplationUnit('years')}
                                            className={`px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-colors ${contemplationUnit === 'years'
                                                ? 'bg-white dark:bg-slate-500 text-blue-600 dark:text-blue-200 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            Anos
                                        </button>
                                    </div>
                                </div>
                                {Number(inputs.mesContemplacao) > 0 && (
                                    <div className="absolute top-10 right-8 pointer-events-none">
                                        <span className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500">
                                            {contemplationUnit === 'years'
                                                ? `${Number(inputs.mesContemplacao)} meses`
                                                : `${(Number(inputs.mesContemplacao) / 12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} anos`
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card title="Configuração do Lance" className="mb-8"
                        action={
                            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                                <button type="button" onClick={() => { setBidType('sorteio'); handleInputChange('percentualOfertado', 0); handleInputChange('percentualEmbutido', 0); handleInputChange('lanceNaAssembleia', 0); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${bidType === 'sorteio' ? 'bg-white dark:bg-slate-500 text-blue-600 dark:text-blue-200 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Sorteio</button>
                                <button type="button" onClick={() => { setBidType('fixo'); handleInputChange('percentualOfertado', 30); handleInputChange('percentualEmbutido', 30); handleInputChange('lanceNaAssembleia', 0); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${bidType === 'fixo' ? 'bg-white dark:bg-slate-500 text-blue-600 dark:text-blue-200 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Lance Fixo</button>
                                <button type="button" onClick={() => setBidType('livre')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${bidType === 'livre' ? 'bg-white dark:bg-slate-500 text-blue-600 dark:text-blue-200 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Lance Livre</button>
                            </div>
                        }
                    >
                        {bidType === 'livre' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                                <Input label="Lance Ofertado (%)" name="percentualOfertado" type="number" step="0.1" value={inputs.percentualOfertado} onChange={handleInputChange} tooltip="Percentual do crédito que o cliente ofertará como lance. Pode incluir o lance embutido." />
                                <Input label="Lance Embutido (%)" name="percentualEmbutido" type="number" step="0.1" value={inputs.percentualEmbutido} onChange={handleInputChange} tooltip="Parte do lance que será descontada do próprio crédito, diminuindo o valor que o cliente recebe." error={errors.percentualEmbutido} />
                                <Input label="Lance Pago (%)" name="lancePago" value={Math.max(0, (Number(inputs.percentualOfertado) || 0) - (Number(inputs.percentualEmbutido) || 0)).toFixed(2)} onChange={() => { }} readOnly tooltip="Calculado automaticamente: Lance Ofertado - Lance Embutido." />
                                <Select label="Forma de Abatimento do Lance" name="diluirLance" value={inputs.diluirLance} onChange={handleInputChange} options={[{ value: 1, label: 'Sim (Abater Prazo)' }, { value: 2, label: 'LUDC' }, { value: 3, label: 'Não (abater parcelas)' }]} tooltip="Define se o lance será usado para reduzir o prazo (Sim) ou reduzir o valor da parcela (Não)." />
                                <Input label="Mês do Lance (Assembleia)" name="lanceNaAssembleia" type="number" min="1" value={inputs.lanceNaAssembleia} onChange={handleInputChange} tooltip="O número da assembleia em que o cliente pretende dar o lance para ser contemplado." />
                            </div>
                        )}
                        {bidType === 'sorteio' && (
                            <div className="text-center py-10 animate-fadeIn bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mb-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Contemplação por Sorteio</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">Nesta modalidade, não há oferta de lance. A simulação considerará apenas a "Data de Contemplação" informada acima.</p>
                            </div>
                        )}
                        {bidType === 'fixo' && (
                            <div className="text-center py-10 animate-fadeIn bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Lance Fixo Embutido (30%)</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">Nesta modalidade, é ofertado um lance fixo de 30% do valor da carta, utilizando 100% do saldo embutido. O cliente não desembolsa valor algum (Lance Pago = 0%).</p>
                            </div>
                        )}
                    </Card>

                    {/* NEW: Investment Parameters Section (Accordion Style) */}
                    <Card title="Parâmetros de Investimento (Opcional)" className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Valorização Imediata (%)" name="valorizacaoImediata" type="number" step="1" placeholder="40" value={inputs.valorizacaoImediata} onChange={handleInputChange} tooltip="Estimativa de valorização do imóvel logo após a construção (ex: 40%)." />
                            <Input label="Valorização Anual (%)" name="valorizacaoImovel" type="number" step="0.1" placeholder="6.0" value={inputs.valorizacaoImovel} onChange={handleInputChange} tooltip="Estimativa de valorização anual do imóvel a longo prazo (ex: 6%)." />
                            <Input label="Aluguel Estimado (% do valor)" name="aluguelEstimado" type="number" step="0.1" placeholder="1.0" value={inputs.aluguelEstimado} onChange={handleInputChange} tooltip="Percentual do valor do imóvel cobrado como aluguel mensal (ex: 1%)." />
                            <Input label="Taxa Reinvestimento (% a.m.)" name="taxaReinvestimento" type="number" step="0.1" placeholder="0.8" value={inputs.taxaReinvestimento} onChange={handleInputChange} tooltip="Rentabilidade mensal prevista para o reinvestimento do lucro (ex: 0,8%)." />
                        </div>
                    </Card>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <button type="button" onClick={handleClearFields} className="w-full sm:flex-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 py-3.5 sm:py-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-semibold text-base">Limpar Campos</button>
                        <button type="submit" className="w-full sm:flex-1 bg-blue-600 text-white py-3.5 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-base shadow-lg shadow-blue-500/30">Simular Construção</button>
                    </div>
                </form>
            </div>

            <div className="lg:w-2/5 scroll-mt-24" ref={resultsRef}>
                <Card title={resultTitle}>
                    {outputs ? (
                        <div className="space-y-4 animate-slideUp" key={JSON.stringify(outputs)}>

                            {/* Tabs for Result Views */}
                            <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
                                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                                    <button onClick={() => setViewMode('consortium')} className={`border-b-2 py-2 px-1 text-sm font-medium ${viewMode === 'consortium' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                                        Consórcio
                                    </button>
                                    <button onClick={() => setViewMode('investment')} className={`border-b-2 py-2 px-1 text-sm font-medium ${viewMode === 'investment' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                                        Investimento
                                    </button>
                                </nav>
                            </div>

                            {/* View 1: Standard Consortium Logic */}
                            {viewMode === 'consortium' && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div>
                                        <h3 className="font-bold text-lg mb-2 text-blue-500 dark:text-blue-400">Cenário Inicial (Construção)</h3>
                                        <ResultDisplay label="Crédito Contratado" value={formatCurrency(Number(inputs.credito) || 0)} />
                                        {outputs.valorizacao && outputs.valorizacao > 0 && (
                                            <>
                                                <ResultDisplay label={`Rendimento INCC (+${((Number(inputs.inccTaxa) || 0) * (inputs.inccPeriodo === 'semestral' ? Math.floor((Number(inputs.mesContemplacao) || 0) / 6) : Math.floor((Number(inputs.mesContemplacao) || 0) / 12))).toFixed(1)}%)`} value={formatCurrency(outputs.valorizacao)} className="text-emerald-600 dark:text-emerald-400 font-medium" />
                                                <ResultDisplay label="Valor da Carta Atualizado" value={formatCurrency(outputs.valorCartaAtualizado || 0)} className="text-blue-600 dark:text-blue-400 font-bold" />
                                            </>
                                        )}
                                        <ResultDisplay label="Parcela Inicial" value={formatCurrency(outputs.valorParcela)} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg mb-2 text-orange-500 dark:text-orange-400">Pós Contemplação</h3>
                                        <ResultDisplay label="Lance Ofertado" value={formatCurrency(outputs.lanceOfertadoValor)} />
                                        <ResultDisplay label="Lance Embutido" value={formatCurrency(outputs.lanceEmbutidoValor)} />
                                        <ResultDisplay label="Lance Pago (Rec. Próprios)" value={formatCurrency(outputs.lanceOfertadoValor - outputs.lanceEmbutidoValor)} />
                                        <ResultDisplay label="Qtd. Parcelas à Pagar" value={outputs.parcelasAPagarQtd} />
                                        <ResultDisplay label="Valor da Nova Parcela" value={formatCurrency(outputs.parcelasAPagarValor)} />
                                        <ResultDisplay label="Parcelas Pagas" value={outputs.parcContem} />
                                        <ResultDisplay label="Saldo Devedor" value={formatCurrency(outputs.saldoDevedor)} />
                                        <ResultDisplay label="Crédito Disponível" value={formatCurrency(outputs.creditoDisponivel)} className="text-green-600 dark:text-green-400 font-bold text-xl mt-2" />
                                    </div>
                                </div>
                            )}

                            {/* View 2: Investment Projection Logic */}
                            {viewMode === 'investment' && outputs.investimento && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div>
                                        <h3 className="font-bold text-lg mb-2 text-emerald-600 dark:text-emerald-400">Potencial de Lucro</h3>
                                        <ResultDisplay label="Valor Imóvel (Pronto)" value={formatCurrency(outputs.valorCartaAtualizado ? outputs.valorCartaAtualizado * (1 + (Number(inputs.valorizacaoImediata) || 40) / 100) : 0)} className="font-semibold" />
                                        <ResultDisplay label="Valor Imóvel (Final)" value={formatCurrency(outputs.investimento.valorImovelFinal)} className="font-bold text-lg" />
                                        <div className="my-4 border-t border-slate-200 dark:border-slate-700"></div>
                                        <h3 className="font-bold text-sm mb-2 text-slate-500 uppercase tracking-wide">Fluxo de Caixa Mensal</h3>
                                        <ResultDisplay label="Renda Aluguel Est." value={formatCurrency(outputs.investimento.rendaAluguelMensal)} className="text-green-600 dark:text-green-400" />
                                        <ResultDisplay label="Parcela Consórcio" value={`- ${formatCurrency(outputs.parcelasAPagarValor)}`} className="text-red-500 dark:text-red-400" />
                                        <ResultDisplay label="Lucro Líquido (Reinvestir)" value={formatCurrency(outputs.investimento.lucroMensalInicial)} className="font-bold text-blue-600 dark:text-blue-400 text-lg border-t pt-1 mt-1 border-dashed" />
                                        <div className="my-4 border-t border-slate-200 dark:border-slate-700"></div>
                                        <h3 className="font-bold text-lg mb-2 text-purple-600 dark:text-purple-400">Acumulado Total (Patrimônio)</h3>
                                        <ResultDisplay label="Investimentos (Aportes+Juros)" value={formatCurrency(outputs.investimento.valorAcumuladoInvestimentos)} />
                                        <ResultDisplay label="Patrimônio Total" value={formatCurrency(outputs.investimento.patrimonioTotal)} className="text-2xl font-black text-slate-800 dark:text-white mt-2" />
                                        <p className="text-xs text-slate-500 mt-1">Imóvel Valorizado + Renda Fixa Acumulada</p>
                                        <ResultDisplay label="Renda Passiva Final" value={formatCurrency(outputs.investimento.rendaTotalFinal)} className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-lg mt-4 font-bold text-emerald-700 dark:text-emerald-300" />
                                    </div>
                                </div>
                            )}

                            <div className="pt-6">
                                <button onClick={handleSendProposal} disabled={isSubmitting || !outputs} className="w-full bg-orange-500 text-white py-4 sm:py-3 rounded-lg hover:bg-orange-600 transition-colors font-bold text-base sm:text-lg shadow-lg shadow-orange-500/30 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:shadow-none">
                                    {isSubmitting ? 'Gerando...' : 'Gerar Proposta em PDF'}
                                </button>
                                {progressMessage && (
                                    <div className="mt-4 p-4 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-start gap-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 whitespace-pre-line">
                                                    {progressMessage}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {webhookMessage && (
                                    <div className={`mt-4 p-3 rounded-md text-sm text-center ${webhookMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'}`}>
                                        {webhookMessage.text}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-slate-500 dark:text-slate-400">Preencha os dados e clique em "Simular Construção" para ver os resultados.</p>
                            {Object.keys(errors).length > 0 && <p className="mt-4 text-sm text-red-600 dark:text-red-400">Por favor, corrija os campos destacados em vermelho.</p>}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ConstructionView;
