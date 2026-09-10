import express from "express";
import { getAllLeads, upsertLead, deleteLead, getDbPool } from "../server-db";
import { requireAdminAuth } from "./middlewares";
import crypto from "crypto";

const router = express.Router();

// --- PUBLIC ROUTES ---
// Start a lead (Captures form data before quiz starts)
router.post("/start", async (req, res) => {
  try {
    const { nome, telefone, email } = req.body;
    if (!nome || !telefone) {
      return res.status(400).json({ error: "Nome e telefone são obrigatórios" });
    }

    const id = `lead_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newLead = {
      id,
      nome,
      telefone,
      email: email || '',
      pontuacao: 0,
      detalhes: 'Iniciou simulado arrais',
      status: 'novo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await upsertLead(newLead);
    res.json({ success: true, id });
  } catch (err: any) {
    console.error("Erro ao criar lead:", err);
    res.status(500).json({ error: "Falha ao registrar lead" });
  }
});

// Finish a lead (Update score after quiz ends)
router.put("/finish/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { pontuacao, acertosTotais } = req.body;

    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: "DB Offline" });

    await currentPool.query(
      "UPDATE Leads SET pontuacao = ?, detalhes = ?, updatedAt = ? WHERE id = ?",
      [pontuacao || 0, `Finalizou simulado com ${pontuacao}/${acertosTotais} acertos`, new Date().toISOString(), id]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao atualizar lead:", err);
    res.status(500).json({ error: "Falha ao atualizar lead" });
  }
});

// --- ADMIN ROUTES ---
// Get all leads
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const leads = await getAllLeads();
    res.json(leads);
  } catch (err: any) {
    console.error("Erro ao buscar leads:", err);
    res.status(500).json({ error: "Falha ao buscar leads" });
  }
});

// Update lead status (e.g., 'contatado', 'convertido')
router.put("/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // { status, detalhes, etc }

    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: "DB Offline" });

    if (updates.status) {
      await currentPool.query("UPDATE Leads SET status = ?, updatedAt = ? WHERE id = ?", [updates.status, new Date().toISOString(), id]);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao atualizar status do lead:", err);
    res.status(500).json({ error: "Falha ao atualizar status" });
  }
});

export default router;
