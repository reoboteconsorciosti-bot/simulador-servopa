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
  // =SE(B13=2,"50%",SE(B13=3,"60%",SE(B13=4,"70%",SE(B13=5,"80%",SE(B13=6,"90%","100%")))))
  switch (planoLightValue) {
    case 2: return 0.5;
    case 3: return 0.6;
    case 4: return 0.7;
    case 5: return 0.8;
    case 6: return 0.9;
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
    const { planoLight, seguroPrestamista, diluirLance } = inputs;

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
    if (percentualOfertadoDecimal > 0) {
      const rawParcels = ((credito * N13) * percentualOfertadoDecimal) / O16;
      const qtdParcelasOfertadoCalc = round(rawParcels, 0);
      C19_lance_ofertado_val = qtdParcelasOfertadoCalc * O16;
    } else {
      C19_lance_ofertado_val = qtdParcelasOfertado * O16;
    }

    const L21 = ifError(() => ((credito * N13) * percentualEmbutidoDecimal) / O16, 0);
    const D20_qtd_parcelas_embutido = round(L21, 0);
    const C20_lance_embutido_val = D20_qtd_parcelas_embutido * O16;

    const B30_creditoDisponivel = credito - C20_lance_embutido_val;

    // Flags de Diluir Lance (1 ou 0)
    const N20_flag_diluir_embutido = diluirLance === 1 ? 1 : 0;
    const N21_flag_abater_parcelas = diluirLance === 3 ? 1 : 0;

    const B28_qtd_parcelas_pagas = 1 + (D20_qtd_parcelas_embutido * N20_flag_diluir_embutido) + (qtdParcelasOfertado * N21_flag_abater_parcelas) + (lanceNaAssembleia - 1);
    const B29_parcelasAPagarQtd = qtdMeses - B28_qtd_parcelas_pagas;

    const L27 = ((qtdParcelasOfertado + D20_qtd_parcelas_embutido) * O15) + O12;

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