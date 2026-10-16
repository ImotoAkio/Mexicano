import { Router } from "express";
import { getDbPool, pullDatabase, upsertReservation } from "../server-db";
import { requireAdminAuth, writeAuditLog } from "./middlewares";

const router = Router();

// 1. Listar Agendamentos da Marina
router.get("/agendamentos", requireAdminAuth, async (req, res) => {
  try {
    const { dataInicio, dataFim, status, origem, search } = req.query;
    const dbData = await pullDatabase();

    let list = dbData.reservations || [];

    // Filtro por origem (marina, avulso, cota ou todas)
    if (origem && origem !== "todas") {
      list = list.filter((r: any) => {
        if (origem === "cota") return !r.origem || r.origem === "cota";
        return r.origem === origem;
      });
    }

    // Filtro por status
    if (status && status !== "todos") {
      list = list.filter((r: any) => r.status === status);
    }

    // Filtro por intervalo de datas
    if (dataInicio && typeof dataInicio === "string") {
      list = list.filter((r: any) => r.data >= dataInicio);
    }
    if (dataFim && typeof dataFim === "string") {
      list = list.filter((r: any) => r.data <= dataFim);
    }

    // Filtro de busca textual
    if (search && typeof search === "string" && search.trim()) {
      const term = search.toLowerCase().trim();
      list = list.filter((r: any) => {
        const boat = dbData.boats.find((b: any) => b.id === r.embarcacaoId);
        const client = dbData.clients.find((c: any) => c.id === r.clienteId);
        const boatName = (boat?.nome || r.modeloAvulso || "").toLowerCase();
        const clientName = (client?.nome || r.nomeAvulso || "").toLowerCase();
        const vaga = (boat?.vaga || "").toLowerCase();
        return boatName.includes(term) || clientName.includes(term) || vaga.includes(term);
      });
    }

    // Enriquecer dados dos agendamentos
    const enriched = list.map((r: any) => {
      const boat = dbData.boats.find((b: any) => b.id === r.embarcacaoId);
      const client = dbData.clients.find((c: any) => c.id === r.clienteId);
      return {
        ...r,
        embarcacaoNome: boat?.nome || r.modeloAvulso || "Embarcação Avulsa",
        embarcacaoVaga: boat?.vaga || null,
        embarcacaoTipo: boat?.tipo || r.tipoAvulso || "lancha",
        clienteNome: client?.nome || r.nomeAvulso || "Visitante Avulso",
        clienteTelefone: client?.telefone || r.telefoneAvulso || null
      };
    });

    res.json(enriched);
  } catch (err: any) {
    console.error("[MARINA AGENDAMENTOS GET ERROR]", err);
    res.status(500).json({ error: true, message: "Erro ao buscar agendamentos da marina." });
  }
});

