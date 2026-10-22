import { z } from "zod";
import { queryReadOnly } from "../db.js";
import {
  sanitizeClient,
  sanitizeBoat,
  sanitizeReservation,
  sanitizeTransaction,
  sanitizeMaintenance,
  safeJsonParse,
} from "../security.js";

export const ObterVisao360ClienteSchema = z.object({
  termo: z
    .string()
    .min(2, "Informe pelo menos 2 caracteres do nome ou ID do cliente")
    .describe("Nome parcial, nome completo ou ID do cliente"),
  empresa: z
    .string()
    .optional()
    .describe("Filtrar por empresa (ex: 'VALE', 'MEXICANO', 'Marina' ou omitir para todas)"),
});

export const ObterVisao360EmbarcacaoSchema = z.object({
  termo: z
    .string()
    .min(2, "Informe pelo menos 2 caracteres do nome ou ID da embarcação")
    .describe("Nome parcial, nome completo ou ID da lancha/barco"),
  empresa: z
    .string()
    .optional()
    .describe("Filtrar por empresa (ex: 'VALE', 'MEXICANO', 'Marina' ou omitir para todas)"),
});

export async function handlerVisao360Cliente(args: z.infer<typeof ObterVisao360ClienteSchema>) {
  const { termo, empresa } = args;

  // 1. Buscar cliente
  let clientQuery = `
    SELECT c.*
    FROM Clientes c
    WHERE (c.id = ? OR c.nome LIKE ?)
  `;
  const clientParams: any[] = [termo, `%${termo}%`];

  if (empresa && empresa !== "Todos") {
    clientQuery += ` AND EXISTS (SELECT 1 FROM ClienteEmpresas ce WHERE ce.clienteId = c.id AND ce.empresa = ?)`;
    clientParams.push(empresa);
  }

  clientQuery += ` LIMIT 5`;

  const clients = await queryReadOnly<any>(clientQuery, clientParams);

  if (clients.length === 0) {
    return {
      encontrado: false,
      mensagem: `Nenhum cliente encontrado com o termo '${termo}'${empresa ? ` na empresa '${empresa}'` : ""}.`,
    };
  }

  // Se houver mais de um, selecionamos o mais próximo e listamos os outros encontrados para facilitar
  const cliente = clients[0];
  const clienteSanitizado = sanitizeClient(cliente);

  // 2. Empresas vinculadas
  const empresasRows = await queryReadOnly<any>(
    "SELECT empresa FROM ClienteEmpresas WHERE clienteId = ?",
    [cliente.id]
  );
  const empresas = empresasRows.map((r) => r.empresa);

  // 3. Embarcações e Cotas do Cliente
  const cotasCliente = clienteSanitizado?.embarcacoes || [];
  let embarcacoesVinculadas: any[] = [];

  const boatIds = new Set<string>();
  if (cliente.embarcacaoId) boatIds.add(cliente.embarcacaoId);
  cotasCliente.forEach((c: any) => {
    if (c.embarcacaoId) boatIds.add(c.embarcacaoId);
  });

  if (boatIds.size > 0) {
    const placeholders = Array.from(boatIds).map(() => "?").join(",");
    const boatsRows = await queryReadOnly<any>(
      `SELECT id, nome, tipo, modelo, vaga, horasMotor, emManutencao, totalCotas FROM Embarcacoes WHERE id IN (${placeholders})`,
      Array.from(boatIds)
    );

    embarcacoesVinculadas = boatsRows.map((b) => {
      const cotaInfo = cotasCliente.find((c: any) => c.embarcacaoId === b.id);
      return {
        ...sanitizeBoat(b),
        cotaDoCliente: cotaInfo?.cota || cliente.cota || "Cota Titular",
      };
    });
  }

  // 4. Reservas / Agendamentos recentes e futuros
  const reservasRows = await queryReadOnly<any>(
    `SELECT r.*, e.nome as embarcacaoNome
     FROM Reservas r
     LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
     WHERE r.clienteId = ?
     ORDER BY r.data DESC
     LIMIT 10`,
    [cliente.id]
  );
  const reservas = reservasRows.map(sanitizeReservation);

  // 5. Situação Financeira (Lançamentos Pendentes / Atrasados)
  const pendenciasRows = await queryReadOnly<any>(
    `SELECT t.*, e.nome as embarcacaoNome
     FROM TransacoesFinanceiras t
     LEFT JOIN Embarcacoes e ON t.embarcacaoId = e.id
     WHERE t.clienteId = ? AND t.status IN ('pendente', 'atrasado')
     ORDER BY t.dataVencimento ASC
     LIMIT 15`,
    [cliente.id]
  );
  const lancamentosPendentes = pendenciasRows.map(sanitizeTransaction);

  const totalEmAberto = lancamentosPendentes.reduce((sum, item) => sum + (item?.valor || 0), 0);

  return {
    encontrado: true,
    outrosResultadosSugeridos:
      clients.length > 1
        ? clients.slice(1).map((c) => ({ id: c.id, nome: c.nome, cota: c.cota }))
        : undefined,
    dossieCliente: {
      perfil: {
        ...clienteSanitizado,
        empresas,
      },
      embarcacoes: embarcacoesVinculadas,
      resumoFinanceiro: {
        statusGeral: cliente.statusFinanceiro || "em_dia",
        observacoes: cliente.observacoesFinanceiras || null,
        totalValorEmAberto: totalEmAberto,
        quantidadeTitulosPendentes: lancamentosPendentes.length,
        titulosEmAberto: lancamentosPendentes,
      },
      ultimasReservasOuAgendamentos: reservas,
    },
  };
}

