import { z } from "zod";
import { queryReadOnly } from "../db.js";
import { enforceLimit } from "../security.js";

export const ListarVeiculosUtvSchema = z.object({
  status: z
    .string()
    .optional()
    .describe("Status do UTV (ex: 'disponivel', 'em_uso', 'manutencao', 'todos')"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe("Máximo de registros a retornar"),
});

export const ListarUsosUtvSchema = z.object({
  veiculoId: z
    .string()
    .optional()
    .describe("Filtrar por ID do UTV"),
  cotistaId: z
    .string()
    .optional()
    .describe("Filtrar por ID do cotista de UTV"),
  data_inicio: z
    .string()
    .optional()
    .describe("Data inicial de uso (YYYY-MM-DD)"),
  data_fim: z
    .string()
    .optional()
    .describe("Data final de uso (YYYY-MM-DD)"),
  status: z
    .string()
    .optional()
    .describe("Status do uso (ex: 'reservado', 'em_andamento', 'finalizado', 'cancelado')"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe("Máximo de registros a retornar"),
});

export async function handlerListarVeiculosUtv(args: z.infer<typeof ListarVeiculosUtvSchema>) {
  const { status } = args;
  const limit = enforceLimit(args.limit);

  let sql = "SELECT * FROM UtvVeiculos";
  const params: any[] = [];

  if (status && status !== "todos") {
    sql += " WHERE status = ?";
    params.push(status);
  }

  sql += " ORDER BY nome ASC LIMIT ?";
  params.push(limit);

  const rows = await queryReadOnly<any>(sql, params);

  return {
    total: rows.length,
    veiculos: rows.map((v) => ({
      id: v.id,
      nome: v.nome,
      modelo: v.modelo,
      ano: v.ano,
      status: v.status,
      kmAtual: Number(v.kmAtual) || 0,
      horimetroAtual: Number(v.horimetroAtual) || 0,
      observacoes: v.observacoes || undefined,
    })),
  };
}

export async function handlerListarUsosUtv(args: z.infer<typeof ListarUsosUtvSchema>) {
  const { veiculoId, cotistaId, data_inicio, data_fim, status } = args;
  const limit = enforceLimit(args.limit);

  let whereClauses: string[] = ["1=1"];
  const params: any[] = [];

  if (veiculoId) {
    whereClauses.push("u.veiculoId = ?");
    params.push(veiculoId);
  }

  if (cotistaId) {
    whereClauses.push("u.cotistaId = ?");
    params.push(cotistaId);
  }

  if (data_inicio) {
    whereClauses.push("u.dataUso >= ?");
    params.push(data_inicio);
  }

  if (data_fim) {
    whereClauses.push("u.dataUso <= ?");
    params.push(data_fim);
  }

  if (status && status !== "todos") {
    whereClauses.push("u.status = ?");
    params.push(status);
  }

  const whereSql = whereClauses.join(" AND ");

  const sql = `
    SELECT u.*, v.nome as veiculoNome, c.nome as cotistaNome, c.cotaNumero
    FROM UtvUsos u
    LEFT JOIN UtvVeiculos v ON u.veiculoId = v.id
    LEFT JOIN UtvCotistas c ON u.cotistaId = c.id
    WHERE ${whereSql}
    ORDER BY u.dataUso DESC, u.horaSaida DESC
    LIMIT ?
  `;
  const rows = await queryReadOnly<any>(sql, [...params, limit]);

  return {
    total: rows.length,
    usos: rows.map((u) => ({
      id: u.id,
      veiculo: u.veiculoNome || u.veiculoId,
      cotista: u.cotistaNome || u.cotistaId,
      cotaNumero: u.cotaNumero,
      dataUso: u.dataUso,
      status: u.status,
      horaSaida: u.horaSaida,
      horaChegada: u.horaChegada,
      kmRodado: Number(u.kmRodado) || 0,
      horasUtilizadas: Number(u.horasUtilizadas) || 0,
      tanqueSaida: u.tanqueSaida,
      tanqueChegada: u.tanqueChegada,
      observacoes: u.observacoesSaida || u.observacoesChegada || undefined,
    })),
  };
}
