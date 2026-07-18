export interface Cliente {
  id: string;
  nome: string;
  embarcacaoId: string; // ID or Code of the Embarcacao they own a share of (primary)
  cota: string;         // The cota code, e.g., "C3" (primary)
  embarcacoes?: Array<{
    embarcacaoId: string;
    cota: string;
  }>;
  telefone?: string;
  email?: string;
  cpf?: string;
  dataCadastro: string;
  cep?: string;
  logradouro?: string;
  numeroEnd?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  statusFinanceiro?: 'em_dia' | 'inadimplente';
  observacoesFinanceiras?: string;
  plano?: 'normal' | 'completo';
}

export interface Embarcacao {
  id: string;
  tipo: 'jet' | 'lancha';
  nome: string;
  numero: string; // Used to form the "MNN" pattern, e.g. "03" -> "M03"
  modelo: string;
  fabricante: string;
  ano: number;
  donos: string[]; // List of Cliente IDs (unlimited)
  googleCalendarId?: string; // Optional Google Calendar ID directly linked to the boat
  emManutencao?: boolean; // Tag for maintenance
  whatsappGroupId?: string; // Evolution API group ID for notifications
  imagemUrl?: string; // URL for the boat image
  temSom?: boolean; // Indicates if the boat requires sound control checks
  horasMotor?: number; // Track current engine hours
}

export interface Reserva {
  id: string;
  embarcacaoId: string;
  clienteId: string; // Must be one of the owners of the boat
  data: string; // Format: YYYY-MM-DD
  periodo: 'dia_inteiro' | 'manha' | 'tarde';
  observações?: string;
  googleEventId?: string;
  status: 'confirmado' | 'cancelado' | 'agendado';
  createdAt: string;
  somRetirado?: boolean;
  somTesteSaida?: string;
  somTesteRetorno?: string;
  horaSaida?: string;
  horaChegada?: string;
  previsaoSaida?: string;
  previsaoChegada?: string;
  destino?: string;
  pessoasABordo?: number | string;
  horaDescida?: string;
  fotosChecklistDescida?: string[];
  fotosChecklistSaida?: string[];
  fotosChecklistChegada?: string[];
  statusMarina?: 'agendado' | 'descida' | 'pier' | 'saida' | 'chegada';
  operadorDescida?: string;
  operadorSaida?: string;
  operadorChegada?: string;
  confirmacaoEnviada?: boolean;
}

export interface ControleSom {
  id: string;
  reservaId?: string;
  embarcacaoId: string;
  clienteId: string;
  data: string;
  somRetirado: boolean;
  somTesteSaida?: string;
  somTesteRetorno?: string;
  observacoes?: string;
  createdAt: string;
}

export interface SyncConfig {
  clientId: string;
  isConnected: boolean;
  accessToken: string | null;
  calendarId: string;
}

export interface Usuario {
  id: string;
  username: string;
  senha?: string;
  role?: string;
  createdAt: string;
}

export interface TransacaoFinanceira {
  id: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  dataPagamento?: string; // YYYY-MM-DD (nullable)
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado' | 'aguardando_aprovacao';
  descricao: string;
  clienteId?: string; // Optional linkage to client
  embarcacaoId?: string; // Optional linkage to boat
  comprovante?: string; // URL/Path to receipt file
  createdAt: string;
}

export interface AtividadeFinanceira {
  id: string;
  titulo: string;
  descricao?: string;
  status: 'a_fazer' | 'em_andamento' | 'concluido';
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  clienteId?: string | null;
  nomeCliente?: string | null;
  telefoneCliente?: string | null;
  categoria: 'reclamacao' | 'sugestao' | 'elogio' | 'outro';
  nota: number;
  comentario: string;
  status: 'pendente' | 'em_analise' | 'resolvido' | 'arquivado';
  respostaAdmin?: string | null;
  createdAt: string;
}

export interface Manutencao {
  id: string;
  embarcacaoId: string;
  dataSaida: string; // YYYY-MM-DD
  mecanico?: string | null;
  orcamento?: number | null;
  custo?: number | null;
  valorRepassado?: number | null;
  status: 'em_andamento' | 'concluido' | 'cancelado';
  descricaoServico?: string;
  gerarFinanceiro?: boolean; // apenas para frontend
  horasMotorAtual?: number; // Engine hours when maintenance started
  proximaRevisaoHoras?: number; // Engine hours due for next revision
  createdAt: string;
}

export interface Mecanico {
  id: string;
  nome: string;
  cnpj?: string;
  createdAt: string;
}

export interface Turno {
  dia: number; // 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
  entrada: string; // Formato HH:mm
  saida: string; // Formato HH:mm
  pausaInicio?: string;
  pausaFim?: string;
}

export interface Funcionario {
  id: string;
  usuarioId?: string; // Vínculo com um Usuário do sistema
  nome: string;
  cargo: string;
  setor: string;
  cpf?: string;
  admissao?: string;
  rg?: string;
  rgEmissao?: string;
  rgOrgao?: string;
  rgUF?: string;
  ctps?: string;
  pis?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  filiacao?: string;
  conjugue?: string;
  grauInstrucao?: string;
  primeiroEmprego?: boolean;
  contratoExperiencia?: string;
  endereco?: string;
  numero?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  contatoEmergencia?: string;
  salarioBase?: string;
  dadosBancarios?: string;
  tamanhoCalca?: string;
  tamanhoCamisa?: string;
  tamanhoBota?: string;
  tamanhoCinto?: string;
  turnos: Turno[];
  createdAt: string;
}

export interface Folga {
  id: string;
  funcionarioId: string;
  data: string; // YYYY-MM-DD
  tipo: 'domingo' | 'semana' | 'compensacao_feriado' | 'outro';
  status: 'pendente' | 'aprovada' | 'rejeitada';
  feriadoTrabalhado?: string; // Usado caso tipo = 'compensacao_feriado'
  observacao?: string;
  createdAt: string;
}

export interface EpiEntrega {
  id: string;
  funcionarioId: string;
  quantidade: string;
  descricao: string;
  ca: string;
  dataEntrega: string;
  dataDevolucao?: string;
  status: 'pendente' | 'em_uso' | 'devolvido';
  geradoEm: string;
  historicoTrocas?: any[];
}

export interface HistoricoEPIMensal {
  id: string;
  funcionarioId: string;
  mesAno: string; // Ex: "2026-07"
  dadosSnapshot: string; // JSON content of the table at the time
  createdAt: string;
}

export interface CatalogoEpi {
  id: string;
  nome: string;
  caPadrao?: string;
  createdAt: string;
}
