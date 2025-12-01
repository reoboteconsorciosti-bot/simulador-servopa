import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import SegmentedControl from '../components/SegmentedControl';
import Toggle from '../components/Toggle';
import CurrencyPercentInput from '../components/CurrencyPercentInput';
import ResultDisplay from '../components/ResultDisplay';
import { calculateSimulation } from '../services/simulationService';
import { sendProposalWebhook } from '../services/webhookService';
import { SimulationInputs, SimulationOutputs, initialInputs } from '../types';
import { useAuth } from '../hooks/useAuth';
import { addToHistory } from '../services/historyService';

interface SimulatorViewProps {
  simulationToLoad: SimulationInputs | null;
  onSimulationLoaded: () => void;
}

const SimulatorView: React.FC<SimulatorViewProps> = ({ simulationToLoad, onSimulationLoaded }) => {
  const { user } = useAuth();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [inputs, setInputs] = useState<SimulationInputs>(() => {
    return { ...initialInputs, consultorNome: user!.profile.name || '' };
  });

  const [outputs, setOutputs] = useState<SimulationOutputs | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof SimulationInputs, string>>>({});
  const [resultTitle, setResultTitle] = useState('Resultados da Simulação');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');

  useEffect(() => {
    if (simulationToLoad && user) {
      const consultantName = simulationToLoad.consultorNome || user.profile.name || '';
      const inputsToLoad = { ...simulationToLoad, consultorNome: consultantName };

      setInputs(inputsToLoad);
      const results = calculateSimulation(inputsToLoad);
      setOutputs(results);
      if (results) {
        setResultTitle(`Resultados para ${inputsToLoad.clienteNome || 'Cliente'} `);
      } else {
        setResultTitle('Resultados da Simulação');
      }
      onSimulationLoaded();

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [simulationToLoad, onSimulationLoaded, user]);

  const handleInputChange = (name: string, value: string | number) => {
    setInputs(prev => ({ ...prev, [name]: value }));
    setWebhookMessage(null);
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
    setResultTitle('Resultados da Simulação');
    setWebhookMessage(null);
  };

  const validateInputs = (): Partial<Record<keyof SimulationInputs, string>> => {
    const newErrors: Partial<Record<keyof SimulationInputs, string>> = {};
    if (!inputs.clienteNome.trim()) newErrors.clienteNome = 'O nome do cliente é obrigatório.';
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
    const validationErrors = validateInputs();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setOutputs(null);
      return;
    }
    setErrors({});
    const results = calculateSimulation(inputs);
    setOutputs(results);
    if (results && user) {
      setResultTitle(`Resultados para ${inputs.clienteNome || 'Cliente'} `);
      addToHistory(user.uid, inputs);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}% `.replace('.', ',');

  const handleSendProposal = async () => {
    if (!outputs || !user) return;

    const validationErrors = validateInputs();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setWebhookMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios antes de gerar a proposta.' });
      return;
    }

    setIsSubmitting(true);
    setWebhookMessage(null);
    setProgressMessage('');

    try {
      setProgressMessage('✓ Solicitação recebida...');
      await new Promise(resolve => setTimeout(resolve, 800));

      const credito = Number(inputs.credito) || 0;
      const qtdMeses = Number(inputs.qtdMeses) || 0;
      const taxa = Number(inputs.taxa) || 0;
      const fundoReserva = Number(inputs.fundoReserva) || 0;
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
        taxaAdm: `${taxa + fundoReserva}% `.replace('.', ','), // Summing Fundo Reserva to Taxa for display? Or keep separate?
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

      setProgressMessage('✓ Solicitação recebida\n⏳ Enviando para formatação...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgressMessage('✓ Solicitação recebida\n✓ Enviando para formatação\n⏳ Construindo PDF...');

      const response = await sendProposalWebhook(payload);

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
      setTimeout(() => setProgressMessage(''), 2000);
    }
  };

  const percentualParcelaCalculado = useMemo(() => {
    const tempOutputs = calculateSimulation(inputs);
    return tempOutputs ? tempOutputs.percentualParcela : 0;
  }, [inputs]);

  // Calculate Lance Livre (Pago) for display
  const lanceLivreCalculado = useMemo(() => {
    const ofertado = Number(inputs.percentualOfertado) || 0;
    const embutido = Number(inputs.percentualEmbutido) || 0;
    return Math.max(0, ofertado - embutido);
  }, [inputs.percentualOfertado, inputs.percentualEmbutido]);


  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-3/5">
        <form onSubmit={handleSimulate}>

          {/* SECTION 1: PROPOSTA */}
          <Card title="PROPOSTA" className="mb-8 border-l-4 border-blue-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input label="Nome do Cliente" name="clienteNome" value={inputs.clienteNome} onChange={handleInputChange} tooltip="Nome completo do cliente." error={errors.clienteNome} />
              </div>
              <Input label="Crédito Contratado (R$)" name="credito" value={inputs.credito} onChange={handleInputChange} mask="currency" tooltip="Valor do crédito." error={errors.credito} />
              <Input label="Prazo (meses)" name="qtdMeses" type="number" min="1" value={inputs.qtdMeses} onChange={handleInputChange} tooltip="Prazo total." error={errors.qtdMeses} />

              <Input label="Taxa de Administração (%)" name="taxa" type="number" step="0.1" value={inputs.taxa} onChange={handleInputChange} tooltip="Taxa administrativa total." error={errors.taxa} />
              <Input label="Fundo de Reserva (%)" name="fundoReserva" type="number" step="0.1" value={inputs.fundoReserva} onChange={handleInputChange} tooltip="Fundo de reserva total." />

              <Select label="Tipo de Bem" name="tipoBem" value={inputs.tipoBem} onChange={handleInputChange} options={[{ value: 'Imóvel', label: 'Imóvel' }, { value: 'Automóvel', label: 'Automóvel' }]} tooltip="Tipo do consórcio." />
              <Select label="Redutor de Parcela" name="planoLight" value={inputs.planoLight} onChange={handleInputChange} options={[{ value: 1, label: 'Integral (Sem redução)' }, { value: 2, label: '10% de Redução' }, { value: 3, label: '20% de Redução' }, { value: 4, label: '30% de Redução' }, { value: 5, label: '40% de Redução' }, { value: 6, label: '50% de Redução' }]} tooltip="Opção de parcela reduzida." />

              <SegmentedControl
                label="Seguro Prestamista"
                name="seguroPrestamista"
                value={inputs.seguroPrestamista}
                onChange={(val) => handleInputChange('seguroPrestamista', val)}
                options={[{ value: 1, label: 'Automóvel' }, { value: 2, label: 'Imóvel' }, { value: 3, label: 'Sem Seguro' }]}
                tooltip="Tipo de seguro a ser aplicado."
              />

              <Input label="% da Parcela" name="percentualParcela" value={`${(percentualParcelaCalculado * 100).toFixed(4)}% `.replace('.', ',')} onChange={() => { }} readOnly tooltip="Cálculo automático do percentual mensal do crédito." />

              <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex justify-between items-center">
                <span className="font-semibold text-blue-800 dark:text-blue-200">Parcela Inicial Estimada:</span>
                <span className="font-bold text-xl text-blue-600 dark:text-blue-400">{outputs ? formatCurrency(outputs.valorParcela) : 'R$ 0,00'}</span>
              </div>
            </div>
          </Card>

          {/* SECTION 2: CONTEMPLAÇÃO */}
          <Card title="CONTEMPLAÇÃO" className="mb-8 border-l-4 border-orange-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Tipo de Lance" name="diluirLance" value={inputs.diluirLance} onChange={handleInputChange} options={[{ value: 1, label: 'Sim (Abater Prazo)' }, { value: 2, label: 'LUDC' }, { value: 3, label: 'Não (abater parcelas)' }]} tooltip="Como o lance será utilizado." />
              <Input label="Mês da Contemplação" name="lanceNaAssembleia" type="number" min="1" value={inputs.lanceNaAssembleia} onChange={handleInputChange} tooltip="Previsão de contemplação." />

              <CurrencyPercentInput
                label="Lance Ofertado"
                name="percentualOfertado"
                value={Number(inputs.percentualOfertado) || ''}
                onChange={handleInputChange}
                credit={Number(inputs.credito) || 0}
                tooltip="Lance total ofertado."
              />

              <CurrencyPercentInput
                label="Lance Embutido"
                name="percentualEmbutido"
                value={Number(inputs.percentualEmbutido) || ''}
                onChange={handleInputChange}
                credit={Number(inputs.credito) || 0}
                tooltip="Parte do lance descontada do crédito."
                error={errors.percentualEmbutido}
              />

              <CurrencyPercentInput
                label="Lance Livre (Pago)"
                name="lancePago"
                value={lanceLivreCalculado}
                onChange={() => { }}
                credit={Number(inputs.credito) || 0}
                readOnly
                tooltip="Calculado automaticamente: Lance Ofertado - Lance Embutido."
              />

              <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <div>
                  <span className="block text-sm text-orange-800 dark:text-orange-200">Lance Rec. Próprios</span>
                  <span className="font-bold text-lg text-orange-600 dark:text-orange-400">{outputs ? formatCurrency(outputs.lanceOfertadoValor - outputs.lanceEmbutidoValor) : 'R$ 0,00'}</span>
                </div>
                <div>
                  <span className="block text-sm text-orange-800 dark:text-orange-200">Lance Embutido</span>
                  <span className="font-bold text-lg text-orange-600 dark:text-orange-400">{outputs ? formatCurrency(outputs.lanceEmbutidoValor) : 'R$ 0,00'}</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button type="button" onClick={handleClearFields} className="w-full sm:flex-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 py-3.5 sm:py-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-semibold text-base">
              Limpar Campos
            </button>
            <button type="submit" className="w-full sm:flex-1 bg-blue-600 text-white py-3.5 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-base shadow-lg shadow-blue-500/30">Simular</button>
          </div>
        </form>
      </div>

      <div className="lg:w-2/5 scroll-mt-24" ref={resultsRef}>
        <Card title={resultTitle}>
          {outputs ? (
            <div className="space-y-4 animate-slideUp" key={JSON.stringify(outputs)}>
              <div>
                <h3 className="font-bold text-lg mb-2 text-blue-500 dark:text-blue-400">Resumo da Operação</h3>
                <ResultDisplay label="Crédito Contratado" value={formatCurrency(Number(inputs.credito) || 0)} />
                <ResultDisplay label="Prazo Total" value={`${inputs.qtdMeses} meses`} />
                <ResultDisplay label="Taxa Total" value={`${Number(inputs.taxa) + (Number(inputs.fundoReserva) || 0)}% `} />
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2 text-orange-500 dark:text-orange-400">Pós Contemplação</h3>
                <ResultDisplay label="Lance Total" value={formatCurrency(outputs.lanceOfertadoValor)} />
                <ResultDisplay label="Saldo Devedor" value={formatCurrency(outputs.saldoDevedor)} />
                <ResultDisplay label="Crédito Disponível" value={formatCurrency(outputs.creditoDisponivel)} className="text-green-600 dark:text-green-400 font-bold text-xl mt-2" />

                <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Nova Parcela:</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(outputs.parcelasAPagarValor)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Prazo Restante:</span>
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{outputs.parcelasAPagarQtd} meses</span>
                  </div>
                </div>
              </div>

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
                  <div className={`mt - 4 p - 3 rounded - md text - sm text - center ${webhookMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'} `}>
                    {webhookMessage.text}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-slate-500 dark:text-slate-400">
                Preencha os dados e clique em "Simular" para ver os resultados.
              </p>
              {Object.keys(errors).length > 0 && (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                  Por favor, corrija os campos destacados em vermelho.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SimulatorView;