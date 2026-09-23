import { Router, Response } from "express";
import { requireMarinaManagerOrAdminAuth } from "./middlewares";
import {
  getFuelInventoryFromDb, saveFuelInventoryInDb,
  getFuelHistoryFromDb, saveFuelHistoryInDb,
  consumeFuelAtomicDb, restoreFuelAtomicDb,
  resetFuelDataInDb
} from "../server-db";
import { io } from "../server";

const router = Router();

// ==========================================
// Fuel Inventory & History Endpoints
// ==========================================

router.get("/inventory", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const inv = await getFuelInventoryFromDb();
    res.json(inv || {
      tanquePrincipalLitros: 0,
      tanqueCapacidadeMaxima: 1000,
      alertaMinimoTanque: 200,
      galoesPierQuantidade: 0,
      galoesCapacidadeLitros: 20,
      galaoParcialLitros: 0,
      ultimaAtualizacao: new Date().toLocaleDateString('pt-BR')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/inventory", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const inv = req.body;
    await saveFuelInventoryInDb(inv);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const history = await getFuelHistoryFromDb();
    res.json(history || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/history", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const history = req.body;
    await saveFuelHistoryInDb(history);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/consume", requireMarinaManagerOrAdminAuth, async (req: any, res: Response) => {
  try {
    const { litros, barcoNome, detalhes } = req.body;
    const operador = req.user?.username || req.user?.nome || 'Operador';
    
    if (!litros || litros <= 0) {
      return res.status(400).json({ error: true, message: 'Invalid litros' });
    }
    
    await consumeFuelAtomicDb(litros, barcoNome, operador, detalhes);
    
    // Broadcast the new inventory state automatically
    const novoEstoque = await getFuelInventoryFromDb();
    io.emit('fuel_inventory_updated', novoEstoque);
    
    res.json({ success: true, message: 'Combustível consumido com sucesso (atomic)' });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

router.post("/restore", requireMarinaManagerOrAdminAuth, async (req: any, res: Response) => {
  try {
    const { litros, motivo } = req.body;
    const operador = req.user?.username || req.user?.nome || 'Operador';
    
    if (!litros || litros <= 0) {
      return res.status(400).json({ error: true, message: 'Invalid litros' });
    }
    
    await restoreFuelAtomicDb(litros, motivo || 'Estorno via UI', operador);
    
    const novoEstoque = await getFuelInventoryFromDb();
    io.emit('fuel_inventory_updated', novoEstoque);
    
    res.json({ success: true, message: 'Combustível estornado com sucesso (atomic)' });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

router.post("/reset", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    await resetFuelDataInDb();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
