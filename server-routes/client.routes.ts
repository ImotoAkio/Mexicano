import { Router } from "express";
import { getDbPool, pullDatabase, upsertReservation, deleteReservation, cancelReservation, getConfigValue } from "../server-db";
import { requireClientAuth, sensitiveLimiter } from "./middlewares";
import { writeAuditLog } from "./middlewares";

/** Helper: check if a date string (YYYY-MM-DD) falls on a configured holiday */
function isHoliday(dateStr: string, holidays: string[]): boolean {
  return holidays.includes(dateStr);
}

/** Helper: determine tipoReserva for a weekend request */
function calcTipoReserva(
  userId: string,
  embarcacaoId: string,
  reqDayOfWeek: number,
  reqMonth: number,
  reqYear: number,
  reservations: any[]
): 'garantida' | 'extra' {
  const sameDayType = reservations.filter((r: any) => {
    if (r.clienteId !== userId || r.embarcacaoId !== embarcacaoId || r.status === 'cancelado') return false;
    const rDateObj = new Date(r.data + "T12:00:00Z");
    return rDateObj.getUTCMonth() === reqMonth &&
           rDateObj.getUTCFullYear() === reqYear &&
           rDateObj.getUTCDay() === reqDayOfWeek;
  });
  // First weekend day of this type in the month => garantida; subsequent => extra
  return sameDayType.length >= 1 ? 'extra' : 'garantida';
}


const clientRoutes = Router();

// Route: Get client data using JWT (secure data fetch)
clientRoutes.get("/me", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const dbData = await pullDatabase();
    const client = dbData.clients.find((c: any) => c.id === userId);

    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado." });
    }

    const clientBoatsList = client.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes.map((eb: any) => eb.embarcacaoId)
      : [client.embarcacaoId];

    const boats = dbData.boats.filter((b: any) => clientBoatsList.includes(b.id));
    const reservations = dbData.reservations.filter((r: any) => clientBoatsList.includes(r.embarcacaoId));
    const transacoes = dbData.transacoes.filter((t: any) => t.clienteId === client.id);
    const chamados = dbData.chamados ? dbData.chamados.filter((c: any) => c.clienteId === client.id || clientBoatsList.includes(c.embarcacaoId)) : [];
    writeAuditLog(client.nome, "client", "FETCH_DATA", req.ip, `ID: ${client.id}`);
    res.json({ client, boats, reservations, transacoes, chamados });
  } catch (err: any) {
    console.error("Client data fetch error:", err);
    res.status(500).json({ error: true, message: "Erro ao carregar dados do cliente." });
  }
});

// Route: Create a new reservation for the client securely
clientRoutes.post("/reserve", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { embarcacaoId, date, periodo = 'dia_inteiro', observacoes = '' } = req.body;

    const dbData = await pullDatabase();
    const client = dbData.clients.find((c: any) => c.id === userId);

    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado." });
    }

    const clientBoatsList = client.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes.map((eb: any) => eb.embarcacaoId)
      : [client.embarcacaoId];

    if (!clientBoatsList.includes(embarcacaoId)) {
      return res.status(403).json({ error: true, message: "Acesso negado à embarcação." });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      return res.status(400).json({ error: true, message: "Não é possível reservar datas passadas." });
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

    if ((reqDayOfWeek === 1 || reqDayOfWeek === 2) && client.plano !== 'completo') {
      return res.status(400).json({ error: true, message: "A Marina é fechada às segundas e terças-feiras para o seu plano atual." });
    }

    // Weekend reservation logic: guaranteed vs extra
    let tipoReserva: 'garantida' | 'extra' = 'garantida';
    const isWeekend = reqDayOfWeek === 0 || reqDayOfWeek === 6;

    if (isWeekend) {
      const reqMonth = reqDateObj.getUTCMonth();
      const reqYear = reqDateObj.getUTCFullYear();

      tipoReserva = calcTipoReserva(userId, embarcacaoId, reqDayOfWeek, reqMonth, reqYear, dbData.reservations);

      // Check if the request explicitly confirms extra reservation
      const { confirmExtra } = req.body;
      if (tipoReserva === 'extra' && !confirmExtra) {
        const dayName = reqDayOfWeek === 0 ? "domingo" : "sábado";
        return res.status(409).json({
          error: true,
          requireConfirmation: true,
          tipoReserva: 'extra',
          message: `Você já utilizou seu ${dayName} garantido neste mês para esta embarcação. Esta será uma reserva EXTRA e poderá ser contestada por outro cotista até 48 horas antes da data.`
        });
      }
    }

    const activeReservations = dbData.reservations.filter((r: any) => 
      r.clienteId === userId && r.embarcacaoId === embarcacaoId && r.status !== 'cancelado' && r.data >= todayStr
    );
    if (activeReservations.length >= 2) {
      return res.status(400).json({ error: true, message: "Você atingiu o limite máximo de 2 reservas ativas simultâneas para esta embarcação." });
    }

    const newRes = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
      embarcacaoId,
      clienteId: userId,
      data: date,
      periodo,
      observações: observacoes,
      status: 'agendado',
      statusMarina: 'agendado',
      tipoReserva,
      createdAt: new Date().toISOString()
    };

    await upsertReservation(newRes);

    req.app.locals.io?.emit("marina_update", { action: 'new', reservation: newRes });

    writeAuditLog(client.nome, "client", "CREATE_RESERVATION", req.ip, `Reserva criada: ${date} - ${embarcacaoId}`);
    res.json({ success: true, reservation: newRes });
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

    await currentPool.query(
      "UPDATE Reservas SET googleEventId = ? WHERE id = ? AND clienteId = ?",
      [googleEventId, id, userId]
    );

    // Emit event to update Marina/Admin panels automatically
    req.app.locals.io?.emit("marina_update", { action: 'upsert', reservation: { id, googleEventId } });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Client update reservation error:", err);
    res.status(500).json({ error: true, message: "Erro ao atualizar agendamento." });
  }
});

