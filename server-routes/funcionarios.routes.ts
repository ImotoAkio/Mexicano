import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAdminAuth, sensitiveLimiter } from "./middlewares";
import {
  deleteAdmin, updateAdmin, createAdmin, getAllAdmins,
  deleteFolga, upsertFolga,
  deleteMecanico, upsertMecanico,
  deleteFuncionario, upsertFuncionario, getFuncionarios,
  upsertEPI, deleteEPI, saveHistoricoEPI,
  upsertCatalogoEPI, deleteCatalogoEPI
} from "../server-db";

const router = Router();

// ==========================================
// Admin Users (RH - Access Control)
// ==========================================
router.get("/admin/users", requireAdminAuth, async (req, res) => {
  try {
    const admins = await getAllAdmins();
    res.json(admins);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch admins" });
  }
});

router.post("/admin/users/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteAdmin(data.id);
    } else if (action === 'upsert') {
      if (!data.funcionarioId) {
        return res.status(400).json({ error: true, message: "É obrigatório associar um colaborador do DP ao usuário." });
      }
      if (data.id) {
        let hash;
        if (data.password) {
          hash = await bcrypt.hash(data.password, 12);
        }
        await updateAdmin(data.id, data.username, hash, data.role, data.funcionarioId);
      } else {
        const hash = await bcrypt.hash(data.password, 12);
        await createAdmin(data.username, hash, data.role || 'admin', data.funcionarioId);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save admin user" });
  }
});

// ==========================================
// Funcionarios
// ==========================================
router.get("/funcionarios", requireAdminAuth, async (req, res) => {
  try {
    const list = await getFuncionarios();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch funcionarios" });
  }
});

router.post("/funcionarios/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteFuncionario(data.id);
    } else if (action === 'upsert') {
      await upsertFuncionario(data);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Funcionario Save Error]", err);
    res.status(500).json({ error: true, message: err.message || "Failed to save funcionario" });
  }
});

// ==========================================
// Folgas
// ==========================================
router.post("/folgas/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteFolga(data.id);
    } else if (action === 'upsert') {
      await upsertFolga(data);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save folga" });
  }
});

// ==========================================
// Mecanicos
// ==========================================
router.post("/mecanicos/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteMecanico(data.id);
    } else if (action === 'upsert') {
      await upsertMecanico(data);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save mecanico" });
  }
});

// ==========================================
// EPIs (Equipamento de Proteção Individual)
// ==========================================
router.post("/funcionarios/:id/epis", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const { id, ...epiData } = req.body;
    const finalId = id || `epi_${Date.now()}`;
    await upsertEPI(req.params.id, { ...epiData, id: finalId });
    res.json({ success: true, id: finalId });
  } catch (err: any) {
    console.error("[EPI Save Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

router.delete("/epis/:id", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    await deleteEPI(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[EPI Delete Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

router.post("/funcionarios/:id/historico-epi", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const logData = req.body;
    await saveHistoricoEPI({ 
      ...logData, 
      funcionarioId: req.params.id,
      id: logData.id || `hist_epi_${Date.now()}`
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Historico EPI Save Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

// ==========================================
// Catalogo EPIs
// ==========================================
router.post("/catalogo-epis", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const { id, ...epiData } = req.body;
    const finalId = id || `epi_cat_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    await upsertCatalogoEPI({ ...epiData, id: finalId });
    res.json({ success: true, id: finalId });
  } catch (err: any) {
    console.error("[Catalogo EPI Save Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

router.delete("/catalogo-epis/:id", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    await deleteCatalogoEPI(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Catalogo EPI Delete Error]", err);
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
