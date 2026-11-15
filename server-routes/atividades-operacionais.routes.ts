import { Router } from "express";
import { requireAdminAuth, requireMarinaManagerOrAdminAuth } from "./middlewares";
import {
  getAtividadesOperacionaisByDate,
  getAllAtividadesProgramadas,
  getAtividadeOperacionalById,
  upsertAtividadeOperacional,
  deleteAtividadeOperacional,
  upsertAtividadeProgramada,
  deleteAtividadeProgramada,
  materializeProgramacoesForDate,
} from "../server-db";

const router = Router();

function getTodayBrazilStr(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
}

function broadcastAtividadesUpdate(req: any, payload: any) {
  if (req.app?.locals?.io) {
    req.app.locals.io.emit("atividades_operacionais_update", payload);
  }
}

// Listar atividades do dia + programações recorrentes
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const dataStr = typeof req.query.data === "string" && req.query.data.trim()
      ? req.query.data.trim()
      : getTodayBrazilStr();
    const classeDestino = typeof req.query.classe === "string" && req.query.classe.trim()
      ? req.query.classe.trim()
      : undefined;

    const [atividades, programacoes] = await Promise.all([
      getAtividadesOperacionaisByDate(dataStr, classeDestino),
      getAllAtividadesProgramadas(),
    ]);

    res.json({
      success: true,
      data: dataStr,
      atividades,
      programacoes: classeDestino
        ? programacoes.filter((p: any) => p.classeDestino === classeDestino)
        : programacoes,
    });
  } catch (err: any) {
    console.error("[GET /atividades-operacionais ERROR]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao carregar atividades operacionais." });
  }
});

// Criar ou editar atividade avulsa ou programação recorrente (Admin ou Gerente Marina)
router.post("/save", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const autorNome = user?.nome || user?.username || "Gestor";
    const { modo, data } = req.body;

    if (!data || !data.titulo || !String(data.titulo).trim()) {
      return res.status(400).json({ error: true, message: "O título da atividade é obrigatório." });
    }

    if (modo === "programacao") {
      const savedProg = await upsertAtividadeProgramada({
        ...data,
        criadoPor: data.criadoPor || autorNome,
      });
      const targetDate = data.dataReferencia || data.dataInicio || getTodayBrazilStr();
      await materializeProgramacoesForDate(targetDate);
      broadcastAtividadesUpdate(req, { action: "programacao_upsert", programacao: savedProg });
      return res.json({ success: true, programacao: savedProg });
    } else {
      const savedAtv = await upsertAtividadeOperacional({
        ...data,
        frequenciaOrigem: data.frequenciaOrigem || "avulsa",
        dataProgramada: data.dataProgramada || getTodayBrazilStr(),
        status: data.status || "pendente",
        criadoPor: data.criadoPor || autorNome,
      });
      broadcastAtividadesUpdate(req, { action: "atividade_upsert", atividade: savedAtv });
      return res.json({ success: true, atividade: savedAtv });
    }
  } catch (err: any) {
    console.error("[POST /atividades-operacionais/save ERROR]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar atividade." });
  }
});

// Excluir atividade ou programação recorrente (Admin ou Gerente Marina)
router.post("/delete", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const { id, modo } = req.body;
    if (!id) {
      return res.status(400).json({ error: true, message: "ID não informado." });
    }

    if (modo === "programacao") {
      await deleteAtividadeProgramada(id);
      broadcastAtividadesUpdate(req, { action: "programacao_delete", id });
    } else {
      await deleteAtividadeOperacional(id);
      broadcastAtividadesUpdate(req, { action: "atividade_delete", id });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("[POST /atividades-operacionais/delete ERROR]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao excluir registro." });
  }
});

// Iniciar atividade (Registra timestamp inicial e trava para um único executor)
router.post("/:id/iniciar", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const executorNome = (req.body?.executorNome || user?.nome || user?.username || "Colaborador").trim();
    const executorId = req.body?.executorId || user?.id || user?.username || "";
    const userRole = (user?.role || "").toLowerCase().trim();
    const isManager = userRole === "admin" || userRole === "marina_gerente";

    const existing = await getAtividadeOperacionalById(id);
    if (!existing) {
      return res.status(404).json({ error: true, message: "Atividade não encontrada." });
    }

    if (existing.status === "concluida") {
      return res.status(409).json({
        error: true,
        message: `Esta atividade já foi concluída por ${existing.executadoPorNome || "outro colaborador"}.`,
      });
    }

    if (
      existing.status === "em_andamento" &&
      existing.executadoPorNome &&
      existing.executadoPorNome.toLowerCase() !== executorNome.toLowerCase()
    ) {
      return res.status(409).json({
        error: true,
        message: `Esta atividade já está sendo realizada por ${existing.executadoPorNome}. Apenas uma pessoa pode executá-la.`,
      });
    }

    if (
      !isManager &&
      existing.funcionarioDestinoNome &&
      existing.funcionarioDestinoNome.toLowerCase() !== executorNome.toLowerCase()
    ) {
      return res.status(403).json({
        error: true,
        message: `Esta atividade foi direcionada especificamente para ${existing.funcionarioDestinoNome}.`,
      });
    }

    const iniciadoEm = existing.iniciadoEm || new Date().toISOString();
    const updated = await upsertAtividadeOperacional({
      ...existing,
      status: "em_andamento",
      iniciadoEm,
      executadoPorId: executorId,
      executadoPorNome: executorNome,
    });

    broadcastAtividadesUpdate(req, { action: "atividade_iniciada", atividade: updated });
    res.json({ success: true, atividade: updated });
  } catch (err: any) {
    console.error("[POST /atividades-operacionais/:id/iniciar ERROR]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao iniciar atividade." });
  }
});

