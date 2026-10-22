import { z } from "zod";
import { queryReadOnly } from "../db.js";
import { enforceLimit } from "../security.js";

export const ConsultarEstoqueCombustivelSchema = z.object({});

export const ListarAbastecimentosSchema = z.object({
  barco_nome: z
    .string()
    .optional()
    .describe("Filtrar abastecimentos por nome da embarcação"),
  data_inicio: z
    .string()
    .optional()
    .describe("Data inicial (YYYY-MM-DD)"),
  data_fim: z
    .string()
    .optional()
    .describe("Data final (YYYY-MM-DD)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe("Máximo de registros a retornar"),
});

export async function handlerConsultarEstoqueCombustivel() {
  const rows = await queryReadOnly<any>("SELECT * FROM CombustivelEstoque WHERE id = 1 LIMIT 1");
  if (rows.length === 0) {
    return { cadastrado: false, mensagem: "Estoque de combustível não inicializado." };
  }

  const est = rows[0];
  const tanquePrincipal = Number(est.tanque_principal) || 0;
  const tanqueCapacidade = Number(est.tanque_capacidade) || 1000;
  const alertaMinimo = Number(est.alerta_minimo) || 200;
  const percentualOcupacao = Math.round((tanquePrincipal / tanqueCapacidade) * 100);

  return {
    cadastrado: true,
    tanquePrincipal: {
      litrosDisponiveis: tanquePrincipal,
      capacidadeTotal: tanqueCapacidade,
      percentualOcupacao: `${percentualOcupacao}%`,
      alertaMinimo: alertaMinimo,
      nivelCritico: tanquePrincipal <= alertaMinimo,
    },
    galoes: {
      quantidade: est.galoes_qtd || 0,
      capacidadePorGalao: Number(est.galoes_capacidade) || 20,
      galaoParcialLitros: Number(est.galao_parcial) || 0,
    },
    ultimaAtualizacao: est.ultima_atualizacao,
  };
}

export async function handlerListarAbastecimentos(
  args: z.infer<typeof ListarAbastecimentosSchema>
) {
  const { barco_nome, data_inicio, data_fim } = args;
  const limit = enforceLimit(args.limit);

  let whereClauses: string[] = ["1=1"];
  const params: any[] = [];

  if (barco_nome && barco_nome.trim().length > 0) {
    whereClauses.push("barco_nome LIKE ?");
    params.push(`%${barco_nome.trim()}%`);
  }

  if (data_inicio) {
    whereClauses.push("data_hora >= ?");
    params.push(data_inicio);
  }

  if (data_fim) {
    whereClauses.push("data_hora <= ?");
    params.push(`${data_fim} 23:59:59`);
  }

  const whereSql = whereClauses.join(" AND ");

  const sql = `
    SELECT id, tipo, litros, galoes, barco_nome, operador, data_hora, detalhes
    FROM CombustivelMovimentacoes
    WHERE ${whereSql}
    ORDER BY data_hora DESC
    LIMIT ?
  `;
  const rows = await queryReadOnly<any>(sql, [...params, limit]);

  return {
    total: rows.length,
    movimentacoes: rows.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      litros: Number(m.litros) || 0,
      galoes: m.galoes || 0,
      barco: m.barco_nome || "N/A",
      operador: m.operador,
      dataHora: m.data_hora,
      detalhes: m.detalhes,
    })),
  };
}
