export interface Cliente {
  empresas?: string[];
  id: string;
  nome: string;
  embarcacaoId: string; // ID or Code of the Embarcacao they own a share of (primary)
  cota: string;         // The cota code, e.g., "C3" (primary)
  embarcacoes?: Array<{
    embarcacaoId: string;
    cota: string;
    acessorios?: {
      tenda?: boolean;
      mesa?: boolean;
      bancosCadeiras?: boolean;
      churrasqueira?: boolean;
      observacoes?: string;
    };
  }>;
  telefone?: string;
  email?: string;
  cpf?: string;
  dataNascimento?: string;
  dataCadastro: string;
  cep?: string;
  logradouro?: string;
  numeroEnd?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  plano?: 'completo' | 'normal';
  statusFinanceiro?: 'em_dia' | 'inadimplente' | 'pendente';
  status?: 'ativo' | 'inativo';
  temLancamentos?: boolean;
  temValoresEmAberto?: boolean;
  observacoesFinanceiras?: string;
  asaasCustomerId?: string;
  rg?: string;
  orgaoEmissor?: string;
  cnh_cha?: string;
  profissao?: string;
  estadoCivil?: string;
  numeroHabilitacao?: string;
  validadeHabilitacao?: string;
  orgaoEmissorHabilitacao?: string;
  categoriaHabilitacao?: string;
  acessorios?: {
    tenda?: boolean;
    mesa?: boolean;
    bancosCadeiras?: boolean;
    churrasqueira?: boolean;
    observacoes?: string;
  };
}

export interface RegistroHoras {
  id: string;
  embarcacaoId: string;
  horas: number;
  data: string; // ISO Timestamp
  observacao?: string;
  registradoPor?: string;
  createdAt: string;
}

export interface RegistroAcessorios {
  id: string;
  embarcacaoId: string;
  data: string; // ISO Timestamp
  horasMotor?: number; // Engine hours recorded at conference time
  tenda?: boolean;
  mesa?: boolean;
  bancosCadeiras?: boolean;
  churrasqueira?: boolean;
  extintores?: boolean;
  observacoes?: string;
  statusConferencia?: 'conforme' | 'com_pendencia';
  registradoPor?: string;
  createdAt: string;
}

export interface ConfiguracaoHorimetro {
  intervaloPadraoLancha: number;
  intervaloPadraoJet: number;
  intervalosPorModeloJet?: Record<string, number>;
}

export interface Embarcacao {
  empresas?: string[];
  id: string;
  tipo: 'jet' | 'lancha';
  nome: string;
  numero: string; // Used to form the "MNN" pattern, e.g. "03" -> "M03"
  modelo: string;
  fabricante: string;
  ano: number;
  vaga?: string;
  tamanho?: string | number;
  chassi?: string; // N° do Chassi
  inscricao?: string; // N° de Inscrição na Marinha
  tipo_propulsao?: string; // Tipo de propulsão (ex: MOTOR, JET)
  capacidadePassageiros?: number; // Boat capacity
  potencia?: string; // Potência (ex: 250 HP)
  donos: string[]; // List of Cliente IDs (unlimited)
  googleCalendarId?: string; // Optional Google Calendar ID directly linked to the boat
  emManutencao?: boolean; // Tag for maintenance
  whatsappGroupId?: string; // Evolution API group ID for notifications
  imagemUrl?: string; // URL for the boat image
  documentoUrl?: string; // URL for the boat document PDF
  seguroUrl?: string; // URL for the boat insurance PDF
  temSom?: boolean; // Indicates if the boat requires sound control checks
  horasMotor?: number; // Track current engine hours
  ultimaAtualizacaoHoras?: string;
  horasUltimaManutencao?: number;
  proximaRevisaoHoras?: number;
  proprietarioId?: string;
  clienteId?: string;
  cotistas?: any[];
  horimetroActual?: number;
  historicoHoras?: RegistroHoras[];
  acessorios?: {
    tenda?: boolean;
    mesa?: boolean;
    bancosCadeiras?: boolean;
    churrasqueira?: boolean;
    extintores?: boolean;
    observacoes?: string;
    ultimaConferencia?: string;
    historico?: RegistroAcessorios[];
    statusInfo?: any;
  };
  statusOperacional?: 'disponivel' | 'em_manutencao' | 'pendencia';
  motivoStatus?: string;
  observacaoStatus?: string;
  dataAlteracaoStatus?: string;
  alteradoPorStatus?: string;
  previsaoLiberacao?: string;
  historicoStatus?: StatusHistoricoItem[];
}

