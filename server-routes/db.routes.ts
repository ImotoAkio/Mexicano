import { Router } from "express";
import { requireAdminAuth, requireAnyAuth } from "./middlewares";
import {
  getDbPool,
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
    const forceRefresh = req.query.forceRefresh === 'true';
    const data = await pullDatabase(forceRefresh);
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
      const user = (req as any).user;
      const userRole = (user?.role || "").toLowerCase().trim();

      if (userRole === "marina_gerente") {
        if (action === "delete") {
          const boatId = data.id || data;
          const currentPool = getDbPool();
          if (currentPool) {
            const [empRows] = await currentPool.query("SELECT empresa FROM EmbarcacaoEmpresas WHERE embarcacaoId = ?", [boatId]);
            const empList = (empRows as any[]).map(r => r.empresa);
            const isVale = empList.includes("VALE") || empList.length === 0;
            if (isVale) {
              return res.status(403).json({ error: true, message: "Acesso negado: O Gerente da Marina não tem permissão para excluir embarcações vinculadas à Vale Náutica." });
            }
          }
        } else {
          // Upsert
          const empresas = Array.isArray(data.empresas) ? data.empresas : [];
          if (empresas.includes("VALE")) {
            return res.status(403).json({ error: true, message: "Acesso negado: O Gerente da Marina não tem permissão para vincular embarcações à Vale Náutica." });
          }
          if (data.id) {
            const currentPool = getDbPool();
            if (currentPool) {
              const [empRows] = await currentPool.query("SELECT empresa FROM EmbarcacaoEmpresas WHERE embarcacaoId = ?", [data.id]);
              const empList = (empRows as any[]).map(r => r.empresa);
              if (empList.includes("VALE") || (empList.length === 0 && !data.id.startsWith("boat_"))) {
                return res.status(403).json({ error: true, message: "Acesso negado: O Gerente da Marina não tem permissão para editar embarcações vinculadas à Vale Náutica." });
              }
            }
          }
          if (!empresas.includes("MARINA")) {
            data.empresas = [...empresas, "MARINA"];
          }
        }
      }

      if (action === "delete") {
        await deleteBoat(data.id || data);
        io.emit("marina_update", { action: 'delete', boat: data });
      } else {
        await upsertBoat(data);
        io.emit("marina_update", { action: 'upsert', boat: data });
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
