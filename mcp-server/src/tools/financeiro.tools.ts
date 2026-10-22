import { z } from "zod";
import { queryReadOnly } from "../db.js";
import { sanitizeTransaction, enforceLimit } from "../security.js";

export const ConsultarResumoFinanceiroSchema = z.object({
  empresa: z
    .string()
    .optional()
    .describe("Filtrar por empresa (ex: 'VALE', 'MEXICANO', 'Marina' ou omitir para todas)"),
  data_inicio: z
    .string()
    .describe("Data de início do período no formato YYYY-MM-DD"),
  data_fim: z
    .string()
    .describe("Data final do período no formato YYYY-MM-DD"),
});

export const ListarTransacoesFinanceirasSchema = z.object({
  empresa: z
    .string()
    .optional()
    .describe("Filtrar por empresa (ex: 'VALE', 'MEXICANO', 'Marina' ou omitir para todas)"),
  tipo: z
    .enum(["receita", "despesa", "todos"])
    .optional()
    .default("todos")
    .describe("Tipo da transação: 'receita', 'despesa' ou 'todos'"),
  status: z
    .enum(["pago", "pendente", "atrasado", "cancelado", "todos"])
    .optional()
    .default("todos")
    .describe("Status da transação"),
  categoria: z
    .string()
    .optional()
    .describe("Filtrar por categoria financeira"),
  clienteId: z
    .string()
    .optional()
    .describe("Filtrar por ID do cliente"),
  embarcacaoId: z
    .string()
    .optional()
    .describe("Filtrar por ID da embarcação vinculada"),
  data_inicio: z
    .string()
    .optional()
    .describe("Data inicial de vencimento (YYYY-MM-DD)"),
  data_fim: z
    .string()
    .optional()
    .describe("Data final de vencimento (YYYY-MM-DD)"),
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

export const ConsultarInadimplentesSchema = z.object({
  empresa: z
    .string()
    .optional()
    .describe("Filtrar por empresa (ex: 'VALE', 'MEXICANO', 'Marina' ou omitir para todas)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe("Número máximo de clientes inadimplentes a retornar"),
});

export async function handlerConsultarResumoFinanceiro(
  args: z.infer<typeof ConsultarResumoFinanceiroSchema>
) {
  const { empresa, data_inicio, data_fim } = args;

  let whereSql = "dataVencimento >= ? AND dataVencimento <= ? AND status != 'cancelado'";
  const params: any[] = [data_inicio, data_fim];

  if (empresa && empresa !== "Todos") {
    whereSql += " AND empresa = ?";
    params.push(empresa);
  }

  const sql = `
    SELECT
      tipo,
      status,
      SUM(valor) as totalValor,
      COUNT(*) as quantidade
    FROM TransacoesFinanceiras
    WHERE ${whereSql}
    GROUP BY tipo, status
  `;
  const rows = await queryReadOnly<any>(sql, params);

  let totalReceitasPrevistas = 0;
  let totalReceitasRecebidas = 0;
  let totalDespesasPrevistas = 0;
  let totalDespesasPagas = 0;
  let totalInadimplencia = 0;

  for (const r of rows) {
    const val = Number(r.totalValor) || 0;
    if (r.tipo === "receita") {
      totalReceitasPrevistas += val;
      if (r.status === "pago") totalReceitasRecebidas += val;
      if (r.status === "atrasado") totalInadimplencia += val;
    } else if (r.tipo === "despesa") {
      totalDespesasPrevistas += val;
      if (r.status === "pago") totalDespesasPagas += val;
    }
  }

  return {
    periodo: { data_inicio, data_fim },
    empresa: empresa || "Todas",
    balanco: {
      receitas: {
        previstas: totalReceitasPrevistas,
        recebidas: totalReceitasRecebidas,
        pendentesOuAtrasadas: totalReceitasPrevistas - totalReceitasRecebidas,
        inadimplentesConfirmadas: totalInadimplencia,
      },
      despesas: {
        previstas: totalDespesasPrevistas,
        pagas: totalDespesasPagas,
        aPagar: totalDespesasPrevistas - totalDespesasPagas,
      },
      saldos: {
        saldoPrevisto: totalReceitasPrevistas - totalDespesasPrevistas,
        saldoRealizado: totalReceitasRecebidas - totalDespesasPagas,
      },
    },
  };
}

export async function handlerListarTransacoesFinanceiras(
  args: z.infer<typeof ListarTransacoesFinanceirasSchema>
) {
  const {
    empresa,
    tipo,
    status,
    categoria,
    clienteId,
    embarcacaoId,
    data_inicio,
    data_fim,
    offset,
  } = args;
  const limit = enforceLimit(args.limit);

  let whereClauses: string[] = ["1=1"];
  const params: any[] = [];

  if (empresa && empresa !== "Todos") {
    whereClauses.push("t.empresa = ?");
    params.push(empresa);
  }

  if (tipo && tipo !== "todos") {
    whereClauses.push("t.tipo = ?");
    params.push(tipo);
  }

  if (status && status !== "todos") {
    whereClauses.push("t.status = ?");
    params.push(status);
  }

  if (categoria && categoria.trim().length > 0) {
    whereClauses.push("t.categoria LIKE ?");
    params.push(`%${categoria.trim()}%`);
  }

  if (clienteId) {
    whereClauses.push("t.clienteId = ?");
    params.push(clienteId);
  }

  if (embarcacaoId) {
    whereClauses.push("t.embarcacaoId = ?");
    params.push(embarcacaoId);
  }

  if (data_inicio) {
    whereClauses.push("t.dataVencimento >= ?");
    params.push(data_inicio);
  }

  if (data_fim) {
    whereClauses.push("t.dataVencimento <= ?");
    params.push(data_fim);
  }

  const whereSql = whereClauses.join(" AND ");

  // Total
  const countRows = await queryReadOnly<any>(
    `SELECT COUNT(*) as total FROM TransacoesFinanceiras t WHERE ${whereSql}`,
    params
  );
  const total = countRows[0]?.total || 0;

  // Lançamentos
  const sql = `
    SELECT t.*, c.nome as clienteNome, e.nome as embarcacaoNome
    FROM TransacoesFinanceiras t
    LEFT JOIN Clientes c ON t.clienteId = c.id
    LEFT JOIN Embarcacoes e ON t.embarcacaoId = e.id
    WHERE ${whereSql}
    ORDER BY t.dataVencimento DESC
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
    transacoes: rows.map(sanitizeTransaction),
  };
}

export async function handlerConsultarInadimplentes(
  args: z.infer<typeof ConsultarInadimplentesSchema>
) {
  const { empresa } = args;
  const limit = enforceLimit(args.limit);

  let whereSql = "t.status = 'atrasado' AND t.tipo = 'receita'";
  const params: any[] = [];

  if (empresa && empresa !== "Todos") {
    whereSql += " AND t.empresa = ?";
    params.push(empresa);
  }

  const sql = `
    SELECT
      c.id as clienteId,
      c.nome as clienteNome,
      c.telefone as clienteTelefone,
      COUNT(t.id) as titulosAtrasados,
      SUM(t.valor) as valorTotalDevido,
      MIN(t.dataVencimento) as dividaMaisAntiga,
      MAX(t.dataVencimento) as dividaMaisRecente
    FROM TransacoesFinanceiras t
    JOIN Clientes c ON t.clienteId = c.id
    WHERE ${whereSql}
    GROUP BY c.id, c.nome, c.telefone
    ORDER BY valorTotalDevido DESC
    LIMIT ?
  `;
  const rows = await queryReadOnly<any>(sql, [...params, limit]);

  return {
    totalInadimplentesListados: rows.length,
    inadimplentes: rows.map((r) => ({
      clienteId: r.clienteId,
      nome: r.clienteNome,
      titulosAtrasados: Number(r.titulosAtrasados) || 0,
      valorTotalDevido: Number(r.valorTotalDevido) || 0,
      dividaMaisAntiga: r.dividaMaisAntiga,
      dividaMaisRecente: r.dividaMaisRecente,
    })),
  };
}