// Concluir atividade (Registra timestamp final, duração e foto de conferência)
router.post("/:id/concluir", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const executorNome = (req.body?.executorNome || user?.nome || user?.username || "Colaborador").trim();
    const executorId = req.body?.executorId || user?.id || user?.username || "";
    const userRole = (user?.role || "").toLowerCase().trim();
    const isManager = userRole === "admin" || userRole === "marina_gerente";

    const { fotoConferenciaUrl, observacaoExecucao } = req.body || {};

    const existing = await getAtividadeOperacionalById(id);
    if (!existing) {
      return res.status(404).json({ error: true, message: "Atividade não encontrada." });
    }

    if (existing.status === "concluida") {
      return res.status(409).json({
        error: true,
        message: `Esta atividade já foi concluída por ${existing.executadoPorNome || "outro colaborador"}.`,
      });
    }

    if (
      !isManager &&
      existing.executadoPorNome &&
      existing.executadoPorNome.toLowerCase() !== executorNome.toLowerCase()
    ) {
      return res.status(403).json({
        error: true,
        message: `Somente ${existing.executadoPorNome} (quem iniciou a atividade) ou a gerência pode concluí-la.`,
      });
    }

    const finalFotoUrl = fotoConferenciaUrl || existing.fotoConferenciaUrl || null;
    if (existing.fotoObrigatoria && !finalFotoUrl) {
      return res.status(400).json({
        error: true,
        message: "O envio de uma foto de conferência é obrigatório para finalizar esta atividade.",
      });
    }

    const concluidoEm = new Date().toISOString();
    const iniciadoEm = existing.iniciadoEm || concluidoEm;
    const diffSec = Math.max(
      1,
      Math.round((new Date(concluidoEm).getTime() - new Date(iniciadoEm).getTime()) / 1000)
    );

    const updated = await upsertAtividadeOperacional({
      ...existing,
      status: "concluida",
      iniciadoEm,
      concluidoEm,
      duracaoSegundos: diffSec,
      executadoPorId: existing.executadoPorId || executorId,
      executadoPorNome: existing.executadoPorNome || executorNome,
      fotoConferenciaUrl: finalFotoUrl,
      observacaoExecucao: observacaoExecucao !== undefined ? observacaoExecucao : existing.observacaoExecucao,
    });

    broadcastAtividadesUpdate(req, { action: "atividade_concluida", atividade: updated });
    res.json({ success: true, atividade: updated });
  } catch (err: any) {
    console.error("[POST /atividades-operacionais/:id/concluir ERROR]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao concluir atividade." });
  }
});

// Reabrir atividade ou cancelar início
router.post("/:id/reabrir", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const executorNome = (req.body?.executorNome || user?.nome || user?.username || "").trim();
    const userRole = (user?.role || "").toLowerCase().trim();
    const isManager = userRole === "admin" || userRole === "marina_gerente";

    const existing = await getAtividadeOperacionalById(id);
    if (!existing) {
      return res.status(404).json({ error: true, message: "Atividade não encontrada." });
    }

    if (
      !isManager &&
      existing.executadoPorNome &&
      existing.executadoPorNome.toLowerCase() !== executorNome.toLowerCase()
    ) {
      return res.status(403).json({
        error: true,
        message: "Apenas quem iniciou a atividade ou o gerente pode reabri-la.",
      });
    }

    const updated = await upsertAtividadeOperacional({
      ...existing,
      status: "pendente",
      iniciadoEm: null,
      concluidoEm: null,
      duracaoSegundos: null,
      executadoPorId: null,
      executadoPorNome: null,
      fotoConferenciaUrl: null,
      observacaoExecucao: null,
    });

    broadcastAtividadesUpdate(req, { action: "atividade_reaberta", atividade: updated });
    res.json({ success: true, atividade: updated });
  } catch (err: any) {
    console.error("[POST /atividades-operacionais/:id/reabrir ERROR]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao reabrir atividade." });
  }
});

export default router;
