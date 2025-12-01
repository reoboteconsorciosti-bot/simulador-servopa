// Define User, Profile, UserRole, and simulation-related types to be used across the application.
export enum UserRole {
  Consultor = 'Consultor',
  Supervisor = 'Supervisor',
  Gerente = 'Gerente',
  Admin = 'Admin',
}

export interface Profile {
  name: string;
  photoUrl?: string;
  role: UserRole;
  teamId?: string;
}

export interface User {
  uid: string;
  email: string;
  profile: Profile;
}

// Types for the simulation
export interface SimulationInputs {
  clienteNome: string;
  consultorNome: string;
  tipoBem: 'Imóvel' | 'Automóvel';
  credito: number | '';
  qtdMeses: number | '';
  taxa: number | '';
  fundoReserva: number | '';

  // Reajuste
  tipoReajuste: 'Cota - Semestral' | 'Cota - Anual' | 'Cota - Mensal' | 'Grupo - Anual' | 'Grupo - Semestral' | 'Grupo - Mensal' | '';
  percentualReajuste: number | '';

  // Redutor (Plano Light)
  planoLight: boolean; // Toggle
  percentualRedutor: number | ''; // Input/Select
  reducaoSobre: 'Parcela Total' | 'Fundo Comum';

  // Seguro Prestamista
  seguroPrestamista: boolean; // Toggle
  tipoSeguro: 'Automóvel' | 'Imóvel' | 'Sem Seguro'; // Mantendo compatibilidade ou ajustando
  percentualSeguro: number | '';

  // Taxa de Adesão
  taxaAdesao: boolean; // Toggle
  percentualAdesao: number | '';
  mesesAdesao: number | '';

  percentualOfertado: number | '';
  percentualEmbutido: number | '';
  qtdParcelasOfertado: number;
  diluirLance: number;
  lanceNaAssembleia: number | '';

  // FGTS
  lanceComFgts: boolean; // Toggle
  percentualFgts: number | '';
}

export interface SimulationOutputs {
  valorParcela: number;
  valorDemaisParcelas: number;
  creditoDisponivel: number;
  saldoDevedor: number;
  parcelasAPagarQtd: number;
  parcelasAPagarValor: number;
  lanceOfertadoValor: number;
  lanceEmbutidoValor: number;
  percentualParcela: number;
  parcContem: number;
}

export const initialInputs: SimulationInputs = {
  clienteNome: '',
  consultorNome: '',
  tipoBem: 'Imóvel',
  credito: '',
  qtdMeses: '',
  taxa: '',
  fundoReserva: '',

  tipoReajuste: '',
  percentualReajuste: '',

  planoLight: false,
  percentualRedutor: '',
  reducaoSobre: 'Parcela Total',

  seguroPrestamista: false,
  tipoSeguro: 'Sem Seguro',
  percentualSeguro: '',

  taxaAdesao: false,
  percentualAdesao: '',
  mesesAdesao: '',

  percentualOfertado: '',
  percentualEmbutido: '',
  qtdParcelasOfertado: 0,
  diluirLance: 1,
  lanceNaAssembleia: '',

  lanceComFgts: false,
  percentualFgts: '',
};

export interface WebhookPayload {
  nome: string;
  consultor: string;
  credIndic: string;
  credDisp: string;
  saDev: string;
  praTotal: number | '';
  praPos: number;
  vParcaPag: string;
  vParcNorm: string;
  taxaAdm: string;
  percLanceOf: string;
  vLanceOf: string;
  percLanceEmb: string;
  vLanceEmb: string;
  perRecPro: string;
  vRecPro: string;
  parcContem: number;
  dataSimulacao: string;
  tipoBem: string;
}

export interface SavedSimulation extends SimulationInputs {
  id: string;
  timestamp: string;
}
