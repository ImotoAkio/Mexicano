import { Router } from "express";
import { requireAdminAuth, sensitiveLimiter } from "./middlewares";
import {
  getAllTiposManutencao,
  deleteTipoManutencao,
  upsertTipoManutencao
} from "../server-db";

const router = Router();

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const tipos = await getAllTiposManutencao();
    res.json(tipos);
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to fetch tipos de manutencao" });
  }
});

router.post("/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteTipoManutencao(data.id);
    } else if (action === 'upsert') {
      await upsertTipoManutencao(data);
    }
    // const io = (req.app as any).locals.io;
    // if (io) {
    //   io.emit('db_update', { entity: 'tiposManutencao', action, data });
    // }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save tipo de manutencao" });
  }
});

export default router;
