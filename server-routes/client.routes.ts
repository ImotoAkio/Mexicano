import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDbPool, pullDatabase, getClientPortalData, invalidateDbCache, invalidateTransacoesCache, syncClientFinancialStatus, upsertReservation, deleteReservation, cancelReservation, getConfigValue, getClientAuth, upsertClientAuth } from "../server-db";
import { requireClientAuth, sensitiveLimiter, whatsappLimiter } from "./middlewares";
import { writeAuditLog } from "./middlewares";
import { getVapidKeys, saveClientPushSubscription, removeClientPushSubscription } from "../server-push";
import {
  getBoatOperationRules,
  getClientWeekendUsageInMonth,
  evaluateWeekendBookingForClient,
  evaluateDateRestrictionsForClient,
  canClientContestExtraReservation
} from "../src/utils/boatRules";
import https from "https";
import http from "http";

const evolutionHttpsAgent = new https.Agent({ rejectUnauthorized: false });

/** Helper: Retorna a data atual no fuso horário oficial de Brasília (YYYY-MM-DD) */
function getTodayBrasilia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/** Helper: Retorna o timestamp em ms correspondente a uma data YYYY-MM-DD às 00:00 no fuso de Brasília */
function getBrasiliaDateMs(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00-03:00`).getTime();
}

/** Helper: check if a date string (YYYY-MM-DD) falls on a configured holiday */
function isHoliday(dateStr: string, holidays: string[]): boolean {
  return holidays.includes(dateStr);
}

/** Helper: check if a client has overdue unpaid revenue transactions */
function hasClientOverdueDebt(client: any, transacoes: any[]): boolean {
  if (client?.statusFinanceiro === 'inadimplente') return true;
  const todayStr = getTodayBrasilia();
  return (transacoes || []).some((t: any) =>
    t.clienteId === client?.id &&
    t.tipo === 'receita' &&
    !['pago', 'cancelado', 'realizado', 'estornado'].includes(String(t.status || '').toLowerCase()) &&
    (t.status === 'vencido' || (t.dataVencimento && t.dataVencimento < todayStr))
  );
}

/** Helper: sanitize client data and shared boat records before sending to client browser */
export function sanitizeClientPayload(client: any, reservations: any[], transacoes: any[], manutencoes: any[]) {
  const safeClient = { ...client };
  delete safeClient.password_hash;

  const safeReservations = (reservations || []).map((r: any) => {
    if (r.clienteId === client.id) return r;
    return {
      id: r.id,
      embarcacaoId: r.embarcacaoId,
      data: r.data,
      periodo: r.periodo,
      status: r.status,
      statusMarina: r.statusMarina,
      tipoReserva: r.tipoReserva,
      clienteId: 'outro_cotista'
    };
  });

  const safeTransacoes = (transacoes || []).filter((t: any) =>
    t.clienteId === client.id && t.tipo === 'receita'
  );

  if (hasClientOverdueDebt(client, safeTransacoes)) {
    safeClient.statusFinanceiro = 'inadimplente';
  } else if (safeClient.statusFinanceiro === 'pendente') {
    safeClient.statusFinanceiro = 'em_dia';
  }

  const safeManutencoes = (manutencoes || []).map((m: any) => {
    const safeM = { ...m };
    delete safeM.custoReal;
    delete safeM.margemLucro;
    delete safeM.custo;
    delete safeM.fornecedorId;
    delete safeM.oficinaNome;
    return safeM;
  });

  return { safeClient, safeReservations, safeTransacoes, safeManutencoes };
}

const clientRoutes = Router();

// Route: Get client data using JWT (secure data fetch)
clientRoutes.get("/me", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const portalData = await getClientPortalData(userId);
    const client = portalData.client;

    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado." });
    }

    const boats = portalData.boats;
    const rawReservations = portalData.reservations;
    const rawTransacoes = portalData.transacoes;
    const chamados = portalData.chamados;
    const rawManutencoes = portalData.manutencoes;

    const { safeClient, safeReservations, safeTransacoes, safeManutencoes } = sanitizeClientPayload(
      client,
      rawReservations,
      rawTransacoes,
      rawManutencoes
    );

    // Sync statusFinanceiro with actual overdue receita transactions
    if (hasClientOverdueDebt(client, rawTransacoes)) {
      safeClient.statusFinanceiro = 'inadimplente';
    }

    writeAuditLog(client.nome, "client", "FETCH_DATA", req.ip, `ID: ${client.id}`);

    const datasFechadasStr = await getConfigValue("marina_datas_fechadas");
    let marinaDatasFechadas = [];
    if (datasFechadasStr) {
      try { marinaDatasFechadas = JSON.parse(datasFechadasStr); } catch {}
    }

    res.json({
      client: safeClient,
      boats,
      reservations: safeReservations,
      transacoes: safeTransacoes,
      chamados,
      manutencoes: safeManutencoes,
      marinaDatasFechadas
    });
  } catch (err: any) {
    console.error("Client data fetch error:", err);
    res.status(500).json({ error: true, message: "Erro ao carregar dados do cliente." });
  }
});

// Route: Create a new reservation for the client securely
clientRoutes.post("/reserve", requireClientAuth, sensitiveLimiter, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { embarcacaoId, date, periodo = 'dia_inteiro', observacoes = '' } = req.body;

    if (!embarcacaoId || typeof embarcacaoId !== 'string') {
      return res.status(400).json({ error: true, message: "Embarcação inválida." });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: true, message: "Data inválida. Formato esperado: YYYY-MM-DD." });
    }

    const validPeriodos = ['dia_inteiro', 'manha', 'tarde'];
    if (!validPeriodos.includes(periodo)) {
      return res.status(400).json({ error: true, message: "Período inválido." });
    }

    if (observacoes && typeof observacoes === 'string' && observacoes.length > 500) {
      return res.status(400).json({ error: true, message: "Observações não podem exceder 500 caracteres." });
    }

    const dbData = await getClientPortalData(userId);
    const client = dbData.client;

    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado." });
    }

    if (hasClientOverdueDebt(client, dbData.transacoes)) {
      return res.status(403).json({ error: true, message: "Você possui valores em aberto. Regularize sua situação financeira para realizar agendamentos." });
    }

    const clientBoatsList = client.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes.map((eb: any) => eb.embarcacaoId)
      : [client.embarcacaoId];

    if (!clientBoatsList.includes(embarcacaoId)) {
      return res.status(403).json({ error: true, message: "Acesso negado à embarcação." });
    }

    const boat = dbData.boats.find((b: any) => b.id === embarcacaoId);
    if (boat && boat.emManutencao) {
      return res.status(400).json({ error: true, message: "Esta embarcação está em manutenção. Não é possível realizar reservas no momento." });
    }

    const todayStr = getTodayBrasilia();
    if (date < todayStr) {
      return res.status(400).json({ error: true, message: "Não é possível reservar datas passadas." });
    }

    // Check marina global closed dates defined by administrator
    const datasFechadasRaw = await getConfigValue("marina_datas_fechadas");
    if (datasFechadasRaw) {
      try {
        const datasFechadas: Array<{ data: string; motivo?: string }> = JSON.parse(datasFechadasRaw);
        const fechamento = datasFechadas.find(item => item.data === date);
        if (fechamento) {
          const motivoStr = fechamento.motivo ? ` (${fechamento.motivo})` : '';
          return res.status(400).json({
            error: true,
            message: `A Marina estará fechada nesta data${motivoStr}. Agendamentos não permitidos.`
          });
        }
      } catch (errParse) {
        console.warn("Aviso ao ler marina_datas_fechadas:", errParse);
      }
    }

    // Check overlaps
    const overlaps = dbData.reservations.filter((r: any) => 
      r.embarcacaoId === embarcacaoId && r.data === date && r.status !== 'cancelado'
    );
    if (overlaps.length > 0) {
      return res.status(400).json({ error: true, message: "A embarcação já possui reserva para esta data." });
    }

    const reqDateObj = new Date(date + "T12:00:00Z");
    const reqDayOfWeek = reqDateObj.getUTCDay();

    const rules = getBoatOperationRules(boat);
    const dateRestriction = evaluateDateRestrictionsForClient({ dateStr: date, todayStr, boat });
    if (!dateRestriction.allowed) {
      return res.status(400).json({
        error: true,
        ruleBlocked: true,
        message: dateRestriction.reason || "Data não permitida pelas regras desta embarcação."
      });
    }

    const isMarinaOnlyBoat = boat?.empresas && boat.empresas.includes('MARINA') && !boat.empresas.includes('VALE');
    let tipoReserva: 'garantida' | 'extra' = 'garantida';
    let isPaidExtraDay = false;
    let extraDayFee = 0;
    let boatTypeLabel = 'Lancha';
    let dayName = '';

    if (!isMarinaOnlyBoat) {
      const clientBoatEntry = Array.isArray(client.embarcacoes)
        ? client.embarcacoes.find((eb: any) => eb?.embarcacaoId === embarcacaoId)
        : (client.embarcacaoId === embarcacaoId ? client : null);
      const boatPlano = clientBoatEntry?.plano || (client.plano === 'completo' ? 'completo' : 'normal');

      if ((reqDayOfWeek === 1 || reqDayOfWeek === 2) && boatPlano !== 'completo') {
        const isJetBoat = Boolean(boat && (boat.tipo === 'jet' || (boat.nome || '').toLowerCase().includes('jet')));
        const defaultExtraFee = isJetBoat ? 100 : 150;
        extraDayFee =
          rules.taxaDescidaAvulsaPersonalizada !== null &&
          rules.taxaDescidaAvulsaPersonalizada !== undefined &&
          Number(rules.taxaDescidaAvulsaPersonalizada) >= 0
            ? Number(rules.taxaDescidaAvulsaPersonalizada)
            : defaultExtraFee;
        boatTypeLabel = isJetBoat ? 'Jet Ski' : 'Lancha';
        dayName = reqDayOfWeek === 1 ? 'segunda-feira' : 'terça-feira';

        if (extraDayFee > 0) {
          isPaidExtraDay = true;
          const { confirmPaidLaunch, acceptedFee } = req.body;
          if (confirmPaidLaunch !== true) {
            return res.status(409).json({
              error: true,
              requirePaidLaunchConfirmation: true,
              feeAmount: extraDayFee,
              boatTypeLabel,
              dayName,
              message: `Descidas às segundas e terças-feiras não estão inclusas no seu plano atual. Ao concordar, será gerado um registro financeiro de R$ ${extraDayFee.toFixed(2).replace('.', ',')} (${boatTypeLabel}) para pagamento.`
            });
          }

          if (acceptedFee !== undefined && Number(acceptedFee) !== extraDayFee) {
            return res.status(400).json({
              error: true,
              message: "Valor da cobrança divergente do plano/embarcação. Atualize a página e tente novamente."
            });
          }
        }
      }

      const activeReservations = dbData.reservations.filter((r: any) =>
        r.clienteId === userId && r.embarcacaoId === embarcacaoId && r.status !== 'cancelado' && r.data >= todayStr
      );
      if (activeReservations.length >= rules.maxReservasAtivas) {
        const limitMsg =
          rules.maxReservasAtivas === 1
            ? "Você já possui 1 reserva ativa para esta embarcação. Pela regra de operação, só é permitido ter 1 reserva ativa por vez."
            : `Você atingiu o limite máximo de ${rules.maxReservasAtivas} reservas ativas simultâneas para esta embarcação.`;
        return res.status(400).json({ error: true, ruleBlocked: true, message: limitMsg });
      }

      // Weekend reservation logic: guaranteed vs extra vs blocked
      const weekendEval = evaluateWeekendBookingForClient({
        userId,
        embarcacaoId,
        dateStr: date,
        reservations: dbData.reservations,
        boat
      });

      if (weekendEval.isWeekend) {
        if (!weekendEval.allowed) {
          return res.status(400).json({
            error: true,
            ruleBlocked: true,
            message: weekendEval.blockedReason || "Você atingiu o limite de agendamentos de fim de semana neste mês para esta embarcação."
          });
        }
        tipoReserva = weekendEval.tipoReserva;

        // Check if the request explicitly confirms extra reservation
        const { confirmExtra } = req.body;
        if (tipoReserva === 'extra' && !confirmExtra) {
          return res.status(409).json({
            error: true,
            requireConfirmation: true,
            tipoReserva: 'extra',
            message: weekendEval.confirmMessage
          });
        }
      }
    }

    const currentPool = getDbPool();
    if (!currentPool) {
      return res.status(500).json({ error: true, message: "Banco de dados indisponível." });
    }

    // Validação concorrente com lock de transação
    const conn = await currentPool.getConnection();
    let newRes: any;
    let createdTx: any = null;
    try {
      await conn.beginTransaction();

      const [existingActive] = await conn.query(
        "SELECT id FROM Reservas WHERE embarcacaoId = ? AND data = ? AND status != 'cancelado' FOR UPDATE",
        [embarcacaoId, date]
      );
      if ((existingActive as any[]).length > 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: true, message: "A embarcação já possui reserva para esta data." });
      }

      if (!isMarinaOnlyBoat) {
        const [clientActiveRows] = await conn.query(
          "SELECT id, data, tipoReserva, status FROM Reservas WHERE clienteId = ? AND embarcacaoId = ? AND status != 'cancelado' AND data >= ? FOR UPDATE",
          [userId, embarcacaoId, todayStr]
        );
        if ((clientActiveRows as any[]).length >= rules.maxReservasAtivas) {
          await conn.rollback();
          conn.release();
          const limitMsg =
            rules.maxReservasAtivas === 1
              ? "Você já possui 1 reserva ativa para esta embarcação. Pela regra de operação, só é permitido ter 1 reserva ativa por vez."
              : `Você atingiu o limite máximo de ${rules.maxReservasAtivas} reservas ativas simultâneas para esta embarcação.`;
          return res.status(400).json({ error: true, ruleBlocked: true, message: limitMsg });
        }

        if (reqDayOfWeek === 0 || reqDayOfWeek === 6) {
          const monthPrefix = date.slice(0, 7);
          const [monthClientRows] = await conn.query(
            "SELECT id, embarcacaoId, clienteId, data, tipoReserva, status FROM Reservas WHERE clienteId = ? AND embarcacaoId = ? AND status != 'cancelado' AND data LIKE ? FOR UPDATE",
            [userId, embarcacaoId, `${monthPrefix}%`]
          );
          const freshWeekendEval = evaluateWeekendBookingForClient({
            userId,
            embarcacaoId,
            dateStr: date,
            reservations: monthClientRows as any[],
            boat
          });
          if (!freshWeekendEval.allowed) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({
              error: true,
              ruleBlocked: true,
              message: freshWeekendEval.blockedReason || "Você atingiu o limite de agendamentos de fim de semana neste mês para esta embarcação."
            });
          }
          tipoReserva = freshWeekendEval.tipoReserva;
          if (tipoReserva === 'extra' && !req.body.confirmExtra) {
            await conn.rollback();
            conn.release();
            return res.status(409).json({
              error: true,
              requireConfirmation: true,
              tipoReserva: 'extra',
              message: freshWeekendEval.confirmMessage
            });
          }
        }
      }

      const [maxRows] = await conn.query(
        "SELECT MAX(posicaoFila) as maxPos FROM Reservas WHERE data = ? AND status != 'cancelado'",
        [date]
      );
      const nextPos = ((maxRows as any[])[0]?.maxPos || 0) + 1;
      const nowIso = new Date().toISOString();

      newRes = {
        id: `res_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
        embarcacaoId,
        clienteId: userId,
        data: date,
        periodo,
        previsaoSaida: req.body.previsaoSaida || null,
        previsaoChegada: req.body.previsaoChegada || null,
        observacoes: observacoes,
        observações: observacoes,
        status: 'agendado',
        statusMarina: 'agendado',
        tipoReserva,
        origem: isMarinaOnlyBoat ? 'marina' : 'cota',
        posicaoFila: nextPos,
        createdAt: nowIso
      };

      await conn.query(
        `INSERT INTO Reservas (id, embarcacaoId, clienteId, data, periodo, previsaoSaida, previsaoChegada, observacoes, status, statusMarina, tipoReserva, origem, posicaoFila, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newRes.id, newRes.embarcacaoId, newRes.clienteId, newRes.data, newRes.periodo, newRes.previsaoSaida, newRes.previsaoChegada, newRes.observacoes, newRes.status, newRes.statusMarina, newRes.tipoReserva, newRes.origem, newRes.posicaoFila, newRes.createdAt]
      );

      if (isPaidExtraDay) {
        const [existingTxRows] = await conn.query(
          "SELECT id FROM TransacoesFinanceiras WHERE reservaId = ? AND status != 'cancelado' LIMIT 1",
          [newRes.id]
        );
        if ((existingTxRows as any[]).length > 0) {
          throw new Error("Registro financeiro duplicado detectado para esta reserva.");
        }

        const dateBR = date.split('-').reverse().join('/');
        const boatNameDisplay = boat?.nome || embarcacaoId;
        const txId = `tx_descida_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const txDescricao = `Descida avulsa (${dayName} ${dateBR}) - ${boatTypeLabel} ${boatNameDisplay} (fora do plano)`;
        const txMetadata = JSON.stringify({
          origem: 'portal_cliente_descida_seg_ter',
          reservaId: newRes.id,
          embarcacaoId,
          boatType: boatTypeLabel === 'Jet Ski' ? 'jet' : 'lancha',
          feeAmount: extraDayFee,
          confirmedByClientAt: nowIso,
          clientIp: req.ip || null
        });

        createdTx = {
          id: txId,
          tipo: 'receita',
          categoria: 'Descida Avulsa (Seg/Ter)',
          valor: extraDayFee,
          dataVencimento: date,
          status: 'lancado',
          descricao: txDescricao,
          clienteId: userId,
          embarcacaoId,
          reservaId: newRes.id,
          operador: client.nome,
          empresa: 'Marina Velho Chico',
          createdAt: nowIso
        };

        await conn.query(
          `INSERT INTO TransacoesFinanceiras (
            id, tipo, categoria, valor, dataVencimento, status, descricao,
            clienteId, embarcacaoId, reservaId, operador, metadata, empresa, createdAt
          ) VALUES (?, 'receita', ?, ?, ?, 'lancado', ?, ?, ?, ?, ?, ?, 'Marina Velho Chico', ?)`,
          [
            txId,
            createdTx.categoria,
            extraDayFee,
            date,
            txDescricao,
            userId,
            embarcacaoId,
            newRes.id,
            client.nome,
            txMetadata,
            nowIso
          ]
        );
      }

      await conn.commit();
      conn.release();
      invalidateDbCache();
      if (isPaidExtraDay) {
        invalidateTransacoesCache();
        await syncClientFinancialStatus(userId);
      }
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      throw txErr;
    }

    // Enrich the socket payload with boat name and client name for admin notifications
    const fetchedBoat = dbData.boats.find((b: any) => b.id === embarcacaoId);
    const enrichedRes = { ...newRes, embarcacaoNome: fetchedBoat?.nome || embarcacaoId, clienteNome: client.nome };
    req.app.locals.io?.emit("marina_update", { action: 'new', reservation: enrichedRes });

    if (isPaidExtraDay && createdTx) {
      writeAuditLog(
        client.nome,
        "client",
        "CREATE_PAID_RESERVATION_SEG_TER",
        req.ip,
        `Reserva: ${newRes.id} (${date} - ${boatTypeLabel} ${embarcacaoId}) | Financeiro: ${createdTx.id} (R$ ${extraDayFee.toFixed(2)})`
      );
    } else {
      writeAuditLog(client.nome, "client", "CREATE_RESERVATION", req.ip, `Reserva criada: ${date} - ${embarcacaoId}`);
    }
    res.json({ success: true, reservation: newRes, financialTransaction: createdTx });
  } catch (err: any) {
    console.error("Client reserve error:", err);
    res.status(500).json({ error: true, message: "Erro ao realizar agendamento." });
  }
});

