import { Router } from "express";
import { getDbPool, pullDatabase, upsertReservation, deleteReservation, getConfigValue } from "../server-db";
import { requireClientAuth, sensitiveLimiter } from "./middlewares";
import { writeAuditLog } from "./middlewares"; 


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

    if (reqDayOfWeek === 0 || reqDayOfWeek === 6) {
      const reqMonth = reqDateObj.getUTCMonth();
      const reqYear = reqDateObj.getUTCFullYear();
      
      const sameDayTypeReservations = dbData.reservations.filter((r: any) => {
        if (r.clienteId !== userId || r.embarcacaoId !== embarcacaoId || r.status === 'cancelado') return false;
        const rDateObj = new Date(r.data + "T12:00:00Z");
        return rDateObj.getUTCMonth() === reqMonth && 
               rDateObj.getUTCFullYear() === reqYear && 
               rDateObj.getUTCDay() === reqDayOfWeek;
      });
      
      if (sameDayTypeReservations.length >= 1) {
        const dayName = reqDayOfWeek === 0 ? "domingo" : "sábado";
        return res.status(400).json({ error: true, message: `Você já possui um agendamento para um ${dayName} neste mês com esta embarcação.` });
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



export default clientRoutes;
