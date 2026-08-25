import { Router } from "express";
import { requireAdminAuth, requireClientAuth, requireAnyAuth, apiLimiter, sensitiveLimiter, whatsappLimiter, writeAuditLog } from "./middlewares";
import {
  getNextChamadoCode
} from "../server-db";

const router = Router();

router.get("/next-code", requireAdminAuth, async (req, res) => {
  try {
    const code = await getNextChamadoCode();
    res.json({ code });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to generate chamado code" });
  }
});




export default router;
