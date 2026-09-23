import { Router } from "express";
import { requireAdminAuth, writeAuditLog, apiLimiter } from "./middlewares";
import { getAllFeedbacks, getClientByCpf, upsertFeedback, deleteFeedback } from "../server-db";

const router = Router();

// [Rotas migradas do server.ts]

// Route: Get all feedbacks (Admin only)
router.get("/feedbacks", requireAdminAuth, async (req, res) => {
  try {
    const feedbacks = await getAllFeedbacks();
    res.json({ success: true, feedbacks });
  } catch (err: any) {
    console.error("Error getting feedbacks:", err);
    res.status(500).json({ error: true, message: "Erro ao buscar feedbacks." });
  }
});

// Route: Identify client by CPF safely (Public)
router.post("/feedbacks/identificar", async (req, res) => {
  try {
    const { cpf } = req.body;
    if (!cpf) {
      return res.status(400).json({ error: true, message: "CPF é obrigatório." });
    }
    const cleanCpf = cpf.replace(/\D/g, '');
    const client = await getClientByCpf(cleanCpf);
    if (!client) {
      return res.status(404).json({ error: true, message: "Cliente não encontrado." });
    }
    
    // Format name safely: "Deivid Nico" -> "Deivid N."
    const nameParts = client.nome.trim().split(/\s+/);
    let safeName = nameParts[0];
    if (nameParts.length > 1) {
      const lastName = nameParts[nameParts.length - 1];
      if (lastName.length > 0) {
        safeName += ` ${lastName[0]}.`;
      }
    }

    res.json({ success: true, nome: safeName });
  } catch (err: any) {
    console.error("Error identifying client for feedback:", err);
    res.status(500).json({ error: true, message: "Erro ao buscar cliente." });
  }
});

// Route: Submit a new feedback (Public)
router.post("/feedbacks", async (req, res) => {
  try {
    const { cpf, nomeCliente, telefoneCliente, categoria, nota, comentario } = req.body;
    if (!categoria || !nota || !comentario) {
      return res.status(400).json({ error: true, message: "Campos categoria, nota e comentário são obrigatórios." });
    }
    
    let clienteId = null;
    let finalNome = nomeCliente;
    let finalTelefone = telefoneCliente;

    if (cpf) {
      const cleanCpf = cpf.replace(/\D/g, '');
      const client = await getClientByCpf(cleanCpf);
      if (client) {
        clienteId = client.id;
        if (!finalNome) finalNome = client.nome;
        if (!finalTelefone) finalTelefone = client.telefone;
      }
    }

    const id = "fb_" + crypto.randomUUID();
    const feedback = {
      id,
      clienteId,
      nomeCliente: finalNome || null,
      telefoneCliente: finalTelefone || null,
      categoria,
      nota: parseInt(nota, 10),
      comentario,
      status: "pendente",
      respostaAdmin: null,
      createdAt: new Date().toISOString()
    };

    await upsertFeedback(feedback);
    writeAuditLog("public", "anonymous", "CREATE_FEEDBACK", req.ip, `ID: ${id}, Categoria: ${categoria}`);
    res.json({ success: true, feedback });
  } catch (err: any) {
    console.error("Error saving feedback:", err);
    res.status(500).json({ error: true, message: "Erro ao enviar feedback." });
  }
});

// Route: Respond to or update feedback status (Admin only)
router.post("/feedbacks/:id/responder", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, respostaAdmin } = req.body;

    const currentFeedbacks = await getAllFeedbacks();
    const fb = currentFeedbacks.find(x => x.id === id);
    if (!fb) {
      return res.status(404).json({ error: true, message: "Feedback não encontrado." });
    }

    const updated = {
      ...fb,
      status: status || fb.status,
      respostaAdmin: respostaAdmin !== undefined ? respostaAdmin : fb.respostaAdmin
    };

    await upsertFeedback(updated);
    writeAuditLog((req as any).user.username, "admin", "RESPOND_FEEDBACK", req.ip, `ID: ${id}, Status: ${status}`);
    res.json({ success: true, feedback: updated });
  } catch (err: any) {
    console.error("Error responding to feedback:", err);
    res.status(500).json({ error: true, message: "Erro ao registrar resposta." });
  }
});

// Route: Delete feedback (Admin only)
router.delete("/feedbacks/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteFeedback(id);
    writeAuditLog((req as any).user.username, "admin", "DELETE_FEEDBACK", req.ip, `ID: ${id}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting feedback:", err);
    res.status(500).json({ error: true, message: "Erro ao deletar feedback." });
  }

});

export default router;
