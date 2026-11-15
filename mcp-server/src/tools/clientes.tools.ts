import { z } from "zod";
import { queryReadOnly } from "../db.js";
import { sanitizeClient, enforceLimit } from "../security.js";

export const ListarClientesSchema = z.object({
  empresa: z
    .string()
    .optional()
    .describe("Filtrar por empresa (ex: 'VALE', 'MEXICANO', 'Marina' ou omitir para todas)"),
  status: z
    .string()
    .optional()
    .describe("Filtrar por status cadastral (ex: 'ativo', 'inativo')"),
  statusFinanceiro: z
    .string()
    .optional()
    .describe("Filtrar por status financeiro (ex: 'em_dia', 'inadimplente', 'bloqueado')"),
  busca: z
    .string()
    .optional()
    .describe("Termo de busca textual para filtrar por nome, ID ou cota"),
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

export const ConsultarDetalhesClienteSchema = z.object({
  clienteId: z
    .string()
    .optional()
    .describe("ID único do cliente"),
  nomeCliente: z
    .string()
    .optional()
    .describe("Nome (ou parte do nome) do cliente caso não tenha o ID"),
});

export async function handlerListarClientes(args: z.infer<typeof ListarClientesSchema>) {
  const { empresa, status, statusFinanceiro, busca, offset } = args;
  const limit = enforceLimit(args.limit);

  const whereClauses: string[] = ["1=1"];
  const params: any[] = [];

  if (status && status.trim().length > 0 && status !== "todos") {
    whereClauses.push("c.status = ?");
    params.push(status.trim());
  }

  if (statusFinanceiro && statusFinanceiro.trim().length > 0 && statusFinanceiro !== "todos") {
    whereClauses.push("c.statusFinanceiro = ?");
    params.push(statusFinanceiro.trim());
  }

  if (busca && busca.trim().length > 0) {
    whereClauses.push("(c.nome LIKE ? OR c.id LIKE ? OR c.cota LIKE ?)");
    const term = `%${busca.trim()}%`;
    params.push(term, term, term);
  }

  if (empresa && empresa !== "Todos") {
    whereClauses.push(
      "EXISTS (SELECT 1 FROM ClienteEmpresas ce WHERE ce.clienteId = c.id AND ce.empresa = ?)"
    );
    params.push(empresa);
  }

  const whereSql = whereClauses.join(" AND ");

  const countRows = await queryReadOnly<any>(
    `SELECT COUNT(*) as total FROM Clientes c WHERE ${whereSql}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const sql = `
    SELECT c.*
    FROM Clientes c
    WHERE ${whereSql}
    ORDER BY c.nome ASC
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
    clientes: rows.map(sanitizeClient),
  };
}

export async function handlerConsultarDetalhesCliente(
  args: z.infer<typeof ConsultarDetalhesClienteSchema>
) {
  const { clienteId, nomeCliente } = args;

  if (!clienteId && !nomeCliente) {
    throw new Error("Informe 'clienteId' ou 'nomeCliente'.");
  }

  let sql = "SELECT * FROM Clientes WHERE ";
  const params: any[] = [];

  if (clienteId) {
    sql += "id = ? LIMIT 1";
    params.push(clienteId);
  } else {
    sql += "nome LIKE ? ORDER BY nome ASC LIMIT 5";
    params.push(`%${nomeCliente}%`);
  }

  const rows = await queryReadOnly<any>(sql, params);
  if (rows.length === 0) {
    return { encontrado: false, mensagem: "Cliente não encontrado." };
  }

  const cliente = rows[0];
  const empresasRows = await queryReadOnly<any>(
    "SELECT empresa FROM ClienteEmpresas WHERE clienteId = ?",
    [cliente.id]
  );

  return {
    encontrado: true,
    cliente: {
      ...sanitizeClient(cliente),
      empresasVinculadas: empresasRows.map((r) => r.empresa),
    },
    outrosEncontrados:
      rows.length > 1
        ? rows.slice(1).map((r) => ({ id: r.id, nome: r.nome, status: r.status }))
        : undefined,
  };
}
