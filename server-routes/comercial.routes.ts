import { Router } from "express";
import fs from "fs";
import path from "path";
import { requireAdminAuth, upload } from "./middlewares";
import {
  getDbPool,
  getUserPreferences,
  upsertUserPreferences,
  getAllVendas,
  createVendaCompleta,
  cancelarVenda,
  getMotorComissoesConfig,
  saveMotorComissoesConfig,
  getComissoesFechamentos,
  upsertComissaoFechamento,
  updateVendaProcessoComissao
} from "../server-db";
import { uploadToR2 } from "../server-r2";

const router = Router();
const uploadsDir = path.join(process.cwd(), 'uploads');

// ==========================================
// Chat Messages
// ==========================================
router.get("/chat/messages", requireAdminAuth, async (req, res) => {
  try {
    const currentPool = getDbPool();
    if (!currentPool) return res.status(500).json({ error: true, message: "DB indisponível" });
    const [messages] = await currentPool.query("SELECT * FROM ChatMessages ORDER BY createdAt ASC LIMIT 500");
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ==========================================
// User Preferences
// ==========================================
router.get("/preferences", requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) return res.status(401).json({ error: true, message: "Unauthorized" });
    const prefs = await getUserPreferences(user.id);
    res.json(prefs || {});
  } catch(err: any) {
    res.status(500).json({ error: true, message: err.message || "Error fetching preferences" });
  }
});

router.post("/preferences", requireAdminAuth, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'background', maxCount: 1 }]), async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) return res.status(401).json({ error: true, message: "Unauthorized" });

    const { greetingText } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    let logoUrl = req.body.logoUrl || null;
    let backgroundUrl = req.body.backgroundUrl || null;

    if (files && files['logo'] && files['logo'][0]) {
      const file = files['logo'][0];
      const filename = `logo_${Date.now()}_${Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      try {
        logoUrl = await uploadToR2(file.buffer, `comercial/${filename}`, file.mimetype);
      } catch (e) {
        console.error("R2 fail:", e);
        fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
        logoUrl = `/uploads/${filename}`;
      }
    }

    if (files && files['background'] && files['background'][0]) {
      const file = files['background'][0];
      const filename = `bg_${Date.now()}_${Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      try {
        backgroundUrl = await uploadToR2(file.buffer, `comercial/${filename}`, file.mimetype);
      } catch (e) {
        console.error("R2 fail:", e);
        fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
        backgroundUrl = `/uploads/${filename}`;
      }
    }

    const prefs = await getUserPreferences(user.id);
    await upsertUserPreferences(user.id, {
      logoUrl: logoUrl !== undefined ? logoUrl : (prefs?.logoUrl || null),
      backgroundUrl: backgroundUrl !== undefined ? backgroundUrl : (prefs?.backgroundUrl || null),
      greetingText: greetingText !== undefined ? greetingText : (prefs?.greetingText || null)
    });

    res.json({ success: true, logoUrl, backgroundUrl, greetingText });
  } catch(err: any) {
    console.error(err);
    res.status(500).json({ error: true, message: err.message || "Error saving preferences" });
  }
});

// ==========================================
// Vendas Comerciais (Lançamento de Vendas)
// ==========================================
router.get(["/vendas", "/comercial/vendas"], requireAdminAuth, async (req, res) => {
  try {
    const vendas = await getAllVendas();
    res.json({ success: true, vendas });
  } catch (err: any) {
    console.error("[GET /api/comercial/vendas Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar vendas" });
  }
});

router.post(["/vendas", "/comercial/vendas"], requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const payload = {
      ...req.body,
      vendedorNome: req.body.vendedorNome || user?.nome || user?.email || 'Comercial',
      createdBy: req.body.createdBy || user?.id || null
    };
    const result = await createVendaCompleta(payload);

    const io = (req.app as any).locals.io;
    if (io) {
      io.emit('venda_created', result);
      io.emit('finance_update', { type: 'venda_created', vendaId: result.vendaId });
    }

    res.json(result);
  } catch (err: any) {
    console.error("[POST /api/comercial/vendas Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao registrar venda" });
  }
});

router.delete(["/vendas/:id", "/comercial/vendas/:id"], requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await cancelarVenda(id);

    const io = (req.app as any).locals.io;
    if (io) {
      io.emit('venda_cancelled', { id });
      io.emit('finance_update', { type: 'venda_cancelled', vendaId: id });
    }

    res.json({ success: true, message: 'Venda cancelada com sucesso', id });
  } catch (err: any) {
    console.error("[DELETE /api/comercial/vendas/:id Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao cancelar venda" });
  }
});

router.patch(["/vendas/:id/processos", "/comercial/vendas/:id/processos"], requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const vendaAtualizada = await updateVendaProcessoComissao(id, req.body || {});

    const io = (req.app as any).locals.io;
    if (io) {
      io.emit('venda_updated', { id, venda: vendaAtualizada });
    }

    res.json({ success: true, venda: vendaAtualizada });
  } catch (err: any) {
    console.error("[PATCH /api/comercial/vendas/:id/processos Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao atualizar processos da venda" });
  }
});

// ==========================================
// Motor de Comissões e Bonificações (Config & Fechamentos)
// ==========================================
router.get(["/comissoes/config", "/comercial/comissoes/config"], requireAdminAuth, async (req, res) => {
  try {
    const config = await getMotorComissoesConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    console.error("[GET /api/comercial/comissoes/config Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao carregar configuração de comissões" });
  }
});

router.put(["/comissoes/config", "/comercial/comissoes/config"], requireAdminAuth, async (req, res) => {
  try {
    const config = await saveMotorComissoesConfig(req.body || {});
    res.json({ success: true, config });
  } catch (err: any) {
    console.error("[PUT /api/comercial/comissoes/config Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar configuração de comissões" });
  }
});

router.post(["/comissoes/config", "/comercial/comissoes/config"], requireAdminAuth, async (req, res) => {
  try {
    const config = await saveMotorComissoesConfig(req.body || {});
    res.json({ success: true, config });
  } catch (err: any) {
    console.error("[POST /api/comercial/comissoes/config Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar configuração de comissões" });
  }
});

router.get(["/comissoes/fechamentos", "/comercial/comissoes/fechamentos"], requireAdminAuth, async (req, res) => {
  try {
    const competencia = typeof req.query.competencia === 'string' ? req.query.competencia : undefined;
    const fechamentos = await getComissoesFechamentos(competencia);
    res.json({ success: true, fechamentos });
  } catch (err: any) {
    console.error("[GET /api/comercial/comissoes/fechamentos Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar fechamentos quinzenais" });
  }
});

router.post(["/comissoes/fechamentos", "/comercial/comissoes/fechamentos"], requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const payload = {
      ...req.body,
      fechadoPor: req.body.fechadoPor || user?.nome || user?.username || 'Administrador'
    };
    const fechamento = await upsertComissaoFechamento(payload);
    res.json({ success: true, fechamento });
  } catch (err: any) {
    console.error("[POST /api/comercial/comissoes/fechamentos Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar fechamento quinzenal" });
  }
});

export default router;

