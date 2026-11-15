import { z } from "zod";
import { queryReadOnly, withControlledTransaction, getConfigValue } from "../db.js";
import { sanitizeReservation, enforceLimit } from "../security.js";

function getTodayBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

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
    .describe("Filtrar por status da reserva (ex: 'confirmado', 'agendado', 'pendente', 'cancelado', 'todos')"),
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

export const CriarReservaSchema = z.object({
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser YYYY-MM-DD")
    .describe("Data da reserva no formato YYYY-MM-DD"),
  embarcacaoId: z
    .string()
    .optional()
    .describe("ID da embarcação cadastrada (obrigatório quando origem for 'cota' ou 'marina')"),
  clienteId: z
    .string()
    .optional()
    .describe("ID do cliente/cotista (opcional para avulso/marina)"),
  periodo: z
    .string()
    .optional()
    .default("dia_inteiro")
    .describe("Período da reserva (ex: 'dia_inteiro', 'manha', 'tarde')"),
  origem: z
    .enum(["cota", "marina", "avulso"])
    .optional()
    .default("cota")
    .describe("Origem do agendamento: 'cota' (cotista), 'marina' (embarcação de marina) ou 'avulso' (visitante)"),
  previsaoSaida: z
    .string()
    .optional()
    .describe("Horário previsto de saída (ex: '09:00')"),
  previsaoChegada: z
    .string()
    .optional()
    .describe("Horário previsto de chegada (ex: '17:00')"),
  destino: z
    .string()
    .optional()
    .describe("Destino planejado da navegação"),
  pessoasABordo: z
    .union([z.number(), z.string()])
    .optional()
    .describe("Quantidade prevista de pessoas a bordo"),
  marinheiroPiloto: z
    .string()
    .optional()
    .describe("Nome do marinheiro ou piloto responsável"),
  litrosAbastecerPrevio: z
    .union([z.number(), z.string()])
    .optional()
    .describe("Quantidade de litros solicitada para abastecimento prévio"),
  nomeAvulso: z
    .string()
    .optional()
    .describe("Nome do cliente visitante (obrigatório quando origem = 'avulso')"),
  telefoneAvulso: z
    .string()
    .optional()
    .describe("Telefone do visitante avulso"),
  modeloAvulso: z
    .string()
    .optional()
    .describe("Nome/modelo da embarcação avulsa (obrigatório quando origem = 'avulso')"),
  tipoAvulso: z
    .enum(["lancha", "jet", "utv"])
    .optional()
    .default("lancha")
    .describe("Tipo da embarcação avulsa"),
  observacoes: z
    .string()
    .optional()
    .describe("Observações gerais da reserva ou instruções de descida"),
});

export const AtualizarReservaSchema = z.object({
  reservaId: z
    .string()
    .min(1)
    .describe("ID da reserva a ser atualizada"),
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser YYYY-MM-DD")
    .optional()
    .describe("Nova data da reserva no formato YYYY-MM-DD"),
  periodo: z
    .string()
    .optional()
    .describe("Novo período (ex: 'dia_inteiro', 'manha', 'tarde')"),
  status: z
    .enum(["agendado", "confirmado", "em_andamento", "concluido", "cancelado"])
    .optional()
    .describe("Novo status da reserva"),
  statusMarina: z
    .string()
    .optional()
    .describe("Status operacional na fila da marina (ex: 'agendado', 'na_agua', 'retornou', 'subiu')"),
  previsaoSaida: z
    .string()
    .optional()
    .describe("Horário previsto de saída (HH:MM)"),
  previsaoChegada: z
    .string()
    .optional()
    .describe("Horário previsto de chegada (HH:MM)"),
  destino: z
    .string()
    .optional()
    .describe("Destino da saída"),
  pessoasABordo: z
    .union([z.number(), z.string()])
    .optional()
    .describe("Quantidade de pessoas a bordo"),
  marinheiroPiloto: z
    .string()
    .optional()
    .describe("Marinheiro/piloto designado"),
  observacoes: z
    .string()
    .optional()
    .describe("Observações atualizadas da reserva"),
});