// Route: Register data deletion request under LGPD (Art. 18)
clientRoutes.post("/request-deletion", requireClientAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userName = (req as any).user.nome;
    
    writeAuditLog(userName, "client", "REQUEST_DATA_DELETION", req.ip, `Solicitação de exclusão recebida para ID: ${userId}`);

    res.json({
      success: true,
      message: "Sua solicitação de exclusão de dados pessoais foi registrada com sucesso sob protocolo LGPD. O Encarregado de Dados (DPO) entrará em contato em até 15 dias."
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
    const { id, previsaoSaida, previsaoChegada, pessoasABordo, destino } = req.body;
    
    if (!id || !previsaoSaida || !pessoasABordo || !previsaoChegada || !destino) {
      return res.status(400).json({ error: true, message: "Faltam parâmetros obrigatórios para a NORMAM." });
    }

    const currentPool = getDbPool();
    if (!currentPool) {
      return res.status(500).json({ error: true, message: "Banco de dados indisponível." });
    }

    // Update reservation. Removed setting horaSaida and horaChegada during check-in so operational status isn't corrupted.
    await currentPool.query(
      "UPDATE Reservas SET previsaoSaida = ?, previsaoChegada = ?, pessoasABordo = ?, destino = ?, statusMarina = 'agendado', status = 'confirmado' WHERE id = ?",
      [previsaoSaida, previsaoChegada, pessoasABordo, destino, id]
    );

    const [rows] = await currentPool.query("SELECT * FROM Reservas WHERE id = ?", [id]);
    const updatedRes = (rows as any[])[0] || { id, clienteId: userId, previsaoSaida, previsaoChegada, pessoasABordo, destino, statusMarina: 'agendado', status: 'confirmado' };

    req.app.locals.io?.emit("marina_update", { action: 'checkin', reservation: updatedRes });

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

    await currentPool.query(
      "UPDATE Reservas SET status = 'cancelado' WHERE id = ? AND clienteId = ?",
      [id, userId]
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

    const dbData = await pullDatabase();

    // Count how many guaranteed Saturdays and Sundays this client used this month
    const usage = { saturdayUsed: false, sundayUsed: false };
    for (const r of dbData.reservations) {
      if (r.clienteId !== userId || r.embarcacaoId !== embarcacaoId || r.status === 'cancelado') continue;
      const rDate = new Date(r.data + "T12:00:00Z");
      if (rDate.getUTCMonth() !== m || rDate.getUTCFullYear() !== y) continue;
      const dow = rDate.getUTCDay();
      if (dow === 6 && r.tipoReserva !== 'extra') usage.saturdayUsed = true;
      if (dow === 0 && r.tipoReserva !== 'extra') usage.sundayUsed = true;
    }

    // Find extra reservations from OTHER cotistas on this boat that this client could contest
    const clientBoatsList = (dbData.clients.find((c: any) => c.id === userId)?.embarcacoes || []).map((eb: any) => eb.embarcacaoId);
    const now = new Date();
    const contestable: any[] = [];

    for (const r of dbData.reservations) {
      if (r.embarcacaoId !== embarcacaoId || r.status === 'cancelado' || r.clienteId === userId) continue;
      if (r.tipoReserva !== 'extra') continue;

      const rDate = new Date(r.data + "T12:00:00Z");
      if (rDate.getUTCMonth() !== m || rDate.getUTCFullYear() !== y) continue;

      // 48h check
      const resDateTime = new Date(r.data + "T00:00:00");
      const hoursUntil = (resDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntil <= 48) continue;

      // Check if the current client still has their guaranteed day available
      const dow = rDate.getUTCDay();
      if (dow === 6 && usage.saturdayUsed) continue;
      if (dow === 0 && usage.sundayUsed) continue;

      contestable.push({
        id: r.id,
        data: r.data,
        clienteId: r.clienteId,
        dayOfWeek: dow
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

    const dbData = await pullDatabase();
    const client = dbData.clients.find((c: any) => c.id === userId);
    if (!client) return res.status(404).json({ error: true, message: "Cliente não encontrado." });

    // Verify the client owns this boat
    const clientBoatsList = client.embarcacoes && client.embarcacoes.length > 0
      ? client.embarcacoes.map((eb: any) => eb.embarcacaoId)
      : [client.embarcacaoId];
    if (!clientBoatsList.includes(embarcacaoId)) {
      return res.status(403).json({ error: true, message: "Acesso negado à embarcação." });
    }

    // Find the target reservation
    const targetRes = dbData.reservations.find((r: any) => r.id === reservaId);
    if (!targetRes) return res.status(404).json({ error: true, message: "Reserva não encontrada." });
    if (targetRes.status === 'cancelado') return res.status(400).json({ error: true, message: "Esta reserva já foi cancelada." });
    if (targetRes.tipoReserva !== 'extra') return res.status(400).json({ error: true, message: "Apenas reservas EXTRAS podem ser contestadas." });
    if (targetRes.clienteId === userId) return res.status(400).json({ error: true, message: "Você não pode contestar sua própria reserva." });
    if (targetRes.embarcacaoId !== embarcacaoId) return res.status(400).json({ error: true, message: "Embarcação não confere." });

    // 48-hour deadline check
    const now = new Date();
    const resDate = new Date(targetRes.data + "T00:00:00");
    const hoursUntil = (resDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil <= 48) {
      return res.status(400).json({ error: true, message: "Esta reserva não pode mais ser contestada pois está a menos de 48 horas da data." });
    }

    // Check if the contesting client already used their guaranteed day this month
    const reqDateObj = new Date(targetRes.data + "T12:00:00Z");
    const reqDayOfWeek = reqDateObj.getUTCDay();
    const reqMonth = reqDateObj.getUTCMonth();
    const reqYear = reqDateObj.getUTCFullYear();

    const tipo = calcTipoReserva(userId, embarcacaoId, reqDayOfWeek, reqMonth, reqYear, dbData.reservations);
    if (tipo !== 'garantida') {
      const dayName = reqDayOfWeek === 0 ? "domingo" : "sábado";
      return res.status(400).json({ error: true, message: `Você já utilizou seu ${dayName} garantido neste mês. Não é possível contestar.` });
    }

    // All checks passed — proceed with contestation
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "Banco de dados indisponível." });

    // 1. Cancel the extra reservation (mark as cancelled + who contested)
    await currentPool.query(
      "UPDATE Reservas SET status = 'cancelado', contestadaPor = ?, contestadaEm = ? WHERE id = ?",
      [userId, new Date().toISOString(), reservaId]
    );

    // 2. Check overlaps for the contesting client on the same boat+date
    const overlapCheck = dbData.reservations.filter((r: any) =>
      r.embarcacaoId === embarcacaoId && r.data === targetRes.data && r.status !== 'cancelado' && r.id !== reservaId
    );
    if (overlapCheck.length > 0) {
      return res.status(400).json({ error: true, message: "Essa data já possui outra reserva ativa para esta embarcação." });
    }

    // 3. Create the new guaranteed reservation for the contesting client
    const newRes = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
      embarcacaoId,
      clienteId: userId,
      data: targetRes.data,
      periodo: 'dia_inteiro',
      observações: `Reserva garantida via contestação (substituiu reserva ${reservaId})`,
      status: 'agendado',
      statusMarina: 'agendado',
      tipoReserva: 'garantida' as const,
      createdAt: new Date().toISOString()
    };

    await upsertReservation(newRes);

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
      const displacedClient = dbData.clients.find((c: any) => c.id === targetRes.clienteId);
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



export default clientRoutes;