export interface StatusHistoricoItem {
  id: string;
  status: 'disponivel' | 'em_manutencao' | 'pendencia';
  emManutencao: boolean;
  motivo?: string;
  observacoes?: string;
  dataAlteracao: string;
  alteradoPor: string;
  previsaoLiberacao?: string;
  horasMotor?: number;
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
  tipoReserva?: 'garantida' | 'extra';
  contestadaPor?: string; // clienteId de quem contestou
  contestadaEm?: string; // ISO datetime da contestação
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
  acessoriosSolicitados?: { tenda?: boolean; mesa?: boolean; churrasqueira?: boolean; bancos?: number; };
  horaDescida?: string;
  fotosExtrasDescida?: string[];
  fotosExtrasSubida?: string[];
  fotosChecklistDescida?: string[];
  fotosChecklistSaida?: string[];
  fotosChecklistChegada?: string[];
  horaSubida?: string;
  fotosChecklistSubida?: string[];
  checklistEquipamentos?: {
    som?: boolean;
    boias?: boolean;
    coletes?: boolean;
    extintor?: boolean;
  };
  checklistObservacoes?: string;
  observacoesChecklistDescida?: string;
  observacoesChecklistChegada?: string;
  observacoesChecklistSubida?: string;
  statusMarina?: 'agendado' | 'descida' | 'pier' | 'saida' | 'chegada' | 'guardada';
  statusOperacional?: string;
  operadorDescida?: string;
  operadorSaida?: string;
  operadorChegada?: string;
  operadorSubida?: string;
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
  funcionarioId?: string;
  funcionarioNome?: string;
  funcionarioCargo?: string;
  funcionarioSetor?: string;
  createdAt: string;
}

export interface Fornecedor {
  id: string;
  nomeFantasia: string;
  razaoSocial?: string;
  cnpjCpf?: string;
  empresaId?: string;
  empresa?: string;
  dadosBancarios?: any;
  status?: 'ativo' | 'inativo';
  createdAt?: string;
  updatedAt?: string;
}

export interface TransacaoFinanceira {
  id: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  dataPagamento?: string; // YYYY-MM-DD (nullable)
  status: 'lancado' | 'vencido' | 'pago' | 'cancelado' | 'aguardando_aprovacao';
  descricao: string;
  clienteId?: string; // Optional linkage to client
  embarcacaoId?: string; // Optional linkage to boat
  fornecedorId?: string;
  contaBancariaId?: string;
  planoContasId?: string;
  centroCustoId?: string;
  empresa?: string;
  grupoParcelamentoId?: string;
  numeroParcela?: number;
  totalParcelas?: number;
  comprovante?: string; // URL/Path to receipt file
  createdAt: string;
  asaasPaymentId?: string;
  asaasPaymentUrl?: string;
}

