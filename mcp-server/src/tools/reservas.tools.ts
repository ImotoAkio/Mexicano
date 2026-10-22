import { z } from "zod";
import { queryReadOnly } from "../db.js";
import { sanitizeReservation, enforceLimit } from "../security.js";

export const ListarReservasSchema = z.object({
  data_inicio: z
    .string()
    .optional()
    .describe("Data de início no formato YYYY-MM-DD"),
  data_fim: z
    .string()
    .optional()
    .describe("Data final no formato YYYY-MM-DD"),
  embarcacaoId: z
    .string()
    .optional()
    .describe("Filtrar por ID da embarcação"),
  clienteId: z
    .string()
    .optional()
    .describe("Filtrar por ID do cliente"),
  status: z
    .string()
    .optional()
    .default("todos")
    .describe("Filtrar por status da reserva (ex: 'confirmado', 'pendente', 'cancelado', 'todos')"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe("Número máximo de registros a retornar (máximo de 50)"),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Offset de paginação"),
});

export const ConsultarSaidasDoDiaSchema = z.object({
  data: z
    .string()
    .optional()
    .describe("Data no formato YYYY-MM-DD. Se omitido, consulta o dia de hoje."),
});

export async function handlerListarReservas(args: z.infer<typeof ListarReservasSchema>) {
  const { data_inicio, data_fim, embarcacaoId, clienteId, status, offset } = args;
  const limit = enforceLimit(args.limit);

  let whereClauses: string[] = ["1=1"];
  const params: any[] = [];

  if (data_inicio) {
    whereClauses.push("r.data >= ?");
    params.push(data_inicio);
  }

  if (data_fim) {
    whereClauses.push("r.data <= ?");
    params.push(data_fim);
  }

  if (embarcacaoId) {
    whereClauses.push("r.embarcacaoId = ?");
    params.push(embarcacaoId);
  }

  if (clienteId) {
    whereClauses.push("r.clienteId = ?");
    params.push(clienteId);
  }

  if (status && status !== "todos") {
    whereClauses.push("r.status = ?");
    params.push(status);
  }

  const whereSql = whereClauses.join(" AND ");

  // Total
  const countRows = await queryReadOnly<any>(
    `SELECT COUNT(*) as total FROM Reservas r WHERE ${whereSql}`,
    params
  );
  const total = countRows[0]?.total || 0;

  // Consulta paginada
  const sql = `
    SELECT r.*, e.nome as embarcacaoNome, c.nome as clienteNome
    FROM Reservas r
    LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
    LEFT JOIN Clientes c ON r.clienteId = c.id
    WHERE ${whereSql}
    ORDER BY r.data DESC, r.horaSaida ASC
    LIMIT ? OFFSET ?
  `;
  const rows = await queryReadOnly<any>(sql, [...params, limit, offset]);

  return {
    paginacao: {
      total,
      limit,
      offset,
      retornados: rows.length,
      temMais: offset + rows.length < total,
    },
    reservas: rows.map(sanitizeReservation),
  };
}

export async function handlerConsultarSaidasDoDia(
  args: z.infer<typeof ConsultarSaidasDoDiaSchema>
) {
  const dataHoje = new Date().toISOString().split("T")[0];
  const targetDate = args.data || dataHoje;

  const sql = `
    SELECT r.*, e.nome as embarcacaoNome, e.vaga as embarcacaoVaga, c.nome as clienteNome
    FROM Reservas r
    LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
    LEFT JOIN Clientes c ON r.clienteId = c.id
    WHERE r.data = ? AND r.status != 'cancelado'
    ORDER BY r.horaSaida ASC
  `;
  const rows = await queryReadOnly<any>(sql, [targetDate]);

  return {
    dataReferencia: targetDate,
    totalAgendamentos: rows.length,
    saidas: rows.map((r) => ({
      reservaId: r.id,
      embarcacao: r.embarcacaoNome || r.embarcacaoId,
      vaga: r.embarcacaoVaga || "Pátio",
      cliente: r.clienteNome || r.clienteId,
      periodo: r.periodo,
      horaSaidaPrevista: r.horaSaida || "Não informada",
      horaChegadaPrevista: r.horaChegada || "Não informada",
      destino: r.destino || "Local",
      pessoasABordo: r.pessoasABordo || "1",
      status: r.status,
      observacoes: r.observacoes || undefined,
    })),
  };
}
