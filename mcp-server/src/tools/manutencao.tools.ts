import { z } from "zod";
import { queryReadOnly } from "../db.js";
import { sanitizeMaintenance, enforceLimit } from "../security.js";

export const ListarManutencoesSchema = z.object({
  embarcacaoId: z
    .string()
    .optional()
    .describe("Filtrar por ID da embarcação"),
  status: z
    .enum(["em_andamento", "concluido", "pendente", "todos"])
    .optional()
    .default("todos")
    .describe("Status da Ordem de Serviço"),
  mecanico: z
    .string()
    .optional()
    .describe("Nome ou parte do nome do mecânico responsável"),
  urgencia: z
    .string()
    .optional()
    .describe("Nível de urgência (ex: 'baixa', 'media', 'alta', 'urgente')"),
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

export const ConsultarDetalhesOsSchema = z.object({
  codigoOS: z
    .string()
    .optional()
    .describe("Código legível da OS (ex: 'OS-2026-001')"),
  osId: z
    .string()
    .optional()
    .describe("ID interno da OS no banco"),
});

export async function handlerListarManutencoes(args: z.infer<typeof ListarManutencoesSchema>) {
  const { embarcacaoId, status, mecanico, urgencia, offset } = args;
  const limit = enforceLimit(args.limit);

  let whereClauses: string[] = ["1=1"];
  const params: any[] = [];

  if (embarcacaoId) {
    whereClauses.push("m.embarcacaoId = ?");
    params.push(embarcacaoId);
  }

  if (status && status !== "todos") {
    whereClauses.push("m.status = ?");
    params.push(status);
  }

  if (mecanico && mecanico.trim().length > 0) {
    whereClauses.push("(m.mecanicoNome LIKE ? OR m.mecanico LIKE ?)");
    const searchTerm = `%${mecanico.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (urgencia && urgencia.trim().length > 0) {
    whereClauses.push("m.urgencia = ?");
    params.push(urgencia);
  }

  const whereSql = whereClauses.join(" AND ");

  // Total
  const countRows = await queryReadOnly<any>(
    `SELECT COUNT(*) as total FROM Manutencoes m WHERE ${whereSql}`,
    params
  );
  const total = countRows[0]?.total || 0;

  // Lista
  const sql = `
    SELECT m.*, b.nome as embarcacaoNome
    FROM Manutencoes m
    LEFT JOIN Embarcacoes b ON m.embarcacaoId = b.id
    WHERE ${whereSql}
    ORDER BY m.createdAt DESC
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
    manutencoes: rows.map(sanitizeMaintenance),
  };
}

export async function handlerConsultarDetalhesOs(
  args: z.infer<typeof ConsultarDetalhesOsSchema>
) {
  const { codigoOS, osId } = args;

  if (!codigoOS && !osId) {
    throw new Error("Informe 'codigoOS' ou 'osId'.");
  }

  let sql = `
    SELECT m.*, b.nome as embarcacaoNome, b.modelo as embarcacaoModelo
    FROM Manutencoes m
    LEFT JOIN Embarcacoes b ON m.embarcacaoId = b.id
    WHERE
  `;
  const params: any[] = [];

  if (osId) {
    sql += "m.id = ?";
    params.push(osId);
  } else {
    sql += "m.codigoOS = ?";
    params.push(codigoOS);
  }

  const rows = await queryReadOnly<any>(sql, params);
  if (rows.length === 0) {
    return { encontrado: false, mensagem: "Ordem de serviço não localizada." };
  }

  const os = rows[0];

  return {
    encontrado: true,
    os: {
      ...sanitizeMaintenance(os),
      pecasUtilizadas: os.pecas ? JSON.parse(os.pecas) : [],
      acessoriosChecados: os.acessorios ? JSON.parse(os.acessorios) : [],
      horasMotorAtual: os.horasMotorAtual || 0,
      proximaRevisaoHoras: os.proximaRevisaoHoras || 0,
    },
  };
}
