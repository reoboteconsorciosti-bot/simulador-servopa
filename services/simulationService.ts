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
    const fundoReserva = Number(inputs.fundoReserva) || 0;
    const diluirLance = Number(inputs.diluirLance);

    // New Fields
    const {
      planoLight, percentualRedutor, reducaoSobre,
      seguroPrestamista, tipoSeguro, percentualSeguro,
      taxaAdesao, percentualAdesao, mesesAdesao,
      lanceComFgts, percentualFgts
    } = inputs;

    // Prevent division by zero if prazo is not set
    if (qtdMeses === 0) {
      return null;
    }

    const taxaDecimal = (taxa + fundoReserva) / 100;
    const percentualOfertadoDecimal = percentualOfertado / 100;
    const percentualEmbutidoDecimal = percentualEmbutido / 100;

    // Plano Light Factor
    let planoLightFactor = 1.0;
    if (planoLight) {
      const redutor = Number(percentualRedutor) || 0;
      planoLightFactor = 1 - (redutor / 100);
    }

    // Cálculos Intermediários Iniciais (Taxas e Fatores)
    const N13 = 1 + taxaDecimal;

    // Logic for Redutor Scope
    let N14 = 0;
    if (planoLight && reducaoSobre === 'Fundo Comum') {
      // Reduces only the Common Fund part (100% / months)
      const fundoComumMensal = (1 / qtdMeses);
      const taxaAdmMensal = (taxaDecimal / qtdMeses); // Assuming Taxa is also spread? Or Taxa is fixed?
      // Usually Taxa Adm is spread over the period.
      // If Reducer applies to Fundo Comum only:
      const fundoComumReduzido = fundoComumMensal * planoLightFactor;
      N14 = round(fundoComumReduzido + taxaAdmMensal, 8);
    } else {
      // Reduces the Total Parcel (Standard behavior or "Parcela Total")
      const rawN14 = N13 / qtdMeses;
      N14 = round(rawN14 * planoLightFactor, 8);
    }

    const N12 = credito * N13;

    // Seguro Prestamista Logic
    let taxaSeguro = 0;
    if (seguroPrestamista) {
      if (percentualSeguro && Number(percentualSeguro) > 0) {
        taxaSeguro = Number(percentualSeguro) / 100;
      } else {
        // Default rates if not provided
        if (tipoSeguro === 'Automóvel') taxaSeguro = L16_CONST; // 0.000599
        else if (tipoSeguro === 'Imóvel') taxaSeguro = L17_CONST; // 0.000315 (Example)
      }
    }

    const valorSeguro = credito * taxaSeguro; // Seguro calculated on Credit? Or Total Debt?
    // Old code: (L16_CONST * N12) -> N12 is Total Debt (Credit + Fees).
    // Let's stick to old logic: Seguro on Total Debt?
    // "L14_seguro_vida = (L16_CONST * N12) * N27_flag" -> Yes, on N12.
    // So if I use custom rate, should I apply to N12 or Credit?
    // Standard market practice is usually on Saldo Devedor or Credit.
    // Given the old code used N12, I will apply to N12 for consistency unless specified.
    // But wait, N12 = Credit * (1 + Taxa).
    // If I have a custom % Seguro, usually it's % of Credit.
    // Let's apply to Credit for custom input, and N12 for defaults if that was the rule.
    // Actually, to be safe and consistent with "Calculate everything", I should probably apply to Credit if it's a simple rate.
    // Let's use Credit * taxaSeguro for now.

    // Re-evaluating old code: L14 = (L16 * N12).
    const valorSeguroFinal = (seguroPrestamista && tipoSeguro !== 'Sem Seguro')
      ? (Number(percentualSeguro) > 0 ? (credito * (Number(percentualSeguro) / 100)) : (N12 * (tipoSeguro === 'Automóvel' ? L16_CONST : (tipoSeguro === 'Imóvel' ? L17_CONST : 0))))
      : 0;

    const B10_parcela_porcentagem = N14; // Already factored in Redutor
    const C10_valorParcelaBase = (credito * B10_parcela_porcentagem) + valorSeguroFinal;

    // Taxa de Adesão Logic
    let valorParcelaInicial = C10_valorParcelaBase;
    let valorDemaisParcelas = C10_valorParcelaBase;

    if (taxaAdesao) {
      const adesaoTotal = (Number(percentualAdesao) / 100) * credito;
      const meses = Number(mesesAdesao) || 1;
      const parcelaAdesao = adesaoTotal / meses;
      valorParcelaInicial = C10_valorParcelaBase + parcelaAdesao;
      // Note: This logic assumes we are in the first 'meses' months.
      // The output 'valorParcela' will be the INITIAL one.
      // 'valorDemaisParcelas' will be the base one.
    }

    // Cálculos de Lance
    const O12 = ifError(() => round((lanceNaAssembleia * B10_parcela_porcentagem * credito) / credito, 6), 0);
    const O14 = qtdMeses - lanceNaAssembleia;
    const O13 = N13 - O12;
    const O15 = ifError(() => round(O13 / O14, 6), 0);
    const O16 = round(credito * O15, 6);

    // Lance Ofertado "Parcelizado"
    let C19_lance_ofertado_val = 0;
    let totalBidParcels = 0;

    if (percentualOfertadoDecimal > 0) {
      const rawParcels = (credito * percentualOfertadoDecimal) / O16;
      totalBidParcels = round(rawParcels, 0);
      C19_lance_ofertado_val = totalBidParcels * O16;
    } else {
      C19_lance_ofertado_val = qtdParcelasOfertado * O16;
      totalBidParcels = qtdParcelasOfertado;
    }

    // Lance Embutido
    const L21 = ifError(() => (credito * percentualEmbutidoDecimal) / O16, 0);
    const D20_qtd_parcelas_embutido = round(L21, 0);
    const C20_lance_embutido_val = D20_qtd_parcelas_embutido * O16;

    // Lance FGTS
    let C_FGTS_val = 0;
    let D_FGTS_qtd = 0;
    if (lanceComFgts) {
      const fgtsDecimal = (Number(percentualFgts) || 0) / 100;
      const rawFgtsParcels = (credito * fgtsDecimal) / O16;
      D_FGTS_qtd = round(rawFgtsParcels, 0);
      C_FGTS_val = D_FGTS_qtd * O16;
    }

    // Parcelas em Dinheiro (Cash) = Total - Embutido - FGTS
    // Note: If Total Bid was entered as %, it includes everything.
    // If the user meant "Total = Cash + Embutido + FGTS", then Cash is the remainder.
    const cashParcels = totalBidParcels - D20_qtd_parcelas_embutido - D_FGTS_qtd;

    const B30_creditoDisponivel = credito - C20_lance_embutido_val;

    let parcelasAbatidas = 0;
    if (diluirLance === 1) {
      parcelasAbatidas = totalBidParcels;
    } else if (diluirLance === 3) {
      parcelasAbatidas = 0;
    } else if (diluirLance === 2) {
      parcelasAbatidas = 0;
    }

    const B28_qtd_parcelas_pagas = 1 + parcelasAbatidas + (lanceNaAssembleia - 1);
    const B29_parcelasAPagarQtd = qtdMeses - B28_qtd_parcelas_pagas;

    // L27: Valor Amortizado (em parcelas)
    // Considera TOTAL ofertado (Cash + Embutido + FGTS)
    const L27 = ((cashParcels + D20_qtd_parcelas_embutido + D_FGTS_qtd) * O15) + O12;

    const L28 = N13 - L27;
    const B27_saldoDevedor = L28 * credito;

    const L29 = ifError(() => round(L28 / B29_parcelasAPagarQtd, 6), 0);

    // Seguros Pós-Contemplação
    const M27_seguro_vida_pos = (L16_CONST * B27_saldoDevedor) * (tipoSeguro === 'Automóvel' ? 1 : 0);
    const M28_seguro_garantia_pos = (L17_CONST * B27_saldoDevedor) * (tipoSeguro === 'Imóvel' ? 1 : 0);

    const C29_parcelasAPagarValor = ifError(() => (L29 * credito) + M27_seguro_vida_pos + M28_seguro_garantia_pos, 0);

    return {
      valorParcela: valorParcelaInicial,
      valorDemaisParcelas: valorDemaisParcelas,
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