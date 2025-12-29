import { L16_CONST, L17_CONST } from '../constants';
import { SimulationInputs, SimulationOutputs } from '../types';

// Helper functions to mimic Excel's ROUND and IFERROR
const round = (value: number, decimals: number): number => {
  return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
};

const ifError = (calculation: () => number, fallback: number): number => {
  try {
    const result = calculation();
    return isNaN(result) || !isFinite(result) ? fallback : result;
  } catch (e) {
    return fallback;
  }
};

const getPlanoLightFactor = (planoLightValue: number): number => {
  // Value 1: Integral -> 1.0
  // Value 2: 10% Red -> 0.9
  // Value 3: 20% Red -> 0.8
  // Value 4: 30% Red -> 0.7
  // Value 5: 40% Red -> 0.6
  // Value 6: 50% Red -> 0.5
  switch (planoLightValue) {
    case 2: return 0.9;
    case 3: return 0.8;
    case 4: return 0.7;
    case 5: return 0.6;
    case 6: return 0.5;
    case 1:
    default:
      return 1.0;
  }
};


export const calculateSimulation = (inputs: SimulationInputs): SimulationOutputs | null => {
  try {
    // Convert empty strings to 0 for calculation, keeping original inputs for other uses.
    const credito = Number(inputs.credito) || 0;
    const qtdMeses = Number(inputs.qtdMeses) || 0;
    const taxa = Number(inputs.taxa) || 0;
    const percentualOfertado = Number(inputs.percentualOfertado) || 0;
    const percentualEmbutido = Number(inputs.percentualEmbutido) || 0;
    const qtdParcelasOfertado = Number(inputs.qtdParcelasOfertado) || 0;
    const lanceNaAssembleia = Number(inputs.lanceNaAssembleia) || 0;
    const { planoLight, seguroPrestamista } = inputs;
    const diluirLance = Number(inputs.diluirLance);

    // Prevent division by zero if prazo is not set
    if (qtdMeses === 0) {
      return null;
    }

    const taxaDecimal = taxa / 100;
    const percentualOfertadoDecimal = percentualOfertado / 100;
    const percentualEmbutidoDecimal = percentualEmbutido / 100;
    const planoLightFactor = getPlanoLightFactor(planoLight);

    // Cálculos Intermediários Iniciais (Taxas e Fatores)
    const N13 = 1 + taxaDecimal;
    const N14 = round(N13 / qtdMeses, 6);
    const N12 = credito * N13;

    // Flags de Seguro Prestamista (1 ou 0)
    // Opção 1: Automóvel -> Aplica L16 (0.0599%)
    // Opção 2: Imóvel -> Aplica 0 (na parcela inicial)
    // Opção 3: Sem Seguro -> Não aplica nada

    const isAutomovel = seguroPrestamista === 1;
    const isImovel = seguroPrestamista === 2; // Taxa 0 na inicial, mas paga L17 na pós

    const N27_flag = isAutomovel ? 1 : 0; // Usa L16 apenas se for Automóvel
    const N28_flag = 0; // L17 não é usado nos exemplos fornecidos

    const L14_seguro_vida = (L16_CONST * N12) * N27_flag;
    const L15_seguro_garantia = (L17_CONST * N12) * N28_flag;

    const B10_parcela_porcentagem = round(N14 * planoLightFactor, 8);
    const C10_valorParcela = (credito * B10_parcela_porcentagem) + L14_seguro_vida + L15_seguro_garantia;

    // Cálculos de Lance
    const O12 = ifError(() => round((lanceNaAssembleia * B10_parcela_porcentagem * credito) / credito, 6), 0);
    const O14 = qtdMeses - lanceNaAssembleia;
    const O13 = N13 - O12;
    const O15 = ifError(() => round(O13 / O14, 6), 0);
    const O16 = round(credito * O15, 6);

    // Lance Ofertado "Parcelizado" (Sheets Logic)
    // Converte % em parcelas inteiras e multiplica pelo valor da parcela base
    let C19_lance_ofertado_val = 0;
    let totalBidParcels = 0; // Total de parcelas ofertadas (Cash + Embutido)

    if (percentualOfertadoDecimal > 0) {
      const rawParcels = ((credito * N13) * percentualOfertadoDecimal) / O16;
      totalBidParcels = round(rawParcels, 0);
      C19_lance_ofertado_val = totalBidParcels * O16;
    } else {
      C19_lance_ofertado_val = qtdParcelasOfertado * O16;
      totalBidParcels = qtdParcelasOfertado;
    }

    const L21 = ifError(() => ((credito * N13) * percentualEmbutidoDecimal) / O16, 0);
    const D20_qtd_parcelas_embutido = round(L21, 0);
    const C20_lance_embutido_val = D20_qtd_parcelas_embutido * O16;

    // Parcelas em Dinheiro (Cash)
    // Se o input foi %, totalBidParcels já inclui tudo. Se foi manual, qtdParcelasOfertado é o total.
    // O lance embutido é sempre uma parte do total.
    const cashParcels = totalBidParcels - D20_qtd_parcelas_embutido;

    const B30_creditoDisponivel = credito - C20_lance_embutido_val;

    // Flags de Diluir Lance (1 ou 0)
    // 1: Diluir (Reduz valor da parcela) ? No, Code says 1 = Abater Prazo (Reduce Term)
    // 3: Abater (Reduz prazo) ? No, Code says 3 = Abater Parcelas (Reduce Value)

    // CORRECTION BASED ON SPREADSHEET:
    // User selected "Não" (Option 3) in Spreadsheet and got Reduced Term (161 parcels).
    // User selected "Sim" (Option 1) ... we assume "Dilute" means Reduce Value.

    // So we map:
    // Option 1 (Sim - "Diluir"): Should Reduce Value (parcelasAbatidas = 0)
    // Option 3 (Não - "Não Diluir"): Should Reduce Term (parcelasAbatidas = totalBidParcels)

    let parcelasAbatidas = 0;
    if (diluirLance === 1) {
      // Opção 1: Sim (Diluir) -> Mantém Prazo, Reduz Valor
      parcelasAbatidas = 0;
    } else if (diluirLance === 3) {
      // Opção 3: Não (Não Diluir) -> Reduz Prazo (Abate do final)
      parcelasAbatidas = totalBidParcels;
    } else if (diluirLance === 2) {
      // LUDC
      parcelasAbatidas = 0;
    }

    // B28: Parcelas Pagas
    const B28_qtd_parcelas_pagas = 1 + parcelasAbatidas + (lanceNaAssembleia - 1);
    const B29_parcelasAPagarQtd = qtdMeses - B28_qtd_parcelas_pagas;

    // L27: Valor Amortizado (em parcelas)
    // Deve considerar o TOTAL ofertado (Cash + Embutido) para abater do saldo
    const L27 = ((cashParcels + D20_qtd_parcelas_embutido) * O15) + O12;

    const L28 = N13 - L27;
    const B27_saldoDevedor = L28 * credito;

    const L29 = ifError(() => round(L28 / B29_parcelasAPagarQtd, 6), 0);

    // Seguros Pós-Contemplação
    // Automóvel: Continua pagando Vida (L16)
    // Imóvel: Passa a pagar Quebra de Garantia (L17)
    const M27_seguro_vida_pos = (L16_CONST * B27_saldoDevedor) * (isAutomovel ? 1 : 0);
    const M28_seguro_garantia_pos = (L17_CONST * B27_saldoDevedor) * (isImovel ? 1 : 0); // Imóvel paga L17 aqui

    const C29_parcelasAPagarValor = ifError(() => (L29 * credito) + M27_seguro_vida_pos + M28_seguro_garantia_pos, 0);

    return {
      valorParcela: C10_valorParcela,
      creditoDisponivel: B30_creditoDisponivel,
      saldoDevedor: B27_saldoDevedor,
      parcelasAPagarQtd: B29_parcelasAPagarQtd,
      parcelasAPagarValor: C29_parcelasAPagarValor,
      lanceOfertadoValor: C19_lance_ofertado_val,
      lanceEmbutidoValor: C20_lance_embutido_val,
      percentualParcela: B10_parcela_porcentagem,
      parcContem: B28_qtd_parcelas_pagas,
    };

  } catch (error) {
    console.error("Error in simulation calculation:", error);
    return null;
  }
};