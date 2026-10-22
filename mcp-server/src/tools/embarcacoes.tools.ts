import { z } from "zod";
import { queryReadOnly } from "../db.js";
import { sanitizeBoat, enforceLimit, safeJsonParse } from "../security.js";

export const ListarEmbarcacoesSchema = z.object({
  empresa: z
    .string()
    .optional()
    .describe("Filtrar por empresa (ex: 'VALE', 'MEXICANO', 'Marina' ou omitir para todas)"),
  emManutencao: z
    .boolean()
    .optional()
    .describe("Filtrar embarcações atualmente em manutenção (true/false)"),
  tipo: z
    .string()
    .optional()
    .describe("Tipo de embarcação (ex: 'Lancha', 'Jet Ski', 'Veleiro')"),
  busca: z
    .string()
    .optional()
    .describe("Termo de busca textual para filtrar por nome, modelo ou vaga"),
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

export const ConsultarCotistasEmbarcacaoSchema = z.object({
  embarcacaoId: z
    .string()
    .optional()
    .describe("ID único da embarcação"),
  nomeEmbarcacao: z
    .string()
    .optional()
    .describe("Nome da embarcação caso não tenha o ID"),
});

export async function handlerListarEmbarcacoes(args: z.infer<typeof ListarEmbarcacoesSchema>) {
  const { empresa, emManutencao, tipo, busca, offset } = args;
  const limit = enforceLimit(args.limit);

  let whereClauses: string[] = ["1=1"];
  const params: any[] = [];

  if (typeof emManutencao === "boolean") {
    whereClauses.push("b.emManutencao = ?");
    params.push(emManutencao ? 1 : 0);
  }

  if (tipo && tipo.trim().length > 0) {
    whereClauses.push("b.tipo LIKE ?");
    params.push(`%${tipo.trim()}%`);
  }

  if (busca && busca.trim().length > 0) {
    whereClauses.push("(b.nome LIKE ? OR b.modelo LIKE ? OR b.vaga LIKE ?)");
    const searchTerm = `%${busca.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (empresa && empresa !== "Todos") {
    whereClauses.push(
      "EXISTS (SELECT 1 FROM EmbarcacaoEmpresas ee WHERE ee.embarcacaoId = b.id AND ee.empresa = ?)"
    );
    params.push(empresa);
  }

  const whereSql = whereClauses.join(" AND ");

  // Total
  const countRows = await queryReadOnly<any>(
    `SELECT COUNT(*) as total FROM Embarcacoes b WHERE ${whereSql}`,
    params
  );
  const total = countRows[0]?.total || 0;

  // Consulta paginada
  const sql = `
    SELECT b.*
    FROM Embarcacoes b
    WHERE ${whereSql}
    ORDER BY b.nome ASC
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
    embarcacoes: rows.map(sanitizeBoat),
  };
}

export async function handlerConsultarCotistasEmbarcacao(
  args: z.infer<typeof ConsultarCotistasEmbarcacaoSchema>
) {
  const { embarcacaoId, nomeEmbarcacao } = args;

  if (!embarcacaoId && !nomeEmbarcacao) {
    throw new Error("Informe 'embarcacaoId' ou 'nomeEmbarcacao'.");
  }

  let boatSql = "SELECT id, nome, totalCotas FROM Embarcacoes WHERE ";
  const boatParams: any[] = [];

  if (embarcacaoId) {
    boatSql += "id = ?";
    boatParams.push(embarcacaoId);
  } else {
    boatSql += "nome LIKE ? LIMIT 1";
    boatParams.push(`%${nomeEmbarcacao}%`);
  }

  const boatRows = await queryReadOnly<any>(boatSql, boatParams);
  if (boatRows.length === 0) {
    return { encontrado: false, mensagem: "Embarcação não encontrada." };
  }

  const boat = boatRows[0];

  // Buscar cotistas
  const clients = await queryReadOnly<any>(
    `SELECT id, nome, telefone, cota, statusFinanceiro, status, embarcacoes
     FROM Clientes
     WHERE embarcacaoId = ? OR embarcacoes LIKE ?`,
    [boat.id, `%"${boat.id}"%`]
  );

  const cotistas = clients.map((c) => {
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

  return {
    encontrado: true,
    embarcacao: {
      id: boat.id,
      nome: boat.nome,
      totalCotasDefinidas: boat.totalCotas || 8,
      cotasCadastradas: cotistas.length,
      vagasDisponiveis: Math.max(0, (boat.totalCotas || 8) - cotistas.length),
    },
    cotistas,
  };
}
