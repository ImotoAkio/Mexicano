import express from "express";
import {
  getAllLeads,
  upsertLead,
  deleteLead,
  getDbPool,
  getAllLeadsComercial,
  upsertLeadComercial,
  updateLeadEtapa,
  addLeadTimelineEvent,
  invalidateDbCache,
  getFrotaConsolidadaComCotas
} from "../server-db";
import { requireAdminAuth } from "./middlewares";
import crypto from "crypto";

const router = express.Router();

// Número WhatsApp comercial padrão El Mexicano
const DEFAULT_COMERCIAL_WHATSAPP = '558791229333';

// Normaliza números de telefone/WhatsApp mantendo apenas dígitos numéricos
function sanitizePhone(phone: any): string {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

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
      etapaFunil: 'novo',
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

// Captura Pública de Lead (Catálogo Digital / QR Code / UTM de Vendedor / Instagram)
router.post("/captura", async (req, res) => {
  try {
    const {
      nome,
      telefone,
      email,
      cidade,
      perfilNautico,
      embarcacaoId,
      embarcacaoInteresseId,
      vendedorId,
      vendedorNome,
      vendedor,
      origem,
      possuiPermuta,
      descricaoPermuta,
      resumoPermuta,
      utms,
      utmSource,
      utmMedium,
      utmCampaign,
      filaEsperaEmbarcacaoId,
      indicadoPorClienteId,
      indicadoPorClienteNome
    } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ error: "Nome e telefone/WhatsApp são obrigatórios" });
    }

    const cleanIncomingPhone = sanitizePhone(telefone);
    if (!cleanIncomingPhone || cleanIncomingPhone.length < 8) {
      return res.status(400).json({ error: "Número de telefone/WhatsApp inválido" });
    }

    const selectedBoatId = embarcacaoId || embarcacaoInteresseId || null;
    const finalVendedorNome = vendedorNome || vendedor || null;
    const finalOrigem = origem || (utms?.utmSource) || utmSource || 'catalogo';
    const finalPermutaResumo = descricaoPermuta || resumoPermuta || null;
    const hasPermuta = Boolean(possuiPermuta || finalPermutaResumo);

    // Buscar nome da embarcação para contextualizar timeline e mensagem WhatsApp
    let boatName = '';
    if (selectedBoatId) {
      try {
        const pool = getDbPool();
        if (pool) {
          const [boats]: any = await pool.query("SELECT nome, modelo FROM Embarcacoes WHERE id = ? LIMIT 1", [selectedBoatId]);
          if (boats && boats.length > 0) {
            boatName = boats[0].nome || boats[0].modelo || '';
          }
        }
      } catch (e) {
        console.warn("Falha ao buscar nome da embarcação:", e);
      }
    }

    const nowIso = new Date().toISOString();
    const allLeads = await getAllLeadsComercial();

    // ── Prevenção Inteligente de Duplicidade ─────────────────────────
    // Verifica se já existe um lead ativo com o mesmo telefone (últimos 8-11 dígitos)
    const existingLead = allLeads.find((l: any) => {
      const p = sanitizePhone(l.telefone);
      if (!p) return false;
      return (
        p === cleanIncomingPhone ||
        (cleanIncomingPhone.length >= 8 && p.endsWith(cleanIncomingPhone.slice(-8))) ||
        (p.length >= 8 && cleanIncomingPhone.endsWith(p.slice(-8)))
      );
    });

    let savedLead: any = null;
    let isDuplicate = false;

    if (existingLead) {
      // LEAD JÁ EXISTE: enriquecer timeline e atualizar interesse
      isDuplicate = true;
      const boatLabel = boatName ? `"${boatName}"` : (selectedBoatId ? `(ID ${selectedBoatId})` : 'do Catálogo');

      const existingTimeline = Array.isArray(existingLead.timeline) ? existingLead.timeline : [];
      const newEvent = {
        id: `tl_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        data: nowIso,
        tipo: 'interesse',
        titulo: 'Novo Interesse no Catálogo Digital',
        descricao: `Lead demonstrou novo interesse na embarcação ${boatLabel} via Catálogo Digital [Origem: ${finalOrigem}]${hasPermuta ? ` (Permuta informada: ${finalPermutaResumo || 'Sim'})` : ''}`,
        autorNome: 'Vitrine Digital'
      };

      // Atualizar lista de embarcações de interesse sem duplicar IDs
      let ebs = Array.isArray(existingLead.embarcacoesInteresse) ? [...existingLead.embarcacoesInteresse] : [];
      if (selectedBoatId && !ebs.includes(selectedBoatId)) {
        ebs.push(selectedBoatId);
      }

      savedLead = await upsertLeadComercial({
        ...existingLead,
        nome: nome.trim() || existingLead.nome,
        email: email || existingLead.email,
        cidade: cidade || existingLead.cidade,
        temperatura: 'quente', // Reativação como lead quente
        embarcacoesInteresse: ebs,
        vendedorId: existingLead.vendedorId || vendedorId || null,
        vendedorNome: existingLead.vendedorNome || finalVendedorNome || null,
        possuiPermuta: hasPermuta ? 1 : (existingLead.possuiPermuta ? 1 : 0),
        resumoPermuta: finalPermutaResumo || existingLead.resumoPermuta || null,
        utmSource: utmSource || (utms?.utmSource) || existingLead.utmSource || 'catalogo',
        utmMedium: utmMedium || (utms?.utmMedium) || existingLead.utmMedium || null,
        utmCampaign: utmCampaign || (utms?.utmCampaign) || existingLead.utmCampaign || null,
        timeline: [newEvent, ...existingTimeline]
      });

      invalidateDbCache();

      const io = (req.app as any).locals?.io;
      if (io) {
        io.emit('lead_updated', savedLead);
        io.emit('lead_created', savedLead);
      }
    } else {
      // NOVO LEAD: cadastrar na etapa 'novo'
      const boatLabel = boatName ? `"${boatName}"` : (selectedBoatId ? `(ID ${selectedBoatId})` : '');
      const initialTimeline = [
        {
          id: `tl_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          data: nowIso,
          tipo: 'mudanca_etapa',
          titulo: 'Lead Captado Online (Catálogo Digital)',
          descricao: `Origem: ${finalOrigem}${boatLabel ? ` • Interesse em: ${boatLabel}` : ''}${hasPermuta ? ` • Possui permuta (${finalPermutaResumo || 'Sim'})` : ''}${finalVendedorNome ? ` (Referral: ${finalVendedorNome})` : ''}`,
          autorNome: 'Vitrine Digital'
        }
      ];

      savedLead = await upsertLeadComercial({
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email ? String(email).trim() : null,
        cidade: cidade ? String(cidade).trim() : null,
        etapaFunil: 'novo',
        temperatura: 'quente',
        perfilNautico,
        embarcacoesInteresse: selectedBoatId ? [selectedBoatId] : [],
        vendedorId: vendedorId || null,
        vendedorNome: finalVendedorNome,
        origem: finalOrigem,
        possuiPermuta: hasPermuta ? 1 : 0,
        resumoPermuta: finalPermutaResumo,
        filaEsperaEmbarcacaoId,
        indicadoPorClienteId,
        indicadoPorClienteNome,
        utmSource: utmSource || (utms?.utmSource) || 'catalogo',
        utmMedium: utmMedium || (utms?.utmMedium) || null,
        utmCampaign: utmCampaign || (utms?.utmCampaign) || null,
        timeline: initialTimeline
      });

      invalidateDbCache();

      const io = (req.app as any).locals?.io;
      if (io) {
        io.emit('lead_created', savedLead);
      }
    }

    // ── Geração do Link de Conversão Imediata para o WhatsApp ────────
    // Redireciona para o WhatsApp comercial do consultor ou da El Mexicano
    let targetPhone = DEFAULT_COMERCIAL_WHATSAPP;
    if (vendedorId) {
      try {
        const pool = getDbPool();
        if (pool) {
          const [funcRows]: any = await pool.query(
            "SELECT telefone FROM Funcionarios WHERE id = ? OR usuarioId = ? LIMIT 1",
            [vendedorId, vendedorId]
          );
          if (funcRows && funcRows[0]?.telefone) {
            const p = sanitizePhone(funcRows[0].telefone);
            if (p.length >= 10) {
              targetPhone = p.startsWith('55') ? p : `55${p}`;
            }
          }
        }
      } catch (e) {}
    }

    const permutaMention = hasPermuta
      ? `\n\n📌 *Nota:* Possuo um bem para avaliação de permuta/troca${finalPermutaResumo ? ` (${finalPermutaResumo})` : ''}.`
      : '';

    const whatsappMessage = `🌊 *Olá! Estive navegando no Catálogo Digital da El Mexicano.* 🚤\n\n` +
      `Gostei muito da embarcação *${boatName || 'disponível no catálogo'}* e quero conhecer as condições da cota e agendar uma visita na Marina!\n\n` +
      `👤 *Meu Nome:* ${nome.trim()}\n` +
      `📱 *WhatsApp:* ${telefone.trim()}` +
      permutaMention +
      `\n\n_Aguardo o retorno do consultor para tirar dúvidas._`;

    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    res.json({
      success: true,
      lead: savedLead,
      isDuplicate,
      whatsappUrl,
      targetPhone,
      message: isDuplicate ? "Interesse adicional registrado com sucesso!" : "Lead registrado com sucesso!"
    });
  } catch (err: any) {
    console.error("Erro na captura de lead:", err);
    res.status(500).json({ error: "Falha ao registrar lead de interesse" });
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

// --- ADMIN / COMERCIAL ROUTES ---
// Get all commercial leads
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const leads = await getAllLeadsComercial();
    res.json(leads);
  } catch (err: any) {
    console.error("Erro ao buscar leads:", err);
    res.status(500).json({ error: "Falha ao buscar leads" });
  }
});