export async function handlerVisao360Embarcacao(args: z.infer<typeof ObterVisao360EmbarcacaoSchema>) {
  const { termo, empresa } = args;

  // 1. Buscar embarcação
  let boatQuery = `
    SELECT b.*
    FROM Embarcacoes b
    WHERE (b.id = ? OR b.nome LIKE ?)
  `;
  const boatParams: any[] = [termo, `%${termo}%`];

  if (empresa && empresa !== "Todos") {
    boatQuery += ` AND EXISTS (SELECT 1 FROM EmbarcacaoEmpresas ee WHERE ee.embarcacaoId = b.id AND ee.empresa = ?)`;
    boatParams.push(empresa);
  }

  boatQuery += ` LIMIT 5`;

  const boats = await queryReadOnly<any>(boatQuery, boatParams);

  if (boats.length === 0) {
    return {
      encontrado: false,
      mensagem: `Nenhuma embarcação encontrada com o termo '${termo}'${empresa ? ` na empresa '${empresa}'` : ""}.`,
    };
  }

  const boat = boats[0];
  const boatSanitizado = sanitizeBoat(boat);

  // 2. Empresas vinculadas
  const empresasRows = await queryReadOnly<any>(
    "SELECT empresa FROM EmbarcacaoEmpresas WHERE embarcacaoId = ?",
    [boat.id]
  );
  const empresas = empresasRows.map((r) => r.empresa);

  // 3. Cotistas / Donos
  // Busca cotistas cadastrados na tabela Clientes
  const cotistasRows = await queryReadOnly<any>(
    `SELECT id, nome, telefone, cota, statusFinanceiro, status, embarcacoes
     FROM Clientes
     WHERE embarcacaoId = ? OR embarcacoes LIKE ?`,
    [boat.id, `%"${boat.id}"%`]
  );

  const cotistas = cotistasRows.map((c) => {
    let cotaIdentificada = c.cota || "Cota";
    const parsedEmbarcacoes = safeJsonParse(c.embarcacoes, []);
    const match = parsedEmbarcacoes.find((item: any) => item.embarcacaoId === boat.id);
    if (match && match.cota) cotaIdentificada = match.cota;

    return {
      clienteId: c.id,
      nome: c.nome,
      cota: cotaIdentificada,
      statusFinanceiro: c.statusFinanceiro || "em_dia",
      status: c.status || "ativo",
    };
  });

  // 4. Próximos agendamentos e histórico recente de reservas
  const reservasRows = await queryReadOnly<any>(
    `SELECT r.*, c.nome as clienteNome
     FROM Reservas r
     LEFT JOIN Clientes c ON r.clienteId = c.id
     WHERE r.embarcacaoId = ?
     ORDER BY r.data DESC
     LIMIT 10`,
    [boat.id]
  );
  const reservas = reservasRows.map(sanitizeReservation);

  // 5. Histórico recente de Manutenções (OS)
  const manutencoesRows = await queryReadOnly<any>(
    `SELECT m.*, b.nome as embarcacaoNome
     FROM Manutencoes m
     LEFT JOIN Embarcacoes b ON m.embarcacaoId = b.id
     WHERE m.embarcacaoId = ?
     ORDER BY m.dataSaida DESC
     LIMIT 5`,
    [boat.id]
  );
  const manutencoes = manutencoesRows.map(sanitizeMaintenance);

  // 6. Abastecimentos recentes
  const combustivelRows = await queryReadOnly<any>(
    `SELECT *
     FROM CombustivelMovimentacoes
     WHERE barco_nome LIKE ? OR detalhes LIKE ?
     ORDER BY data_hora DESC
     LIMIT 5`,
    [`%${boat.nome}%`, `%${boat.id}%`]
  );

  return {
    encontrado: true,
    outrosResultadosSugeridos:
      boats.length > 1
        ? boats.slice(1).map((b) => ({ id: b.id, nome: b.nome, modelo: b.modelo }))
        : undefined,
    dossieEmbarcacao: {
      fichaTecnica: {
        ...boatSanitizado,
        empresas,
      },
      cotistasCadastrados: cotistas,
      totalCotistasAtivos: cotistas.length,
      vagasCotasOcupadas: `${cotistas.length}/${boatSanitizado?.totalCotas || 8}`,
      proximasReservasOuSaidas: reservas,
      manutencoesRecentes: manutencoes,
      ultimosAbastecimentos: combustivelRows.map((cb) => ({
        id: cb.id,
        tipo: cb.tipo,
        litros: Number(cb.litros) || 0,
        operador: cb.operador,
        dataHora: cb.data_hora,
        detalhes: cb.detalhes,
      })),
    },
  };
}