export const CancelarReservaSchema = z.object({
  reservaId: z
    .string()
    .min(1)
    .describe("ID da reserva a ser cancelada"),
  motivo: z
    .string()
    .optional()
    .describe("Motivo opcional do cancelamento para registro nas observações"),
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
  const dataHoje = getTodayBrasilia();
  const targetDate = args.data || dataHoje;

  const sql = `
    SELECT r.*, e.nome as embarcacaoNome, e.vaga as embarcacaoVaga, c.nome as clienteNome
    FROM Reservas r
    LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
    LEFT JOIN Clientes c ON r.clienteId = c.id
    WHERE r.data = ? AND r.status != 'cancelado'
    ORDER BY r.posicaoFila ASC, r.previsaoSaida ASC, r.horaSaida ASC
  `;
  const rows = await queryReadOnly<any>(sql, [targetDate]);

  return {
    dataReferencia: targetDate,
    totalAgendamentos: rows.length,
    saidas: rows.map((r) => ({
      reservaId: r.id,
      posicaoFila: r.posicaoFila || null,
      embarcacao: r.embarcacaoNome || r.modeloAvulso || r.embarcacaoId,
      vaga: r.embarcacaoVaga || "Pátio",
      cliente: r.clienteNome || r.nomeAvulso || r.clienteId,
      periodo: r.periodo,
      horaSaidaPrevista: r.previsaoSaida || r.horaSaida || "Não informada",
      horaChegadaPrevista: r.previsaoChegada || r.horaChegada || "Não informada",
      destino: r.destino || "Local",
      pessoasABordo: r.pessoasABordo || "1",
      status: r.status,
      statusMarina: r.statusMarina || undefined,
      observacoes: r.observacoes || undefined,
    })),
  };
}

export async function handlerCriarReserva(args: z.infer<typeof CriarReservaSchema>) {
  const {
    data,
    embarcacaoId,
    clienteId,
    periodo = "dia_inteiro",
    origem = "cota",
    previsaoSaida,
    previsaoChegada,
    destino,
    pessoasABordo,
    marinheiroPiloto,
    litrosAbastecerPrevio,
    nomeAvulso,
    telefoneAvulso,
    modeloAvulso,
    tipoAvulso = "lancha",
    observacoes,
  } = args;

  const todayStr = getTodayBrasilia();
  if (data < todayStr) {
    return {
      sucesso: false,
      erro: `Não é permitido criar reservas em datas passadas (${data}). Hoje é ${todayStr}.`,
    };
  }

  // Verificar datas de fechamento global da marina
  const datasFechadasRaw = await getConfigValue("marina_datas_fechadas");
  if (datasFechadasRaw) {
    try {
      const datasFechadas: Array<{ data: string; motivo?: string }> = JSON.parse(datasFechadasRaw);
      const fechamento = datasFechadas.find((item) => item.data === data);
      if (fechamento) {
        const motivoStr = fechamento.motivo ? ` (${fechamento.motivo})` : "";
        return {
          sucesso: false,
          erro: `A Marina está fechada na data ${data}${motivoStr}. Agendamentos não permitidos.`,
        };
      }
    } catch {
      // ignora erro de parse
    }
  }

  const isAvulso = origem === "avulso";
  if (isAvulso) {
    if (!nomeAvulso || !modeloAvulso) {
      return {
        sucesso: false,
        erro: "Para reservas avulsas (origem = 'avulso'), 'nomeAvulso' e 'modeloAvulso' são obrigatórios.",
      };
    }
  } else {
    if (!embarcacaoId) {
      return {
        sucesso: false,
        erro: "O campo 'embarcacaoId' é obrigatório para reservas de cota ou marina.",
      };
    }
  }

  return await withControlledTransaction(async (conn) => {
    let boat: any = null;
    let client: any = null;

    if (!isAvulso && embarcacaoId) {
      const [boatRows] = await conn.query(
        "SELECT id, nome, vaga, tipo, emManutencao, empresas FROM Embarcacoes WHERE id = ? LIMIT 1",
        [embarcacaoId]
      );
      boat = (boatRows as any[])[0];
      if (!boat) {
        return {
          sucesso: false,
          erro: `Embarcação '${embarcacaoId}' não encontrada no sistema.`,
        };
      }
      if (boat.emManutencao) {
        return {
          sucesso: false,
          erro: `A embarcação '${boat.nome}' está em manutenção e não pode ser reservada no momento.`,
        };
      }

      // Verifica conflito de reserva ativa para a mesma embarcação na mesma data
      const [existingActive] = await conn.query(
        "SELECT id, clienteId, periodo, status FROM Reservas WHERE embarcacaoId = ? AND data = ? AND status != 'cancelado' FOR UPDATE",
        [embarcacaoId, data]
      );
      if ((existingActive as any[]).length > 0) {
        const conflito = (existingActive as any[])[0];
        return {
          sucesso: false,
          erro: `A embarcação '${boat.nome}' já possui uma reserva ativa (${conflito.id}) para a data ${data}.`,
          reservaConflitanteId: conflito.id,
        };
      }
    }

    if (clienteId && clienteId !== "cliente_avulso" && clienteId !== "cliente_marina") {
      const [clientRows] = await conn.query(
        "SELECT id, nome, status, statusFinanceiro FROM Clientes WHERE id = ? LIMIT 1",
        [clienteId]
      );
      client = (clientRows as any[])[0];
      if (!client) {
        return {
          sucesso: false,
          erro: `Cliente '${clienteId}' não encontrado no sistema.`,
        };
      }
    }

    const [maxRows] = await conn.query(
      "SELECT MAX(posicaoFila) as maxPos FROM Reservas WHERE data = ? AND status != 'cancelado'",
      [data]
    );
    const nextPos = ((maxRows as any[])[0]?.maxPos || 0) + 1;

    const prefix = origem === "cota" ? "res_mcp" : "res_marina";
    const id = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalEmbarcacaoId = isAvulso ? "embarcacao_avulsa" : embarcacaoId!;
    const finalClienteId = isAvulso ? "cliente_avulso" : (clienteId || "cliente_marina");
    const createdAt = new Date().toISOString();

    await conn.query(
      `INSERT INTO Reservas (
        id, embarcacaoId, clienteId, data, periodo,
        previsaoSaida, previsaoChegada, status, statusMarina,
        tipoReserva, origem, nomeAvulso, telefoneAvulso, modeloAvulso, tipoAvulso,
        posicaoFila, litrosAbastecerPrevio, marinheiroPiloto, destino, pessoasABordo,
        observacoes, observacoesDescida, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        finalEmbarcacaoId,
        finalClienteId,
        data,
        periodo,
        previsaoSaida || null,
        previsaoChegada || null,
        "agendado",
        "agendado",
        "garantida",
        origem,
        isAvulso ? nomeAvulso : null,
        isAvulso ? (telefoneAvulso || null) : null,
        isAvulso ? modeloAvulso : null,
        isAvulso ? tipoAvulso : null,
        nextPos,
        litrosAbastecerPrevio !== undefined ? String(litrosAbastecerPrevio) : null,
        marinheiroPiloto || null,
        destino || null,
        pessoasABordo !== undefined ? String(pessoasABordo) : null,
        observacoes || null,
        observacoes || null,
        createdAt,
      ]
    );

    console.error(`[AUDIT-MCP] CREATE_RESERVATION | ID: ${id} | Data: ${data} | Barco: ${boat?.nome || modeloAvulso || finalEmbarcacaoId} | Cliente: ${client?.nome || nomeAvulso || finalClienteId}`);

    return {
      sucesso: true,
      mensagem: "Reserva criada com sucesso.",
      reserva: {
        id,
        embarcacaoId: finalEmbarcacaoId,
        embarcacaoNome: boat?.nome || modeloAvulso || "Embarcação Avulsa",
        vaga: boat?.vaga || null,
        clienteId: finalClienteId,
        clienteNome: client?.nome || nomeAvulso || "Cliente Marina",
        data,
        periodo,
        previsaoSaida: previsaoSaida || null,
        previsaoChegada: previsaoChegada || null,
        destino: destino || null,
        pessoasABordo: pessoasABordo || null,
        posicaoFila: nextPos,
        status: "agendado",
        origem,
        observacoes: observacoes || null,
        createdAt,
      },
    };
  });
}

export async function handlerAtualizarReserva(args: z.infer<typeof AtualizarReservaSchema>) {
  const { reservaId, data, periodo, status, statusMarina, previsaoSaida, previsaoChegada, destino, pessoasABordo, marinheiroPiloto, observacoes } = args;

  return await withControlledTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT r.*, e.nome as embarcacaoNome, c.nome as clienteNome
       FROM Reservas r
       LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
       LEFT JOIN Clientes c ON r.clienteId = c.id
       WHERE r.id = ? LIMIT 1 FOR UPDATE`,
      [reservaId]
    );
    const existing = (rows as any[])[0];
    if (!existing) {
      return {
        sucesso: false,
        erro: `Reserva '${reservaId}' não encontrada.`,
      };
    }

    const novaData = data || existing.data;
    if (data && data !== existing.data && existing.embarcacaoId !== "embarcacao_avulsa") {
      const [conflicts] = await conn.query(
        "SELECT id FROM Reservas WHERE embarcacaoId = ? AND data = ? AND status != 'cancelado' AND id != ? LIMIT 1",
        [existing.embarcacaoId, novaData, reservaId]
      );
      if ((conflicts as any[]).length > 0) {
        return {
          sucesso: false,
          erro: `A embarcação já possui outra reserva ativa na data ${novaData}.`,
        };
      }
    }

    const novoPeriodo = periodo !== undefined ? periodo : existing.periodo;
    const novoStatus = status !== undefined ? status : existing.status;
    const novoStatusMarina = statusMarina !== undefined ? statusMarina : existing.statusMarina;
    const novaPrevSaida = previsaoSaida !== undefined ? previsaoSaida : existing.previsaoSaida;
    const novaPrevChegada = previsaoChegada !== undefined ? previsaoChegada : existing.previsaoChegada;
    const novoDestino = destino !== undefined ? destino : existing.destino;
    const novasPessoas = pessoasABordo !== undefined ? String(pessoasABordo) : existing.pessoasABordo;
    const novoPiloto = marinheiroPiloto !== undefined ? marinheiroPiloto : existing.marinheiroPiloto;
    const novasObs = observacoes !== undefined ? observacoes : existing.observacoes;

    await conn.query(
      `UPDATE Reservas
       SET data = ?, periodo = ?, status = ?, statusMarina = ?,
           previsaoSaida = ?, previsaoChegada = ?, destino = ?,
           pessoasABordo = ?, marinheiroPiloto = ?, observacoes = ?
       WHERE id = ?`,
      [
        novaData,
        novoPeriodo,
        novoStatus,
        novoStatusMarina,
        novaPrevSaida,
        novaPrevChegada,
        novoDestino,
        novasPessoas,
        novoPiloto,
        novasObs,
        reservaId,
      ]
    );

    console.error(`[AUDIT-MCP] UPDATE_RESERVATION | ID: ${reservaId} | Data: ${novaData} | Status: ${novoStatus}`);

    return {
      sucesso: true,
      mensagem: "Reserva atualizada com sucesso.",
      reserva: {
        id: reservaId,
        embarcacaoId: existing.embarcacaoId,
        embarcacaoNome: existing.embarcacaoNome || existing.modeloAvulso || undefined,
        clienteId: existing.clienteId,
        clienteNome: existing.clienteNome || existing.nomeAvulso || undefined,
        data: novaData,
        periodo: novoPeriodo,
        status: novoStatus,
        statusMarina: novoStatusMarina,
        previsaoSaida: novaPrevSaida,
        previsaoChegada: novaPrevChegada,
        destino: novoDestino,
        pessoasABordo: novasPessoas,
        marinheiroPiloto: novoPiloto,
        observacoes: novasObs,
      },
    };
  });
}

export async function handlerCancelarReserva(args: z.infer<typeof CancelarReservaSchema>) {
  const { reservaId, motivo } = args;

  return await withControlledTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT r.*, e.nome as embarcacaoNome, c.nome as clienteNome
       FROM Reservas r
       LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
       LEFT JOIN Clientes c ON r.clienteId = c.id
       WHERE r.id = ? LIMIT 1 FOR UPDATE`,
      [reservaId]
    );
    const existing = (rows as any[])[0];
    if (!existing) {
      return {
        sucesso: false,
        erro: `Reserva '${reservaId}' não encontrada.`,
      };
    }

    if (existing.status === "cancelado") {
      return {
        sucesso: true,
        mensagem: `A reserva '${reservaId}' já estava cancelada.`,
        reserva: sanitizeReservation(existing),
      };
    }

    const obsFinal = motivo
      ? `${existing.observacoes ? existing.observacoes + " | " : ""}Cancelado via MCP: ${motivo}`
      : existing.observacoes;

    await conn.query(
      "UPDATE Reservas SET status = 'cancelado', statusMarina = 'cancelado', observacoes = ? WHERE id = ?",
      [obsFinal, reservaId]
    );

    console.error(`[AUDIT-MCP] CANCEL_RESERVATION | ID: ${reservaId} | Motivo: ${motivo || "Não informado"}`);

    return {
      sucesso: true,
      mensagem: "Reserva cancelada com sucesso.",
      reservaCancelada: {
        id: reservaId,
        embarcacao: existing.embarcacaoNome || existing.modeloAvulso || existing.embarcacaoId,
        cliente: existing.clienteNome || existing.nomeAvulso || existing.clienteId,
        data: existing.data,
        statusAnterior: existing.status,
        statusAtual: "cancelado",
        motivo: motivo || null,
      },
    };
  });
}