// Create or update commercial lead
router.post("/", requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const isNew = !req.body.id;
    const leadData = {
      ...req.body,
      vendedorNome: req.body.vendedorNome || user?.nome || user?.email || 'Comercial'
    };
    const lead = await upsertLeadComercial(leadData);

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit(isNew ? 'lead_created' : 'lead_updated', lead);
    }

    res.json({ success: true, lead });
  } catch (err: any) {
    console.error("Erro ao salvar lead comercial:", err);
    res.status(500).json({ error: err.message || "Falha ao salvar lead" });
  }
});

// Update lead stage in Kanban / Funnel
router.put("/:id/etapa", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { etapaFunil, motivoPerda, dataVisitaAgendada, proximoContatoEm } = req.body;
    const user = (req as any).user;

    const lead = await updateLeadEtapa(
      id,
      etapaFunil,
      motivoPerda,
      user?.nome || 'Comercial',
      dataVisitaAgendada,
      proximoContatoEm
    );

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('lead_updated', lead);
    }

    res.json({ success: true, lead });
  } catch (err: any) {
    console.error("Erro ao atualizar etapa do lead:", err);
    res.status(500).json({ error: err.message || "Falha ao atualizar etapa" });
  }
});

// Add timeline interaction
router.post("/:id/timeline", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const event = {
      ...req.body,
      autorNome: req.body.autorNome || user?.nome || 'Comercial'
    };

    const entry = await addLeadTimelineEvent(id, event);
    const all = await getAllLeadsComercial();
    const lead = all.find(l => l.id === id);

    const io = (req.app as any).locals?.io;
    if (io && lead) {
      io.emit('lead_updated', lead);
    }

    res.json({ success: true, entry, lead });
  } catch (err: any) {
    console.error("Erro ao adicionar interação na timeline:", err);
    res.status(500).json({ error: err.message || "Falha ao registrar interação" });
  }
});

// Update lead general status or fields
router.put("/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const user = (req as any).user;

    const lead = await upsertLeadComercial({
      ...updates,
      id,
      vendedorNome: updates.vendedorNome || user?.nome || 'Comercial'
    });

    const io = (req.app as any).locals?.io;
    if (io && lead) {
      io.emit('lead_updated', lead);
    }

    res.json({ success: true, lead });
  } catch (err: any) {
    console.error("Erro ao atualizar lead:", err);
    res.status(500).json({ error: err.message || "Falha ao atualizar lead" });
  }
});

// Delete lead
router.delete("/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteLead(id);
    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('lead_deleted', { id });
    }
    res.json({ success: true, message: "Lead removido com sucesso" });
  } catch (err: any) {
    console.error("Erro ao deletar lead:", err);
    res.status(500).json({ error: err.message || "Falha ao remover lead" });
  }
});

export default router;
