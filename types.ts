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
  planoLight: number;
  seguroPrestamista: number;
  percentualOfertado: number | '';
  percentualEmbutido: number | '';
  qtdParcelasOfertado: number;
  diluirLance: number;
  lanceNaAssembleia: number | '';
  // Campos específicos de Construção
  inccTaxa?: number | '';
  inccPeriodo?: 'semestral' | 'anual';
  mesContemplacao?: number | '';
  // Parâmetros de Investimento (Opcionais)
  aluguelEstimado?: number | ''; // % (ex: 1.0)
  taxaReinvestimento?: number | ''; // % a.m (ex: 0.8)
  valorizacaoImovel?: number | ''; // % a.a (ex: 6.0)
  valorizacaoImediata?: number | ''; // % (ex: 40)
}

export interface SimulationOutputs {
  valorParcela: number;
  creditoDisponivel: number;
  saldoDevedor: number;
  parcelasAPagarQtd: number;
  parcelasAPagarValor: number;
  lanceOfertadoValor: number;
  lanceEmbutidoValor: number;
  percentualParcela: number;
  parcContem: number;
  // Campos de INCC
  valorCartaAtualizado?: number;
  valorizacao?: number;
  // Campos de Investimento
  investimento?: {
    valorImovelFinal: number;
    lucroMensalInicial: number;
    rendaAluguelMensal: number;
    valorAcumuladoInvestimentos: number;
    rendaPassivaMensal: number;
    patrimonioTotal: number;
    rendaTotalFinal: number; // Renda Passiva + Aluguel (Se imóvel mantido)
  }
}

export const initialInputs: SimulationInputs = {
  clienteNome: '',
  consultorNome: '',
  tipoBem: 'Imóvel',
  credito: '',
  qtdMeses: '',
  taxa: '',
  planoLight: 1,
  seguroPrestamista: 1,
  percentualOfertado: '',
  percentualEmbutido: '',
  qtdParcelasOfertado: 0,
  diluirLance: 1,
  lanceNaAssembleia: '',
  inccTaxa: '',
  inccPeriodo: 'semestral',
  mesContemplacao: '',
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
