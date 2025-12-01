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
    const credito = Number(inputs.credito) || 0;
    const qtdMeses = Number(inputs.qtdMeses) || 0;
    const taxa = Number(inputs.taxa) || 0;
    const fundoReserva = Number(inputs.fundoReserva) || 0;
    const percentualOfertado = Number(inputs.percentualOfertado) || 0;
    const percentualEmbutido = Number(inputs.percentualEmbutido) || 0;
    const lanceNaAssembleia = Number(inputs.lanceNaAssembleia) || 1; // Default to 1 if empty
    const diluirLance = Number(inputs.diluirLance);

    const {
      planoLight, percentualRedutor, reducaoSobre,
      seguroPrestamista, tipoSeguro, percentualSeguro,
      taxaAdesao, percentualAdesao, mesesAdesao,
      lanceComFgts, percentualFgts
    } = inputs;

    if (qtdMeses === 0) return null;

    // 1. Calculate Initial Parcel (Full)
    const taxaTotal = taxa + fundoReserva;
    const taxaTotalDecimal = taxaTotal / 100;
    const saldoDevedorInicial = credito * (1 + taxaTotalDecimal);

    // Plano Light / Redutor
    let planoLightFactor = 1.0;
    if (planoLight) {
      const redutor = Number(percentualRedutor) || 0;
      planoLightFactor = 1 - (redutor / 100);
    }

    // Base Parcel Calculation
    let valorParcelaBase = 0;
    if (planoLight && reducaoSobre === 'Fundo Comum') {
      const fundoComum = 1.0; // 100%
      const fundoComumMensal = fundoComum / qtdMeses;
      const taxaMensal = taxaTotalDecimal / qtdMeses;
      const fundoComumReduzido = fundoComumMensal * planoLightFactor;
      const aliquotaMensal = fundoComumReduzido + taxaMensal;
      valorParcelaBase = credito * aliquotaMensal;
    } else {
      // Redução sobre Parcela Total
      const parcelaCheia = saldoDevedorInicial / qtdMeses;
      valorParcelaBase = parcelaCheia * planoLightFactor;
    }

    // Seguro Prestamista
    let valorSeguro = 0;
    if (seguroPrestamista) {
      if (percentualSeguro && Number(percentualSeguro) > 0) {
        valorSeguro = credito * (Number(percentualSeguro) / 100);
      } else {
        // Defaults based on constants if needed, or 0 if not specified
        // Using L16/L17 constants logic if applicable, applied to Credit or Saldo?
        // Reference implies simple addition. Let's assume 0 for now if not manual, 
        // or implement defaults if user asks. For now, manual input is prioritized.
        if (tipoSeguro === 'Automóvel') valorSeguro = saldoDevedorInicial * L16_CONST;
        else if (tipoSeguro === 'Imóvel') valorSeguro = saldoDevedorInicial * L17_CONST;
      }
    }

    const valorParcelaComSeguro = valorParcelaBase + valorSeguro;

    // Taxa de Adesão
    let valorParcelaInicial = valorParcelaComSeguro;
    let valorDemaisParcelas = valorParcelaComSeguro;
    if (taxaAdesao) {
      const adesaoTotal = (Number(percentualAdesao) / 100) * credito;
      const meses = Number(mesesAdesao) || 1;
      const parcelaAdesao = adesaoTotal / meses;
      valorParcelaInicial += parcelaAdesao;
    }

    // 2. Calculate Bids (Exact Values)
    const lanceOfertadoValor = (percentualOfertado / 100) * credito;
    const lanceEmbutidoValor = (percentualEmbutido / 100) * credito;

    let lanceFgtsValor = 0;
    if (lanceComFgts) {
      lanceFgtsValor = ((Number(percentualFgts) || 0) / 100) * credito;
    }

    // Total Bid used for amortization
    // If "Lance Ofertado" input includes Embutido (which it does in our UI logic), 
    // then Total = Lance Ofertado + FGTS (if FGTS is separate).
    // Wait, UI logic: "Lance Ofertado" is the TOTAL bid (Cash + Embutido).
    // "Lance Livre" is calculated as Ofertado - Embutido.
    // Does Ofertado include FGTS? 
    // In UI: `lanceLivreCalculado = Math.max(0, ofertado - embutido - fgts);`
    // This implies Ofertado INCLUDES FGTS.
    // So Total Amortization = Lance Ofertado Valor.

    const totalAmortizacao = lanceOfertadoValor;

    // 3. Post-Contemplation Logic
    // Saldo Devedor at moment of contemplation
    // Assume contemplation happens at 'lanceNaAssembleia' month.
    // Parcels paid = lanceNaAssembleia.
    // But usually, the bid is offered, and IF contemplated, it amortizes.
    // The "Saldo Devedor" displayed is usually the REMAINING debt.

    // Parcels paid BEFORE contemplation (normal parcels)
    const parcelasPagasQtd = lanceNaAssembleia;
    const valorPagoAteContemplacao = parcelasPagasQtd * valorParcelaBase; // Excluding Adesão/Seguro from amortization? Usually yes.
    // Actually, Saldo Devedor is reduced by the "Fundo Comum + Taxa" part of the parcel.
    // Let's simplify: Saldo Devedor Atual = Saldo Inicial - (ParcelaBase * ParcelasPagas).

    let saldoDevedorAtual = saldoDevedorInicial - (valorParcelaBase * parcelasPagasQtd);

    // Deduct Bid
    let saldoDevedorPosLance = saldoDevedorAtual - totalAmortizacao;

    // Crédito Disponível
    const creditoDisponivel = credito - lanceEmbutidoValor;

    // New Parcel / Term Calculation
    let novaParcela = 0;
    let novoPrazo = 0;
    const prazoRestanteOriginal = qtdMeses - parcelasPagasQtd;

    if (diluirLance === 1) { // Abater Prazo
      // Keep Parcel Value, Reduce Term
      // Novo Prazo = Saldo / Parcela
      // We use the Base Parcel (without insurance) for the term calc, then add insurance back?
      // Or use the full parcel? Usually full parcel (minus adesão).
      novaParcela = valorParcelaComSeguro;
      novoPrazo = Math.ceil(saldoDevedorPosLance / valorParcelaBase);
      // Note: Using Base for division to get raw months, insurance is added monthly.
    } else { // Diluir (Reduzir Parcela)
      // Keep Term, Reduce Parcel
      novoPrazo = prazoRestanteOriginal;
      const novaParcelaBase = saldoDevedorPosLance / novoPrazo;

      // Recalculate Insurance on new Saldo?
      // If Imóvel, insurance might change (L17).
      // For now, let's keep simple: Add original insurance amount or recalculate?
      // Reference: Parcela 866,97.
      // 85.830 / 99 = 866.969.
      // This matches EXACTLY 85.830 / 99.
      // So Insurance is NOT added here? Or it was 0?
      // In the reference, Seguro was 0.0000%.
      // So NovaParcela = NovaParcelaBase + Seguro.
      novaParcela = novaParcelaBase + valorSeguro;
    }

    return {
      valorParcela: valorParcelaInicial,
      valorDemaisParcelas: valorDemaisParcelas,
      creditoDisponivel: creditoDisponivel,
      saldoDevedor: saldoDevedorPosLance, // Displaying Post-Bid Balance
      parcelasAPagarQtd: novoPrazo,
      parcelasAPagarValor: novaParcela,
      lanceOfertadoValor: lanceOfertadoValor,
      lanceEmbutidoValor: lanceEmbutidoValor,
      percentualParcela: (valorParcelaBase / credito), // Approximate
      parcContem: parcelasPagasQtd,
    };

  } catch (error) {
    console.error("Error in simulation calculation:", error);
    return null;
  }
};