export interface AtividadeFinanceira {
  id: string;
  titulo: string;
  descricao?: string;
  status: 'a_fazer' | 'em_andamento' | 'concluido';
  setor?: 'financeiro' | 'pecas_servicos';
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

export interface Chamado {
  id: string;
  codigoChamado: string;
  embarcacaoId: string;
  solicitanteTipo: 'gerente' | 'operador' | 'administrador' | 'cliente' | 'pecas_servicos';
  solicitanteNome: string;
  clienteId?: string;
  titulo: string;
  descricaoAvaria: string;
  urgencia: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'pendente' | 'em_analise' | 'parcialmente_atendido' | 'os_gerada' | 'rejeitado' | 'concluido' | 'descartado';
  osIds?: string[];
  dataAbertura: string;
  observacoesAnalise?: string;
  bloqueouEmbarcacao?: boolean;
  dataBloqueio?: string;
  dataResolucao?: string;
  createdAt: string;
}

export interface PecaItem {
  id?: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  custoUnitario?: number;
  tipo?: 'peca' | 'servico' | 'material' | 'outro';
}

export interface Manutencao {
  id: string;
  codigoOS?: string;
  chamadoId?: string;
  embarcacaoId: string;
  clienteId?: string;
  titulo?: string;
  tituloChamado?: string;
  tipo?: TipoManutencao;
  tipoManutencaoId?: string;
  tipoManutencaoNome?: string;
  categoria?: 'preventiva' | 'corretiva' | 'revisao_periodica' | 'emergencial';
  mecanicoResponsavelId?: string;
  mecanicoNome?: string;
  mecanico?: string | null;
  dataEntradaOficina?: string;
  dataSaida?: string;
  dataChamado?: string;
  prazoEntrega?: string;
  previsaoTermino?: string;
  dataTermino?: string;
  concluidoEm?: string;
  urgencia?: 'baixa' | 'media' | 'alta' | 'critica';
  custoTotal?: number;
  custo?: number | null;
  orcamento?: number | null;
  valorRepassado?: number | null;
  orcamentoStatus?: 'pendente' | 'enviado' | 'aprovado' | 'reprovado';
  status: 'aguardando_orcamento' | 'aguardando_aprovacao' | 'em_execucao' | 'concluido' | 'reprovado';
  localizacao?: 'marina' | 'oficina_externa';
  descricaoServico?: string;
  gerarFinanceiro?: boolean;
  horasMotorAtual?: number;
  proximaRevisaoHoras?: number;
  acessorios?: {
    tenda?: boolean;
    mesa?: boolean;
    bancosCadeiras?: boolean;
    churrasqueira?: boolean;
    extintores?: boolean;
  };
  pecas?: PecaItem[];
  whatsappStatus?: 'nao_enviado' | 'orcamento_enviado' | 'aprovado' | 'concluido';
  cotistasSelecionados?: string[]; // IDs dos cotistas selecionados para pagamento/rateio
  // === Campos do Fluxo Controlado ===
  fornecedorId?: string;
  custoReal?: number;
  margemLucro?: number;
  oficinaNome?: string;
  oficinaCnpj?: string;
  dataEnvioOrcamento?: string;
  dataAprovacao?: string;
  aprovadoPor?: string;
  dataInicioServico?: string;
  dataConclusao?: string;
  concluidoPor?: string;
  transacoesGeradas?: string[];
  fotosConclusao?: string[];
  createdAt: string;
}

export interface Mecanico {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  tipo?: "interno" | "oficina_externa";
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

export type Boat = Embarcacao;

export interface RegistroAtividade {
  id: string;
  createdAt: string;
  operadorNome?: string;
  acao?: string;
  detalhes?: string;
  embarcacaoId?: string;
}

export interface CatalogoEpi {
  id: string;
  nome: string;
  caPadrao?: string;
  createdAt: string;
}

export interface TipoManutencao {
  id: string;
  nome: string;
  descricao?: string;
  createdAt: string;
}

export type TipoTransacaoCaixa = 'entrada' | 'saida';

export type CategoriaTransacaoCaixa = 
  | 'combustivel'
  | 'descida_avulsa_jet'
  | 'descida_avulsa_lancha'
  | 'aluguel_coletes'
  | 'diarista'
  | 'compra_operacional'
  | 'manutencao_equipamentos'
  | 'limpeza_pier'
  | 'sangria'
  | 'suprimento'
  | 'outros_entrada'
  | 'outros_saida';

export type FormaPagamentoCaixa = 
  | 'dinheiro'
  | 'pix'
  | 'cartao_debito'
  | 'cartao_credito'
  | 'transferencia'
  | 'faturado'
  | 'outro';

export interface TransacaoCaixaMarina {
  id: string;
  tipo: TipoTransacaoCaixa;
  categoria: CategoriaTransacaoCaixa | string;
  descricao: string;
  valor: number;
  formaPagamento: FormaPagamentoCaixa | string;
  data: string; // YYYY-MM-DD
  hora?: string; // HH:mm
  status?: 'confirmado' | 'pendente' | 'cancelado';
  clienteTipo?: 'avulso' | 'mensalista' | 'cotista';
  clienteId?: string | null;
  clienteNome?: string | null;
  embarcacaoId?: string | null;
  embarcacaoNome?: string | null;
  reservaId?: string | null;
  combustivelLitros?: number | null;
  quantidadeColetes?: number | null;
  coletesDevolvidos?: boolean;
  dataDevolucaoColetes?: string | null;
  comprovanteUrl?: string | null;
  observacoes?: string | null;
  registradoPor: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface FechamentoCaixaMarina {
  id: string;
  data: string; // YYYY-MM-DD
  saldoAberturaDinheiro: number;
  totalEntradasDinheiro: number;
  totalSaidasDinheiro: number;
  totalSangriasDinheiro: number;
  saldoEsperadoDinheiro: number;
  saldoContadoDinheiro: number;
  diferencaDinheiro: number;
  totalPix: number;
  totalCartaoDebito: number;
  totalCartaoCredito: number;
  totalGeralEntradas: number;
  totalGeralSaidas: number;
  saldoFinalTotal: number;
  status: 'aberto' | 'fechado';
  abertoPor?: string | null;
  abertoEm?: string | null;
  fechadoPor?: string | null;
  fechadoEm?: string | null;
  observacoesFechamento?: string | null;
  createdAt: string;
}

export interface CentroDeCusto {
  id: string;
  nome: string;
  empresa: string;
  status: 'ativo' | 'inativo';
  createdAt?: string;
  updatedAt?: string;
}