// 2. Criar Agendamento da Marina / Avulso
router.post("/agendamentos", requireAdminAuth, async (req, res) => {
  try {
    const pool = getDbPool();
    if (!pool) return res.status(500).json({ error: true, message: "Banco de dados indisponível." });

    const {
      embarcacaoId,
      clienteId,
      data,
      periodo = "dia_inteiro",
      previsaoSaida,
      previsaoChegada,
      origem = "marina",
      nomeAvulso,
      telefoneAvulso,
      modeloAvulso,
      tipoAvulso = "lancha",
      combustivelInicial,
      litrosAbastecerPrevio,
      marinheiroPiloto,
      destino,
      pessoasABordo,
      acessoriosSolicitados,
      observacoesDescida,
      observacoes
    } = req.body;

    if (!data) {
      return res.status(400).json({ error: true, message: "A data do agendamento é obrigatória." });
    }

    const isAvulso = origem === "avulso";
    if (isAvulso) {
      if (!nomeAvulso || !modeloAvulso) {
        return res.status(400).json({ error: true, message: "Nome do cliente e modelo da embarcação são obrigatórios para agendamentos avulsos." });
      }
    } else {
      if (!embarcacaoId) {
        return res.status(400).json({ error: true, message: "Selecione uma embarcação cadastrada da marina." });
      }
    }

    // Calcula próxima posição na fila para a data
    const [maxRows] = await pool.query(
      "SELECT MAX(posicaoFila) as maxPos FROM Reservas WHERE data = ? AND status != 'cancelado'",
      [data]
    );
    const nextPos = ((maxRows as any[])[0]?.maxPos || 0) + 1;

    const id = `res_marina_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalEmbarcacaoId = isAvulso ? "embarcacao_avulsa" : embarcacaoId;
    const finalClienteId = isAvulso ? "cliente_avulso" : (clienteId || "cliente_marina");

    const newRes: any = {
      id,
      embarcacaoId: finalEmbarcacaoId,
      clienteId: finalClienteId,
      data,
      periodo,
      previsaoSaida: previsaoSaida || null,
      previsaoChegada: previsaoChegada || null,
      status: "agendado",
      statusMarina: "agendado",
      origem,
      nomeAvulso: isAvulso ? nomeAvulso : null,
      telefoneAvulso: isAvulso ? telefoneAvulso : null,
      modeloAvulso: isAvulso ? modeloAvulso : null,
      tipoAvulso: isAvulso ? tipoAvulso : null,
      posicaoFila: nextPos,
      combustivelInicial: combustivelInicial || null,
      litrosAbastecerPrevio: litrosAbastecerPrevio || null,
      marinheiroPiloto: marinheiroPiloto || null,
      destino: destino || null,
      pessoasABordo: pessoasABordo || null,
      acessoriosSolicitados: acessoriosSolicitados || null,
      observacoesDescida: observacoesDescida || null,
      observacoes: observacoes || null,
      createdAt: new Date().toISOString()
    };

    await upsertReservation(newRes);

    const dbData = await pullDatabase(true);
    const boat = dbData.boats.find((b: any) => b.id === finalEmbarcacaoId);
    const client = dbData.clients.find((c: any) => c.id === finalClienteId);

    const enrichedRes = {
      ...newRes,
      embarcacaoNome: boat?.nome || newRes.modeloAvulso || "Embarcação Avulsa",
      embarcacaoVaga: boat?.vaga || null,
      embarcacaoTipo: boat?.tipo || newRes.tipoAvulso || "lancha",
      clienteNome: client?.nome || newRes.nomeAvulso || "Visitante Avulso"
    };

    req.app.locals.io?.emit("marina_update", { action: "new", reservation: enrichedRes });
    writeAuditLog((req as any).user?.nome || "Admin", "admin", "CREATE_MARINA_AGENDAMENTO", req.ip, `Agendamento Marina: ${data} - ${enrichedRes.embarcacaoNome}`);

    res.json({ success: true, reservation: enrichedRes });
  } catch (err: any) {
    console.error("[MARINA AGENDAMENTOS POST ERROR]", err);
    res.status(500).json({ error: true, message: "Erro ao criar agendamento da marina." });
  }
});

// 3. Atualizar Agendamento
router.put("/agendamentos/:id", requireAdminAuth, async (req, res) => {
  try {
    const pool = getDbPool();
    if (!pool) return res.status(500).json({ error: true, message: "Banco de dados indisponível." });

    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM Reservas WHERE id = ?", [id]);
    const existing = (rows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: true, message: "Agendamento não encontrado." });
    }

    const {
      data,
      previsaoSaida,
      previsaoChegada,
      nomeAvulso,
      telefoneAvulso,
      modeloAvulso,
      tipoAvulso,
      combustivelInicial,
      litrosAbastecerPrevio,
      marinheiroPiloto,
      destino,
      pessoasABordo,
      acessoriosSolicitados,
      observacoesDescida,
      observacoes,
      status
    } = req.body;

    const updatedRes: any = {
      ...existing,
      data: data || existing.data,
      previsaoSaida: previsaoSaida !== undefined ? previsaoSaida : existing.previsaoSaida,
      previsaoChegada: previsaoChegada !== undefined ? previsaoChegada : existing.previsaoChegada,
      nomeAvulso: nomeAvulso !== undefined ? nomeAvulso : existing.nomeAvulso,
      telefoneAvulso: telefoneAvulso !== undefined ? telefoneAvulso : existing.telefoneAvulso,
      modeloAvulso: modeloAvulso !== undefined ? modeloAvulso : existing.modeloAvulso,
      tipoAvulso: tipoAvulso !== undefined ? tipoAvulso : existing.tipoAvulso,
      combustivelInicial: combustivelInicial !== undefined ? combustivelInicial : existing.combustivelInicial,
      litrosAbastecerPrevio: litrosAbastecerPrevio !== undefined ? litrosAbastecerPrevio : existing.litrosAbastecerPrevio,
      marinheiroPiloto: marinheiroPiloto !== undefined ? marinheiroPiloto : existing.marinheiroPiloto,
      destino: destino !== undefined ? destino : existing.destino,
      pessoasABordo: pessoasABordo !== undefined ? pessoasABordo : existing.pessoasABordo,
      acessoriosSolicitados: acessoriosSolicitados !== undefined ? acessoriosSolicitados : (existing.acessoriosSolicitados ? JSON.parse(existing.acessoriosSolicitados) : null),
      observacoesDescida: observacoesDescida !== undefined ? observacoesDescida : existing.observacoesDescida,
      observacoes: observacoes !== undefined ? observacoes : existing.observacoes,
      status: status || existing.status
    };

    await upsertReservation(updatedRes);

    const dbData = await pullDatabase(true);
    const boat = dbData.boats.find((b: any) => b.id === updatedRes.embarcacaoId);
    const client = dbData.clients.find((c: any) => c.id === updatedRes.clienteId);

    const enrichedRes = {
      ...updatedRes,
      embarcacaoNome: boat?.nome || updatedRes.modeloAvulso || "Embarcação Avulsa",
      embarcacaoVaga: boat?.vaga || null,
      embarcacaoTipo: boat?.tipo || updatedRes.tipoAvulso || "lancha",
      clienteNome: client?.nome || updatedRes.nomeAvulso || "Visitante Avulso"
    };

    req.app.locals.io?.emit("marina_update", { action: "upsert", reservation: enrichedRes });
    res.json({ success: true, reservation: enrichedRes });
  } catch (err: any) {
    console.error("[MARINA AGENDAMENTOS PUT ERROR]", err);
    res.status(500).json({ error: true, message: "Erro ao atualizar agendamento." });
  }
});

// 4. Cancelar / Deletar Agendamento
router.delete("/agendamentos/:id", requireAdminAuth, async (req, res) => {
  try {
    const pool = getDbPool();
    if (!pool) return res.status(500).json({ error: true, message: "Banco de dados indisponível." });

    const { id } = req.params;
    await pool.query("UPDATE Reservas SET status = 'cancelado' WHERE id = ?", [id]);

    req.app.locals.io?.emit("marina_update", { action: "cancel", reservation: { id, status: "cancelado" } });
    writeAuditLog((req as any).user?.nome || "Admin", "admin", "CANCEL_MARINA_AGENDAMENTO", req.ip, `Cancelou agendamento: ${id}`);

    res.json({ success: true });
  } catch (err: any) {
    console.error("[MARINA AGENDAMENTOS DELETE ERROR]", err);
    res.status(500).json({ error: true, message: "Erro ao cancelar agendamento." });
  }
});

// 5. Inclusão Imediata na Fila de Descida de Hoje
router.post("/fila/adicionar-imediato", requireAdminAuth, async (req, res) => {
  try {
    const pool = getDbPool();
    if (!pool) return res.status(500).json({ error: true, message: "Banco de dados indisponível." });

    const {
      embarcacaoId,
      clienteId,
      origem = "marina",
      nomeAvulso,
      telefoneAvulso,
      modeloAvulso,
      tipoAvulso = "lancha",
      previsaoSaida,
      combustivelInicial,
      litrosAbastecerPrevio,
      marinheiroPiloto,
      destino,
      pessoasABordo,
      observacoesDescida
    } = req.body;

    const todayStr = new Date().toISOString().split("T")[0];
    const isAvulso = origem === "avulso";

    if (isAvulso) {
      if (!nomeAvulso || !modeloAvulso) {
        return res.status(400).json({ error: true, message: "Nome e modelo são obrigatórios para visitantes avulsos." });
      }
    } else {
      if (!embarcacaoId) {
        return res.status(400).json({ error: true, message: "Selecione a embarcação cadastrada." });
      }
    }

    // Calcula próxima posição na fila de hoje
    const [maxRows] = await pool.query(
      "SELECT MAX(posicaoFila) as maxPos FROM Reservas WHERE data = ? AND status != 'cancelado'",
      [todayStr]
    );
    const nextPos = ((maxRows as any[])[0]?.maxPos || 0) + 1;

    const id = `res_fila_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalEmbarcacaoId = isAvulso ? "embarcacao_avulsa" : embarcacaoId;
    const finalClienteId = isAvulso ? "cliente_avulso" : (clienteId || "cliente_marina");

    const newRes: any = {
      id,
      embarcacaoId: finalEmbarcacaoId,
      clienteId: finalClienteId,
      data: todayStr,
      periodo: "dia_inteiro",
      previsaoSaida: previsaoSaida || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      previsaoChegada: null,
      status: "confirmado",
      statusMarina: "agendado",
      origem,
      nomeAvulso: isAvulso ? nomeAvulso : null,
      telefoneAvulso: isAvulso ? telefoneAvulso : null,
      modeloAvulso: isAvulso ? modeloAvulso : null,
      tipoAvulso: isAvulso ? tipoAvulso : null,
      posicaoFila: nextPos,
      combustivelInicial: combustivelInicial || null,
      litrosAbastecerPrevio: litrosAbastecerPrevio || null,
      marinheiroPiloto: marinheiroPiloto || null,
      destino: destino || null,
      pessoasABordo: pessoasABordo || null,
      observacoesDescida: observacoesDescida || null,
      createdAt: new Date().toISOString()
    };

    await upsertReservation(newRes);

    const dbData = await pullDatabase(true);
    const boat = dbData.boats.find((b: any) => b.id === finalEmbarcacaoId);
    const client = dbData.clients.find((c: any) => c.id === finalClienteId);

    const enrichedRes = {
      ...newRes,
      embarcacaoNome: boat?.nome || newRes.modeloAvulso || "Embarcação Avulsa",
      embarcacaoVaga: boat?.vaga || null,
      embarcacaoTipo: boat?.tipo || newRes.tipoAvulso || "lancha",
      clienteNome: client?.nome || newRes.nomeAvulso || "Visitante Avulso"
    };

    req.app.locals.io?.emit("marina_update", { action: "new", reservation: enrichedRes });
    writeAuditLog((req as any).user?.nome || "Admin", "admin", "ADD_FILA_DESCIDA", req.ip, `Adicionou na fila: ${enrichedRes.embarcacaoNome} (#${nextPos})`);

    res.json({ success: true, reservation: enrichedRes });
  } catch (err: any) {
    console.error("[MARINA FILA ADICIONAR ERROR]", err);
    res.status(500).json({ error: true, message: "Erro ao incluir barco na fila de descida." });
  }
});