// Route: Update a reservation's googleEventId securely for a client
clientRoutes.post("/update-reservation", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id, googleEventId } = req.body;
    
    if (!id || !googleEventId) {
      return res.status(400).json({ error: true, message: "Faltam parâmetros." });
    }

    const currentPool = getDbPool();
    if (!currentPool) {
      return res.status(500).json({ error: true, message: "Banco de dados indisponível." });
    }

    const [updateResult]: any = await currentPool.query(
      "UPDATE Reservas SET googleEventId = ? WHERE id = ? AND clienteId = ?",
      [googleEventId, id, userId]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: true, message: "Reserva não encontrada para atualização." });
    }

    invalidateDbCache();

    // Emit event to update Marina/Admin panels automatically
    req.app.locals.io?.emit("marina_update", { action: 'upsert', reservation: { id, googleEventId } });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Client update reservation error:", err);
    res.status(500).json({ error: true, message: "Erro ao atualizar agendamento." });
  }
});

// Route: Register data deletion request under LGPD (Art. 18)
clientRoutes.post("/request-deletion", requireClientAuth, sensitiveLimiter, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userName = (req as any).user.nome;
    const protocol = `LGPD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    const pool = getDbPool();
    if (pool) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS SolicitacoesLGPD (
            id VARCHAR(50) PRIMARY KEY,
            clienteId VARCHAR(50) NOT NULL,
            protocolo VARCHAR(50) NOT NULL,
            tipo VARCHAR(50) DEFAULT 'exclusao_dados',
            status VARCHAR(30) DEFAULT 'pendente',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(
          "INSERT INTO SolicitacoesLGPD (id, clienteId, protocolo, tipo, status) VALUES (?, ?, ?, 'exclusao_dados', 'pendente')",
          [`req_${Date.now()}`, userId, protocol]
        );
      } catch (dbErr) {
        console.warn("Could not persist LGPD request to DB:", dbErr);
      }
    }

    writeAuditLog(userName, "client", "REQUEST_DATA_DELETION", req.ip, `Protocolo: ${protocol} | ID: ${userId}`);

    res.json({
      success: true,
      protocol,
      message: `Sua solicitação de exclusão de dados pessoais foi registrada com sucesso sob protocolo ${protocol}. O Encarregado de Dados (DPO) entrará em contato em até 15 dias.`
    });
  } catch (err: any) {
    console.error("Data deletion request error:", err);
    res.status(500).json({ error: true, message: "Erro ao processar solicitação de exclusão." });
  }
});

// Route: Client day-of checkin (NORMAM info)
clientRoutes.post("/checkin", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id, previsaoSaida, previsaoChegada, pessoasABordo, destino, acessoriosSolicitados } = req.body;

    if (!id || !previsaoSaida || !pessoasABordo || !previsaoChegada || !destino) {
      return res.status(400).json({ error: true, message: "Faltam parâmetros obrigatórios para a NORMAM." });
    }

    const currentPool = getDbPool();
    if (!currentPool) {
      return res.status(500).json({ error: true, message: "Banco de dados indisponível." });
    }

    const [resRows] = await currentPool.query(
      "SELECT id, embarcacaoId, clienteId, status, data FROM Reservas WHERE id = ? AND clienteId = ?",
      [id, userId]
    );
    const reserva = (resRows as any[])[0];
    if (!reserva) {
      return res.status(404).json({ error: true, message: "Reserva não encontrada ou acesso não autorizado." });
    }

    if (reserva.status === 'cancelado') {
      return res.status(400).json({ error: true, message: "Esta reserva foi cancelada e não pode receber check-in." });
    }

    const todayStr = getTodayBrasilia();
    if (reserva.data !== todayStr) {
      return res.status(400).json({ error: true, message: "O check-in só pode ser realizado na data agendada do passeio." });
    }

    const dbData = await getClientPortalData(userId);
    const clientCheckin = dbData.client;
    if (clientCheckin && hasClientOverdueDebt(clientCheckin, dbData.transacoes)) {
      return res.status(403).json({ error: true, message: "Você possui valores em aberto. Regularize sua situação para confirmar a saída." });
    }

    // Verifica se há cobrança avulsa vinculada especificamente a esta reserva ainda pendente de pagamento
    const [pendingResTxRows] = await currentPool.query(
      `SELECT id, valor FROM TransacoesFinanceiras
       WHERE reservaId = ? AND clienteId = ? AND tipo = 'receita'
         AND status NOT IN ('pago', 'realizado', 'cancelado', 'estornado')
       LIMIT 1`,
      [reserva.id, userId]
    );
    if ((pendingResTxRows as any[]).length > 0) {
      return res.status(403).json({
        error: true,
        code: "RESERVATION_PAYMENT_PENDING",
        message: "Esta descida fora do plano possui uma cobrança pendente de pagamento. Regularize o pagamento para liberar a descida."
      });
    }

    const [boatRows] = await currentPool.query("SELECT emManutencao, tipo, capacidadePassageiros, nome FROM Embarcacoes WHERE id = ?", [reserva.embarcacaoId]);
    const boat = (boatRows as any[])[0];
    if (boat && (boat.emManutencao === 1 || boat.emManutencao === true || boat.emManutencao === 'true')) {
      return res.status(400).json({ error: true, message: "Esta embarcação está em manutenção. Não é possível confirmar a reserva no momento." });
    }

    const isJetBoat = boat && (boat.tipo === 'jet' || (boat.nome || '').toLowerCase().includes('jet'));
    const maxPax = boat?.capacidadePassageiros ? Number(boat.capacidadePassageiros) : (isJetBoat ? 3 : 12);
    const numPax = Number(pessoasABordo);
    if (!Number.isFinite(numPax) || numPax < 1 || numPax > maxPax) {
      return res.status(400).json({ error: true, message: `A quantidade de pessoas a bordo deve ser entre 1 e ${maxPax} para esta embarcação.` });
    }

    const acessoriosJson = acessoriosSolicitados ? JSON.stringify(acessoriosSolicitados) : null;

    // Update reservation. Removed setting horaSaida and horaChegada during check-in so operational status isn't corrupted.
    await currentPool.query(
      "UPDATE Reservas SET previsaoSaida = ?, previsaoChegada = ?, pessoasABordo = ?, destino = ?, acessoriosSolicitados = ?, statusMarina = 'agendado', status = 'confirmado' WHERE id = ? AND clienteId = ?",
      [previsaoSaida, previsaoChegada, pessoasABordo, destino, acessoriosJson, id, userId]
    );
    invalidateDbCache();

    const [rows] = await currentPool.query("SELECT * FROM Reservas WHERE id = ? AND clienteId = ?", [id, userId]);
    const updatedRes = (rows as any[])[0] || { id, clienteId: userId, previsaoSaida, previsaoChegada, pessoasABordo, destino, acessoriosSolicitados: acessoriosJson, statusMarina: 'agendado', status: 'confirmado' };

    const fetchedBoatCheckin = dbData.boats.find((b: any) => b.id === updatedRes.embarcacaoId);

    // Anexa dados legíveis para a notificação de quem recebe o evento
    const enrichedRes = {
      ...updatedRes,
      embarcacaoNome: fetchedBoatCheckin?.nome || updatedRes.embarcacaoId,
      clienteNome: clientCheckin?.nome
    };

    req.app.locals.io?.emit("marina_update", { action: 'checkin', reservation: enrichedRes });

    res.json({ success: true, reservation: updatedRes });
  } catch (err: any) {
    console.error("Client checkin error:", err);
    res.status(500).json({ error: true, message: "Erro ao processar check-in." });
  }
});

// Route: Client cancel reservation
clientRoutes.post("/cancel-reservation", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: true, message: "Falta o ID da reserva." });
    }

    const currentPool = getDbPool();
    if (!currentPool) {
      return res.status(500).json({ error: true, message: "Banco de dados indisponível." });
    }

    const [checkRows] = await currentPool.query(
      "SELECT id, status, data, statusMarina FROM Reservas WHERE id = ? AND clienteId = ?",
      [id, userId]
    );
    const existingRes = (checkRows as any[])[0];
    if (!existingRes) {
      return res.status(404).json({ error: true, message: "Reserva não encontrada." });
    }

    if (existingRes.status === 'cancelado') {
      return res.status(400).json({ error: true, message: "Esta reserva já se encontra cancelada." });
    }

    const uncancelableStatuses = ['em_uso', 'concluido', 'finalizado'];
    if (uncancelableStatuses.includes(existingRes.status) || uncancelableStatuses.includes(existingRes.statusMarina)) {
      return res.status(400).json({ error: true, message: "Não é possível cancelar uma reserva que já está em andamento ou foi finalizada." });
    }

    const todayStr = getTodayBrasilia();
    if (existingRes.data < todayStr) {
      return res.status(400).json({ error: true, message: "Não é possível cancelar reservas de datas passadas." });
    }

    const [linkedTxRows] = await currentPool.query(
      "SELECT id, status FROM TransacoesFinanceiras WHERE reservaId = ? AND clienteId = ? AND status != 'cancelado'",
      [id, userId]
    );
    const linkedTxs = linkedTxRows as any[];
    if (linkedTxs.some((t) => ['pago', 'realizado'].includes(String(t.status || '').toLowerCase()))) {
      return res.status(400).json({
        error: true,
        message: "Esta reserva possui uma cobrança já paga. Entre em contato com o financeiro para cancelar ou solicitar estorno."
      });
    }

    const conn = await currentPool.getConnection();
    try {
      await conn.beginTransaction();

      const [updateResult]: any = await conn.query(
        "UPDATE Reservas SET status = 'cancelado' WHERE id = ? AND clienteId = ? AND status != 'cancelado'",
        [id, userId]
      );

      if (updateResult.affectedRows === 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: true, message: "Não foi possível cancelar o agendamento." });
      }

      if (linkedTxs.length > 0) {
        await conn.query(
          "UPDATE TransacoesFinanceiras SET status = 'cancelado' WHERE reservaId = ? AND clienteId = ? AND status NOT IN ('pago', 'realizado', 'cancelado', 'estornado')",
          [id, userId]
        );
      }

      await conn.commit();
      conn.release();
    } catch (cancelTxErr) {
      await conn.rollback();
      conn.release();
      throw cancelTxErr;
    }

    invalidateDbCache();
    if (linkedTxs.length > 0) {
      invalidateTransacoesCache();
      await syncClientFinancialStatus(userId);
    }
    writeAuditLog(
      (req as any).user?.nome || userId,
      "client",
      "CANCEL_RESERVATION",
      req.ip,
      `Reserva cancelada: ${id}${linkedTxs.length > 0 ? ` (cobrança vinculada cancelada: ${linkedTxs.map(t => t.id).join(',')})` : ''}`
    );
    req.app.locals.io?.emit("marina_update", { action: 'cancel', reservation: { id, status: 'cancelado' } });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Client cancel reservation error:", err);
    res.status(500).json({ error: true, message: "Erro ao cancelar agendamento." });
  }
});

// Route: Check weekend usage for a given month/boat (informational for calendar)
clientRoutes.get("/weekend-info", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { embarcacaoId, month, year } = req.query;
    if (!embarcacaoId || !month || !year) {
      return res.status(400).json({ error: true, message: "embarcacaoId, month e year são obrigatórios." });
    }

    const m = Number(month);
    const y = Number(year);

    const dbData = await getClientPortalData(userId);
    const boat = dbData.boats.find((b: any) => b.id === embarcacaoId);
    const rules = getBoatOperationRules(boat);
    const todayStr = getTodayBrasilia();

    const usageRaw = getClientWeekendUsageInMonth(userId, String(embarcacaoId), m, y, dbData.reservations);
    const weekendQuotaUsed =
      rules.regraFimDeSemana === 'sabado_ou_domingo'
        ? (rules.permitirReservaExtraFds ? usageRaw.guaranteedWeekendReservations.length >= 1 : usageRaw.allWeekendReservations.length >= 1)
        : rules.regraFimDeSemana === 'personalizado'
          ? (rules.permitirReservaExtraFds
              ? usageRaw.guaranteedWeekendReservations.length >= (rules.maxFdsGarantidosMes || 1)
              : usageRaw.allWeekendReservations.length >= (rules.maxFdsGarantidosMes || 1))
          : false;

    const usage = {
      saturdayUsed: usageRaw.saturdaysGuaranteed.length > 0,
      sundayUsed: usageRaw.sundaysGuaranteed.length > 0,
      weekendQuotaUsed,
      rules
    };

    // Find extra reservations from OTHER cotistas on this boat that this client could contest
    const nowMs = Date.now();
    const contestable: any[] = [];

    for (const r of dbData.reservations) {
      if (r.embarcacaoId !== embarcacaoId || r.status === 'cancelado' || r.clienteId === userId) continue;
      if (r.tipoReserva !== 'extra') continue;

      const rDate = new Date(r.data + "T12:00:00Z");
      if (rDate.getUTCMonth() !== m || rDate.getUTCFullYear() !== y) continue;

      const contestEval = canClientContestExtraReservation({
        userId,
        embarcacaoId: String(embarcacaoId),
        targetReservation: r,
        reservations: dbData.reservations,
        boat,
        todayStr,
        nowMs
      });
      if (!contestEval.canContest) continue;

      contestable.push({
        id: r.id,
        data: r.data,
        dayOfWeek: rDate.getUTCDay()
      });
    }

    res.json({ usage, contestable });
  } catch (err: any) {
    console.error("Weekend info error:", err);
    res.status(500).json({ error: true, message: "Erro ao obter informações de fim de semana." });
  }
});

// Route: Contest an extra weekend reservation
clientRoutes.post("/contestar", requireClientAuth, sensitiveLimiter, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { reservaId, embarcacaoId } = req.body;

    if (!reservaId || !embarcacaoId) {
      return res.status(400).json({ error: true, message: "reservaId e embarcacaoId são obrigatórios." });
    }

    const dbData = await getClientPortalData(userId);
    const client = dbData.client;
    if (!client) return res.status(404).json({ error: true, message: "Cliente não encontrado." });

    if (hasClientOverdueDebt(client, dbData.transacoes)) {
      return res.status(403).json({ error: true, message: "Você possui valores em aberto. Regularize sua situação financeira para contestar reservas." });
    }

    // Verify the client owns this boat
    const clientBoatsList = client.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes.map((eb: any) => eb.embarcacaoId)
      : [client.embarcacaoId];
    if (!clientBoatsList.includes(embarcacaoId)) {
      return res.status(403).json({ error: true, message: "Acesso negado à embarcação." });
    }

    const boat = dbData.boats.find((b: any) => b.id === embarcacaoId);
    if (boat && boat.emManutencao) {
      return res.status(400).json({ error: true, message: "Esta embarcação está em manutenção. Não é possível contestar reservas no momento." });
    }

    const rules = getBoatOperationRules(boat);
    const todayStr = getTodayBrasilia();

    // Find the target reservation
    const targetRes = dbData.reservations.find((r: any) => r.id === reservaId);
    const contestEval = canClientContestExtraReservation({
      userId,
      embarcacaoId,
      targetReservation: targetRes,
      reservations: dbData.reservations,
      boat,
      todayStr
    });
    if (!contestEval.canContest) {
      const status = !targetRes ? 404 : 400;
      return res.status(status).json({ error: true, message: contestEval.reason || "Não é possível contestar esta reserva." });
    }

    const reqDateObj = new Date(targetRes.data + "T12:00:00Z");
    const reqDayOfWeek = reqDateObj.getUTCDay();

    // All checks passed — proceed with contestation in atomic transaction
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "Banco de dados indisponível." });

    const conn = await currentPool.getConnection();
    let newRes: any;
    try {
      await conn.beginTransaction();

      // Enforce active reservation limit atomically inside transaction
      const [clientActiveRows]: any = await conn.query(
        "SELECT id FROM Reservas WHERE clienteId = ? AND embarcacaoId = ? AND status != 'cancelado' AND data >= ? FOR UPDATE",
        [userId, embarcacaoId, todayStr]
      );
      if ((clientActiveRows as any[]).length >= rules.maxReservasAtivas) {
        await conn.rollback();
        conn.release();
        const limitMsg =
          rules.maxReservasAtivas === 1
            ? "Você já possui 1 reserva ativa para esta embarcação. Pela regra de operação, só é permitido ter 1 reserva ativa por vez."
            : `Você atingiu o limite máximo de ${rules.maxReservasAtivas} reservas ativas simultâneas para esta embarcação.`;
        return res.status(400).json({ error: true, message: limitMsg });
      }

      // Lock target reservation
      const [targetLockRows]: any = await conn.query(
        "SELECT id, status, tipoReserva, data, clienteId, embarcacaoId FROM Reservas WHERE id = ? FOR UPDATE",
        [reservaId]
      );
      const lockedTarget = targetLockRows[0];
      if (!lockedTarget || lockedTarget.status === 'cancelado' || lockedTarget.tipoReserva !== 'extra') {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: true, message: "A reserva alvo foi cancelada ou não está mais disponível para contestação." });
      }

      // Check overlap for other reservations on the same date/boat
      const [overlapRows]: any = await conn.query(
        "SELECT id FROM Reservas WHERE embarcacaoId = ? AND data = ? AND status != 'cancelado' AND id != ? FOR UPDATE",
        [embarcacaoId, targetRes.data, reservaId]
      );
      if (overlapRows.length > 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: true, message: "Essa data já possui outra reserva ativa para esta embarcação." });
      }

      // 1. Cancel the extra reservation
      await conn.query(
        "UPDATE Reservas SET status = 'cancelado', contestadaPor = ?, contestadaEm = ? WHERE id = ?",
        [userId, new Date().toISOString(), reservaId]
      );

      // 2. Determine position
      const [maxRows]: any = await conn.query(
        "SELECT MAX(posicaoFila) as maxPos FROM Reservas WHERE data = ? AND status != 'cancelado'",
        [targetRes.data]
      );
      const nextPos = ((maxRows as any[])[0]?.maxPos || 0) + 1;
      const isMarinaOnlyBoat = boat?.empresas && boat.empresas.includes('MARINA') && !boat.empresas.includes('VALE');

      // 3. Create the new guaranteed reservation
      newRes = {
        id: `res_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
        embarcacaoId,
        clienteId: userId,
        data: targetRes.data,
        periodo: 'dia_inteiro',
        observacoes: `Reserva garantida via contestação (substituiu reserva ${reservaId})`,
        observações: `Reserva garantida via contestação (substituiu reserva ${reservaId})`,
        status: 'agendado',
        statusMarina: 'agendado',
        tipoReserva: 'garantida' as const,
        origem: isMarinaOnlyBoat ? 'marina' : 'cota',
        posicaoFila: nextPos,
        createdAt: new Date().toISOString()
      };

      await conn.query(
        `INSERT INTO Reservas (id, embarcacaoId, clienteId, data, periodo, observacoes, status, statusMarina, tipoReserva, origem, posicaoFila, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newRes.id, newRes.embarcacaoId, newRes.clienteId, newRes.data, newRes.periodo, newRes.observacoes, newRes.status, newRes.statusMarina, newRes.tipoReserva, newRes.origem, newRes.posicaoFila, newRes.createdAt]
      );

      await conn.commit();
      conn.release();
      invalidateDbCache();
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      throw txErr;
    }

    // 4. Emit socket events
    const io = req.app.locals.io;
    if (io) {
      io.emit("marina_update", { action: 'cancel', reservation: { id: reservaId, status: 'cancelado', contestadaPor: userId } });
      io.emit("marina_update", { action: 'new', reservation: newRes });
      // Specific event for contestation — for targeted notifications
      io.emit("contestacao", {
        cancelledReservationId: reservaId,
        cancelledClienteId: targetRes.clienteId,
        newReservation: newRes,
        contestedBy: userId,
        contestedByNome: client.nome,
        data: targetRes.data
      });
    }

    // 5. Send WhatsApp notification to the displaced client
    try {
      const [displacedRows] = await currentPool.query("SELECT id, nome FROM Clientes WHERE id = ? LIMIT 1", [targetRes.clienteId]);
      const displacedClient = (displacedRows as any[])[0];
      const boat = dbData.boats.find((b: any) => b.id === embarcacaoId);
      if (displacedClient && boat && boat.whatsappGroupId) {
        const formattedDate = targetRes.data.split('-').reverse().join('/');
        const dayName = reqDayOfWeek === 0 ? "Domingo" : "Sábado";
        const message = `⚠️ *Aviso de Contestação*\n\nOlá ${displacedClient.nome?.split(' ')[0]},\n\nSua reserva EXTRA de ${dayName} (${formattedDate}) para a embarcação *${boat.nome || boat.codigo || ''}* foi contestada por outro cotista que está exercendo seu direito ao dia garantido.\n\nA reserva foi cancelada automaticamente.\n\nCaso tenha dúvidas, entre em contato com a administração da Marina.`;

        // Try to send via Evolution API (fire and forget)
        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
        const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
        const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'mexicano';
        if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
          fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({ number: boat.whatsappGroupId, text: message })
          }).catch(() => {});
        }
      }
    } catch (whatsErr) {
      console.error("[Contestação WhatsApp Error]", whatsErr);
    }

    writeAuditLog(client.nome, "client", "CONTESTACAO", req.ip, `Contestou reserva ${reservaId} e criou ${newRes.id} para ${targetRes.data}`);
    res.json({ success: true, reservation: newRes, cancelledReservationId: reservaId });
  } catch (err: any) {
    console.error("Client contestar error:", err);
    res.status(500).json({ error: true, message: "Erro ao processar contestação." });
  }
});

// Route: Get financial parameters for client UI
clientRoutes.get("/financeiro-config", requireClientAuth, async (req, res) => {
  try {
    const taxaJurosMensal = await getConfigValue('fin_taxa_juros_mensal') || '2.2';
    const taxaMultaAtraso = await getConfigValue('fin_taxa_multa_atraso') || '2.0';
    const diasFaturaAtual = await getConfigValue('fin_asaas_dias_fatura_atual') || '30';

    res.json({
      success: true,
      configuracoes: {
        taxaJurosMensal,
        taxaMultaAtraso,
        diasFaturaAtual
      }
    });
  } catch (err: any) {
    console.error("Error fetching client financial config:", err);
    res.status(500).json({ error: true, message: "Erro ao obter configurações financeiras." });
  }
});

// Route: Client send reservation calendar image to boat WhatsApp group
clientRoutes.post("/send-calendar", requireClientAuth, whatsappLimiter, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { base64Image, embarcacaoId, dates, caption, portalUrl: customPortalUrl } = req.body;

    if (!base64Image || !embarcacaoId) {
      return res.status(400).json({ error: true, message: "Imagem e ID da embarcação são obrigatórios." });
    }

    const dbData = await getClientPortalData(userId);
    const client = dbData.client;
    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado." });
    }

    const clientBoatsList = client.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes.map((eb: any) => eb.embarcacaoId)
      : [client.embarcacaoId];

    if (!clientBoatsList.includes(embarcacaoId)) {
      return res.status(403).json({ error: true, message: "Acesso não autorizado a esta embarcação." });
    }

    const boat = dbData.boats.find((b: any) => b.id === embarcacaoId);
    if (!boat || !boat.whatsappGroupId) {
      return res.status(400).json({ error: true, message: "Embarcação não possui grupo de WhatsApp configurado." });
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE || "mexicano";

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ error: true, message: "Serviço de WhatsApp não configurado no servidor." });
    }

    // Determina o link do portal do cliente (app)
    let rawAppUrl = customPortalUrl;
    if (!rawAppUrl || rawAppUrl.includes("localhost") || rawAppUrl.includes("127.0.0.1") || rawAppUrl.includes("tunnelmole")) {
      try {
        const dbUrl = await getConfigValue("app_url");
        if (dbUrl && !dbUrl.includes("localhost") && !dbUrl.includes("127.0.0.1") && !dbUrl.includes("tunnelmole")) {
          rawAppUrl = dbUrl;
        } else if (process.env.APP_URL && !process.env.APP_URL.includes("localhost") && !process.env.APP_URL.includes("127.0.0.1") && !process.env.APP_URL.includes("tunnelmole")) {
          rawAppUrl = process.env.APP_URL;
        }
      } catch {}
    }
    if (!rawAppUrl || rawAppUrl.includes("localhost") || rawAppUrl.includes("127.0.0.1") || rawAppUrl.includes("tunnelmole")) {
      rawAppUrl = "https://mexicano.echo.dev.br";
    }
    const cleanBaseUrl = rawAppUrl.replace(/\/$/, "");
    const portalUrl = cleanBaseUrl.endsWith("/portal") ? cleanBaseUrl : `${cleanBaseUrl}/portal`;

    // Monta a legenda informando que foi realizada pelo App e convidando outros cotistas com o link
    let finalCaption = caption;
    if (!finalCaption) {
      let template = "";
      try {
        template = (await getConfigValue("whatsapp_client_reserva_template")) || "";
      } catch {}

      if (!template || !template.trim()) {
        template = [
          "📲 *Reserva Realizada via App* 🚤",
          "👤 Cotista: {cliente}",
          "🗓️ Data: {data}",
          "",
          "👉 Agende pelo App: {link}"
        ].join("\n");
      }

      finalCaption = template
        .replace(/{barco}/g, boat.nome || 'Embarcação')
        .replace(/{cliente}/g, client.nome || 'Cotista')
        .replace(/{data}/g, dates || '')
        .replace(/{link}/g, portalUrl);
    }

    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const payload = {
      number: boat.whatsappGroupId,
      mediatype: "image",
      mimetype: "image/png",
      caption: finalCaption,
      media: base64Data
    };

    const targetUrl = new URL(`${apiUrl}/message/sendMedia/${instance}`);
    const isHttps = targetUrl.protocol === 'https:';

    const sendPromise = new Promise<{ ok: boolean; status: number; text: string }>((resolve, reject) => {
      const postData = JSON.stringify(payload);
      const reqOpts = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          "apikey": apiKey
        },
        agent: isHttps ? evolutionHttpsAgent : undefined
      };

      const reqSender = (isHttps ? https : http).request(targetUrl, reqOpts, (evoRes) => {
        const chunks: Buffer[] = [];
        evoRes.on("data", (chunk) => chunks.push(chunk));
        evoRes.on("end", () => {
          resolve({
            ok: !!(evoRes.statusCode && evoRes.statusCode >= 200 && evoRes.statusCode < 300),
            status: evoRes.statusCode || 500,
            text: Buffer.concat(chunks).toString("utf-8")
          });
        });
      });

      reqSender.on("error", reject);
      reqSender.write(postData);
      reqSender.end();
    });

    const evoResult = await sendPromise;

    if (!evoResult.ok) {
      console.error("Evolution API calendar send failure:", evoResult.status, evoResult.text);
      return res.status(502).json({ error: true, message: "Falha ao enviar imagem da agenda para o WhatsApp." });
    }

    writeAuditLog(client.nome, "client", "SEND_CALENDAR_WHATSAPP", req.ip, `Embarcação: ${boat.nome || embarcacaoId}`);
    res.json({ success: true, message: "Agenda enviada com sucesso ao grupo da embarcação." });
  } catch (err: any) {
    console.error("Error sending client calendar via WhatsApp:", err);
    res.status(500).json({ error: true, message: "Erro interno ao enviar para o WhatsApp." });
  }
});

// Route: Client change own password
clientRoutes.post("/change-password", requireClientAuth, sensitiveLimiter, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: true, message: "Senha atual e nova senha são obrigatórias." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: true, message: "A nova senha deve ter no mínimo 6 caracteres." });
    }

    const clientAuth = await getClientAuth(userId);
    if (!clientAuth) {
      return res.status(404).json({ error: true, message: "Credenciais não encontradas." });
    }

    const isValid = await bcrypt.compare(currentPassword, clientAuth.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: true, message: "Senha atual incorreta." });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    // upsertClientAuth automaticamente incrementa o tokenVersion, invalidando sessões antigas
    await upsertClientAuth(userId, newHash);

    writeAuditLog((req as any).user?.nome || userId, "client", "CHANGE_PASSWORD_SUCCESS", req.ip);

    res.json({ success: true, message: "Senha alterada com sucesso! Faça login novamente com a nova senha." });
  } catch (err: any) {
    console.error("Client change password error:", err);
    res.status(500).json({ error: true, message: "Erro interno ao alterar a senha." });
  }
});

// ---------------- Notificações Push nativas do PWA ----------------

// Route: Chave pública VAPID para inscrição do dispositivo
clientRoutes.get("/push/public-key", requireClientAuth, async (_req, res) => {
  const keys = await getVapidKeys();
  if (!keys) {
    return res.status(503).json({ error: true, message: "Notificações indisponíveis no momento." });
  }
  res.json({ success: true, publicKey: keys.publicKey });
});

// Route: Registra o dispositivo do cliente para receber notificações
clientRoutes.post("/push/subscribe", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const subscription = req.body?.subscription;
    if (
      !subscription ||
      typeof subscription.endpoint !== "string" ||
      !subscription.endpoint.startsWith("https://") ||
      typeof subscription.keys?.p256dh !== "string" ||
      typeof subscription.keys?.auth !== "string"
    ) {
      return res.status(400).json({ error: true, message: "Inscrição de notificação inválida." });
    }
    await saveClientPushSubscription(userId, subscription, req.headers["user-agent"] as string);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Client push subscribe error:", err);
    res.status(500).json({ error: true, message: "Erro ao ativar notificações." });
  }
});

// Route: Remove o dispositivo do cliente das notificações
clientRoutes.post("/push/unsubscribe", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const endpoint = req.body?.endpoint;
    if (typeof endpoint === "string" && endpoint) {
      await removeClientPushSubscription(endpoint, userId);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("Client push unsubscribe error:", err);
    res.status(500).json({ error: true, message: "Erro ao desativar notificações." });
  }
});

export default clientRoutes;
