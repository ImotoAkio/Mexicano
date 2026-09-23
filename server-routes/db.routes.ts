import { Router } from "express";
import { requireAdminAuth, requireAnyAuth } from "./middlewares";
import {
  getDbStatus,
  pullDatabase,
  deleteClient, upsertClient,
  deleteBoat, upsertBoat,
  deleteReservation, upsertReservation,
  bulkSyncDatabase,
  getControlesSom, upsertControleSom,
  upsertRegistroAtividade
} from "../server-db";
import { io } from "../server";

const router = Router();

// ==========================================
// DB Connection and Status Endpoints
// ==========================================

router.get("/status", async (req, res) => {
  try {
    const status = await getDbStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Unknown db status error." });
  }
});

router.get("/controles_som", requireAdminAuth, async (req, res) => {
  try {
    const data = await getControlesSom();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch controles som." });
  }
});

router.get("/pull", requireAdminAuth, async (req, res) => {
  try {
    const data = await pullDatabase();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to pull remote database." });
  }
});

router.post("/save", requireAdminAuth, async (req, res) => {
  const { type, action, data } = req.body;
  
  if (!type || !action || !data) {
    return res.status(400).json({ error: "Missing required parameters: type, action, or data." });
  }

  try {
    if (type === "clients") {
      if (action === "delete") {
        await deleteClient(data.id || data);
      } else {
        await upsertClient(data);
      }
    } else if (type === "boats") {
      if (action === "delete") {
        await deleteBoat(data.id || data);
      } else {
        await upsertBoat(data);
      }
    } else if (type === "reservations") {
      if (action === "delete") {
        await deleteReservation(data.id || data);
        io.emit("marina_update", { action: 'delete', reservation: data });
      } else {
        await upsertReservation(data);
        io.emit("marina_update", { action: 'upsert', reservation: data });
      }
    } else if (type === "controles_som") {
      if (action === "upsert") {
        await upsertControleSom(data);
      }
    } else {
      return res.status(400).json({ error: `Unsupported table type: ${type}` });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error(`Error saving db item type=${type} action=${action}:`, err);
    res.status(500).json({ error: true, message: err.message || "Failed to save record to remote database." });
  }
});

router.post("/bulk-save", requireAdminAuth, async (req, res) => {
  try {
    const { clients, boats, reservations } = req.body;
    await bulkSyncDatabase({ 
      clients: clients || [], 
      boats: boats || [], 
      reservations: reservations || [] 
    });
    res.json({ success: true, message: "Bulk database synchronization completed successfully." });
  } catch (err: any) {
    console.error("Failed bulk sync database route:", err);
    res.status(500).json({ error: true, message: err.message || "Bulk sync failure." });
  }
});

// ==========================================
// Logs (Auditing) Endpoints
// ==========================================
// /logs/action -> needs to also have /api/logs handled from main server
const logsRouter = Router();

logsRouter.post("/action", requireAnyAuth, async (req, res) => {
  const { operadorNome, acao, detalhes, embarcacaoId } = req.body;
  
  if (!acao) {
    return res.status(400).json({ error: "Missing required parameter: acao" });
  }

  try {
    await upsertRegistroAtividade({
      operadorNome,
      acao,
      detalhes,
      embarcacaoId,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error saving action log:", err);
    res.status(500).json({ error: true, message: err.message || "Failed to save action log." });
  }
});

export { router as dbRoutes, logsRouter };