// 6. Reordenar Prioridade na Fila do Trator/Rampa
router.post("/fila/reordenar", requireAdminAuth, async (req, res) => {
  try {
    const pool = getDbPool();
    if (!pool) return res.status(500).json({ error: true, message: "Banco de dados indisponível." });

    const { ordenacao } = req.body; // Array de { id: string, posicaoFila: number }
    if (!Array.isArray(ordenacao) || ordenacao.length === 0) {
      return res.status(400).json({ error: true, message: "Formato de ordenação inválido." });
    }

    for (const item of ordenacao) {
      if (item.id && typeof item.posicaoFila === "number") {
        await pool.query("UPDATE Reservas SET posicaoFila = ? WHERE id = ?", [item.posicaoFila, item.id]);
      }
    }

    req.app.locals.io?.emit("marina_update", { action: "reorder", ordenacao });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[MARINA FILA REORDENAR ERROR]", err);
    res.status(500).json({ error: true, message: "Erro ao reordenar fila." });
  }
});

// 7. Atualizar Status Operacional da Fila
router.patch("/fila/status", requireAdminAuth, async (req, res) => {
  try {
    const pool = getDbPool();
    if (!pool) return res.status(500).json({ error: true, message: "Banco de dados indisponível." });

    const { id, statusMarina, horaDescida, horaSaida, horaChegada, horaSubida, operador } = req.body;
    if (!id || !statusMarina) {
      return res.status(400).json({ error: true, message: "ID e statusMarina são obrigatórios." });
    }

    const updates: string[] = ["statusMarina = ?"];
    const params: any[] = [statusMarina];

    if (horaDescida !== undefined) {
      updates.push("horaDescida = ?");
      params.push(horaDescida);
    }
    if (horaSaida !== undefined) {
      updates.push("horaSaida = ?");
      params.push(horaSaida);
    }
    if (horaChegada !== undefined) {
      updates.push("horaChegada = ?");
      params.push(horaChegada);
    }
    if (horaSubida !== undefined) {
      updates.push("horaSubida = ?");
      params.push(horaSubida);
    }
    if (operador) {
      if (statusMarina === "descida" || statusMarina === "pier") {
        updates.push("operadorDescida = ?");
        params.push(operador);
      } else if (statusMarina === "saida") {
        updates.push("operadorSaida = ?");
        params.push(operador);
      } else if (statusMarina === "chegada") {
        updates.push("operadorChegada = ?");
        params.push(operador);
      } else if (statusMarina === "guardada") {
        updates.push("operadorSubida = ?");
        params.push(operador);
      }
    }

    params.push(id);
    await pool.query(`UPDATE Reservas SET ${updates.join(", ")} WHERE id = ?`, params);

    const [rows] = await pool.query("SELECT * FROM Reservas WHERE id = ?", [id]);
    const updated = (rows as any[])[0];

    req.app.locals.io?.emit("marina_update", { action: "status", reservation: updated });
    res.json({ success: true, reservation: updated });
  } catch (err: any) {
    console.error("[MARINA FILA STATUS ERROR]", err);
    res.status(500).json({ error: true, message: "Erro ao atualizar status na fila." });
  }
});

export default router;
