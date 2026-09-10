import { Router } from "express";
import { requireAnyAuth, requireClientAuth, apiLimiter, sensitiveLimiter, whatsappLimiter, writeAuditLog } from "./middlewares";
import {
  getNextChamadoCode
} from "../server-db";

const router = Router();

router.get("/next-code", requireAnyAuth, async (req, res) => {
  try {
    const code = await getNextChamadoCode();
    res.json({ code });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to generate chamado code" });
  }
});





router.post("/save", requireAnyAuth, async (req, res) => {
  try {
    const { action, data } = req.body;
    if (action === "upsert") {
      const { upsertChamado } = require("../server-db");
      await upsertChamado(data);
      // broadcast change
      if (req.app.locals.io) {
        req.app.locals.io.emit("chamado_update", { action: "upsert", chamado: data });
      }
      res.json({ success: true });
    } else if (action === "delete") {
      const { deleteChamado } = require("../server-db");
      await deleteChamado(data.id);
      if (req.app.locals.io) {
        req.app.locals.io.emit("chamado_update", { action: "delete", chamado: { id: data.id } });
      }
      res.json({ success: true });
    }
  } catch(err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
