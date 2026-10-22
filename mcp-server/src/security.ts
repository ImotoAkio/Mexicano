/**
 * Camada de Sanitização, Mascaramento e Segurança de Dados
 * Garante que NENHUM dado crítico (senhas, hashes, chaves de API, documentos brutos)
 * seja exposto ao contexto do Modelo de Linguagem (LLM).
 */

export function maskCpf(cpf?: string | null): string {
  if (!cpf) return "";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return "***.***.***-**";
  return `***.***.${cleaned.substring(6, 9)}-${cleaned.substring(9, 11)}`;
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 8) return "****-****";
  const lastFour = cleaned.slice(-4);
  return `(XX) X****-${lastFour}`;
}

export function safeJsonParse<T = any>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export function enforceLimit(limit?: number, max = 50, def = 20): number {
  if (!limit || isNaN(limit) || limit <= 0) return def;
  return Math.min(Math.floor(limit), max);
}

export function sanitizeClient(client: any) {
  if (!client) return null;

  return {
    id: client.id,
    nome: client.nome,
    telefone: client.telefone ? maskPhone(client.telefone) : undefined,
    email: client.email ? client.email.replace(/(?<=.{2}).(?=[^@]*?@)/g, "*") : undefined,
    cpfMascarado: maskCpf(client.cpf),
    status: client.status || "ativo",
    statusFinanceiro: client.statusFinanceiro || "em_dia",
    observacoesFinanceiras: client.observacoesFinanceiras || undefined,
    plano: client.plano || "normal",
    cota: client.cota || undefined,
    embarcacaoId: client.embarcacaoId || undefined,
    embarcacoes: safeJsonParse(client.embarcacoes, []),
    cidade: client.cidade || undefined,
    estado: client.estado || undefined,
    statusContrato: client.statusContrato || undefined,
    dataCadastro: client.dataCadastro || undefined,
    empresas: client.empresas || undefined,
  };
}

export function sanitizeBoat(boat: any) {
  if (!boat) return null;

  return {
    id: boat.id,
    nome: boat.nome,
    tipo: boat.tipo,
    numero: boat.numero || undefined,
    modelo: boat.modelo || undefined,
    fabricante: boat.fabricante || undefined,
    ano: boat.ano || undefined,
    vaga: boat.vaga || undefined,
    tamanho: boat.tamanho || undefined,
    tipoPropulsao: boat.tipo_propulsao || undefined,
    potencia: boat.potencia || undefined,
    emManutencao: Boolean(boat.emManutencao),
    temSom: Boolean(boat.temSom),
    totalCotas: Number(boat.totalCotas) || 8,
    capacidadePassageiros: boat.capacidadePassageiros ? Number(boat.capacidadePassageiros) : undefined,
    horasMotor: boat.horasMotor ? Number(boat.horasMotor) : 0,
    ultimaAtualizacaoHoras: boat.ultimaAtualizacaoHoras || undefined,
    horasUltimaManutencao: boat.horasUltimaManutencao ? Number(boat.horasUltimaManutencao) : 0,
    donos: safeJsonParse(boat.donos, []),
    acessorios: safeJsonParse(boat.acessorios, []),
    empresas: boat.empresas || undefined,
  };
}

export function sanitizeReservation(res: any) {
  if (!res) return null;

  return {
    id: res.id,
    embarcacaoId: res.embarcacaoId,
    embarcacaoNome: res.embarcacaoNome || undefined,
    clienteId: res.clienteId,
    clienteNome: res.clienteNome || undefined,
    data: res.data,
    periodo: res.periodo,
    status: res.status,
    horaSaida: res.horaSaida || undefined,
    horaChegada: res.horaChegada || undefined,
    destino: res.destino || undefined,
    pessoasABordo: res.pessoasABordo || undefined,
    observacoes: res.observacoes || undefined,
    createdAt: res.createdAt,
  };
}

export function sanitizeTransaction(tx: any) {
  if (!tx) return null;

  return {
    id: tx.id,
    tipo: tx.tipo, // 'receita' | 'despesa'
    categoria: tx.categoria,
    valor: Number(tx.valor) || 0,
    dataVencimento: tx.dataVencimento,
    dataPagamento: tx.dataPagamento || null,
    status: tx.status, // 'pago' | 'pendente' | 'atrasado' | 'cancelado'
    descricao: tx.descricao || "",
    clienteId: tx.clienteId || null,
    clienteNome: tx.clienteNome || undefined,
    embarcacaoId: tx.embarcacaoId || null,
    embarcacaoNome: tx.embarcacaoNome || undefined,
    empresa: tx.empresa || "Marina",
    numeroParcela: tx.numeroParcela || 1,
    totalParcelas: tx.totalParcelas || 1,
  };
}

export function sanitizeMaintenance(os: any) {
  if (!os) return null;

  return {
    id: os.id,
    codigoOS: os.codigoOS || os.id,
    embarcacaoId: os.embarcacaoId,
    embarcacaoNome: os.embarcacaoNome || undefined,
    clienteId: os.clienteId || undefined,
    titulo: os.titulo || os.tipoManutencaoNome || "Manutenção",
    tipoManutencaoNome: os.tipoManutencaoNome || undefined,
    categoria: os.categoria || undefined,
    status: os.status,
    urgencia: os.urgencia || "normal",
    mecanicoNome: os.mecanicoNome || os.mecanico || undefined,
    oficinaNome: os.oficinaNome || undefined,
    dataEntradaOficina: os.dataEntradaOficina || os.dataSaida || undefined,
    previsaoTermino: os.previsaoTermino || undefined,
    dataTermino: os.dataTermino || os.concluidoEm || undefined,
    orcamento: os.orcamento ? Number(os.orcamento) : undefined,
    custoTotal: os.custoTotal ? Number(os.custoTotal) : (os.custo ? Number(os.custo) : undefined),
    descricaoServico: os.descricaoServico || undefined,
    horasMotorAtual: os.horasMotorAtual ? Number(os.horasMotorAtual) : undefined,
    proximaRevisaoHoras: os.proximaRevisaoHoras ? Number(os.proximaRevisaoHoras) : undefined,
  };
}
