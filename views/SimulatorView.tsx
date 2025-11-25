import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
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
    // A estrutura do App garante que 'user' exista aqui.
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
        setResultTitle(`Resultados para ${inputsToLoad.clienteNome || 'Cliente'}`);
      } else {
        setResultTitle('Resultados da Simulação');
      }
      onSimulationLoaded();

      // Scroll to results when loading from history
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [simulationToLoad, onSimulationLoaded, user]);

  const handleInputChange = (name: string, value: string | number) => {
    setInputs(prev => ({ ...prev, [name]: value }));
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
    setResultTitle('Resultados da Simulação');
    setWebhookMessage(null);
  };

  const validateInputs = (): Partial<Record<keyof SimulationInputs, string>> => {
    const newErrors: Partial<Record<keyof SimulationInputs, string>> = {};
    if (!inputs.clienteNome.trim()) newErrors.clienteNome = 'O nome do cliente é obrigatório.';
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
      setOutputs(null); // Clear previous results
      return;
    }
    setErrors({}); // Clear any existing errors
    const results = calculateSimulation(inputs);
    setOutputs(results);
    if (results && user) {
      setResultTitle(`Resultados para ${inputs.clienteNome || 'Cliente'}`);
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
        consultor: inputs.consultorNome,
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

  const percentualParcelaCalculado = useMemo(() => {
    const tempOutputs = calculateSimulation(inputs);
    return tempOutputs ? tempOutputs.percentualParcela : 0;
  }, [inputs]);


  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-3/5">
        <form onSubmit={handleSimulate}>
          <Card title="Dados da Proposta" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input label="Nome do Cliente" name="clienteNome" value={inputs.clienteNome} onChange={handleInputChange} tooltip="Nome completo do cliente para identificação na proposta." error={errors.clienteNome} />
              </div>
              <Input label="Nome do Consultor" name="consultorNome" value={inputs.consultorNome} onChange={handleInputChange} tooltip="Seu nome, preenchido automaticamente a partir do seu perfil. Você pode editar este campo se necessário." />
              <Select label="Tipo de Bem" name="tipoBem" value={inputs.tipoBem} onChange={handleInputChange} options={[{ value: 'Imóvel', label: 'Imóvel' }, { value: 'Automóvel', label: 'Automóvel' }]} tooltip="Define o tipo de consórcio. Imóveis geralmente têm prazos mais longos." />
            </div>
          </Card>

          <Card title="Parâmetros do Crédito" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Valor do Crédito (R$)" name="credito" value={inputs.credito} onChange={handleInputChange} mask="currency" tooltip="O valor total que o cliente deseja contratar." error={errors.credito} />
              <Input label="Prazo (meses)" name="qtdMeses" type="number" min="1" value={inputs.qtdMeses} onChange={handleInputChange} tooltip="O número total de meses para o pagamento do consórcio." error={errors.qtdMeses} />
              <Input label="Taxa Adm. (%)" name="taxa" type="number" step="0.1" value={inputs.taxa} onChange={handleInputChange} tooltip="Percentual total de administração cobrado sobre o valor do crédito durante o prazo." error={errors.taxa} />
              <Select label="Plano Light (Redução)" name="planoLight" value={inputs.planoLight} onChange={handleInputChange} options={[{ value: 1, label: '100% (Integral)' }, { value: 2, label: '50% (Redução)' }, { value: 3, label: '60% (Redução)' }, { value: 4, label: '70% (Redução)' }, { value: 5, label: '80% (Redução)' }, { value: 6, label: '90% (Redução)' }]} tooltip="Permite iniciar pagando um percentual menor da parcela, com a diferença sendo paga após a contemplação ou no final do plano." />
              <Select label="Seguro Prestamista" name="seguroPrestamista" value={inputs.seguroPrestamista} onChange={handleInputChange} options={[{ value: 1, label: 'Automóvel' }, { value: 2, label: 'Imóvel' }, { value: 3, label: 'Sem Seguro' }]} tooltip="Garante a quitação do saldo devedor em caso de imprevistos. O seguro Automóvel possui taxa específica." />
              <Input label="% da Parcela" name="percentualParcela" value={`${(percentualParcelaCalculado * 100).toFixed(4)}%`.replace('.', ',')} onChange={() => { }} readOnly tooltip="Cálculo automático do percentual mensal do crédito, considerando a taxa administrativa." />
            </div>
          </Card>

          <Card title="Configuração do Lance" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Lance Ofertado (%)" name="percentualOfertado" type="number" step="0.1" value={inputs.percentualOfertado} onChange={handleInputChange} tooltip="Percentual do crédito que o cliente ofertará como lance. Pode incluir o lance embutido." />
              <Input label="Lance Embutido (%)" name="percentualEmbutido" type="number" step="0.1" value={inputs.percentualEmbutido} onChange={handleInputChange} tooltip="Parte do lance que será descontada do próprio crédito, diminuindo o valor que o cliente recebe." error={errors.percentualEmbutido} />
              <Input label="Lance Pago (%)" name="lancePago" value={Math.max(0, (Number(inputs.percentualOfertado) || 0) - (Number(inputs.percentualEmbutido) || 0)).toFixed(2)} onChange={() => { }} readOnly tooltip="Calculado automaticamente: Lance Ofertado - Lance Embutido." />
              <Select label="Forma de Abatimento do Lance" name="diluirLance" value={inputs.diluirLance} onChange={handleInputChange} options={[{ value: 1, label: 'Sim (Diluir no prazo restante)' }, { value: 2, label: 'LUDC' }, { value: 3, label: 'Não (Abater parcelas)' }]} tooltip="Define o que acontece com o valor do lance após a contemplação. 'Diluir' reduz o valor das parcelas futuras. 'Abater' quita as últimas parcelas." />
              <Input label="Mês do Lance (Assembleia)" name="lanceNaAssembleia" type="number" min="1" value={inputs.lanceNaAssembleia} onChange={handleInputChange} tooltip="O número da assembleia em que o cliente pretende dar o lance para ser contemplado." />
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
                <h3 className="font-bold text-lg mb-2 text-blue-500 dark:text-blue-400">Cenário Inicial</h3>
                <ResultDisplay label="Crédito Contratado" value={formatCurrency(Number(inputs.credito) || 0)} />
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