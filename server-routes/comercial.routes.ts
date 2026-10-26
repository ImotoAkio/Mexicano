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
  updateVendaProcessoComissao,
  getAllPropostasComerciais,
  getPropostaByIdOrToken,
  upsertPropostaComercial,
  aceitarPropostaPublica,
  getActiveCotasReservadas,
  createCotaReserva,
  cancelCotaReserva,
  marcarCotaRepasse,
  transferirOuRecomprarCota,
  getCotasHistorico,
  getFrotaConsolidadaComCotas,
  getAllPermutas,
  upsertPermuta,
  avaliarPermutaDiretoria,
  getAllCheckinsVisita,
  createCheckinVisita,
  verificarDisponibilidadeVisita,
  getAllLeadsComercial,
  upsertLeadComercial,
  invalidateDbCache
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

// ==========================================
// Propostas Comerciais & Simulador
// ==========================================
router.get(["/propostas", "/comercial/propostas"], requireAdminAuth, async (req, res) => {
  try {
    const propostas = await getAllPropostasComerciais();
    res.json({ success: true, propostas });
  } catch (err: any) {
    console.error("[GET /api/comercial/propostas Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar propostas" });
  }
});

router.post(["/propostas", "/comercial/propostas"], requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const payload = {
      ...req.body,
      vendedorNome: req.body.vendedorNome || user?.nome || user?.email || 'Comercial',
      vendedorId: req.body.vendedorId || user?.id || null
    };
    const proposta = await upsertPropostaComercial(payload);

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('proposta_created', proposta);
    }

    res.json({ success: true, proposta });
  } catch (err: any) {
    console.error("[POST /api/comercial/propostas Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar proposta" });
  }
});

// Rota pública para visualização de proposta pelo cliente
router.get(["/propostas/public/:token", "/public/propostas/:token"], async (req, res) => {
  try {
    const { token } = req.params;
    const proposta = await getPropostaByIdOrToken(token);
    if (!proposta) {
      return res.status(404).json({ error: true, message: "Proposta não encontrada ou expirada" });
    }
    res.json({ success: true, proposta });
  } catch (err: any) {
    console.error("[GET public proposta Error]:", err);
    res.status(500).json({ error: true, message: "Erro ao carregar proposta" });
  }
});

// Rota pública para cliente clicar em "Aceitar Proposta"
router.post(["/propostas/public/:token/aceitar", "/public/propostas/:token/aceitar"], async (req, res) => {
  try {
    const { token } = req.params;
    const proposta = await aceitarPropostaPublica(token);

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('proposta_aceita', proposta);
    }

    res.json({ success: true, proposta, message: "Proposta aceita com sucesso!" });
  } catch (err: any) {
    console.error("[POST aceitar proposta Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao aceitar proposta" });
  }
});

// ==========================================
// Cotas Reservadas (Bloqueio 48h)
// ==========================================
router.get(["/cotas-reservadas", "/comercial/cotas-reservadas"], requireAdminAuth, async (req, res) => {
  try {
    const reservas = await getActiveCotasReservadas();
    res.json({ success: true, reservas });
  } catch (err: any) {
    console.error("[GET cotas-reservadas Error]:", err);
    res.status(500).json({ error: true, message: "Erro ao buscar cotas reservadas" });
  }
});

router.post(["/cotas-reservadas", "/comercial/cotas-reservadas"], requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const payload = {
      ...req.body,
      vendedorNome: req.body.vendedorNome || user?.nome || 'Comercial',
      vendedorId: req.body.vendedorId || user?.id || null
    };
    const reserva = await createCotaReserva(payload);

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('cota_reservada', reserva);
    }

    res.json({ success: true, reserva });
  } catch (err: any) {
    console.error("[POST cotas-reservadas Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao criar reserva de cota" });
  }
});

router.delete(["/cotas-reservadas/:id", "/comercial/cotas-reservadas/:id"], requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const operadorNome = user?.nome || user?.email || 'Comercial';
    await cancelCotaReserva(id, operadorNome);

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('cota_liberada', { id });
    }

    res.json({ success: true, message: 'Reserva cancelada com sucesso' });
  } catch (err: any) {
    console.error("[DELETE cotas-reservadas Error]:", err);
    res.status(500).json({ error: true, message: "Erro ao cancelar reserva" });
  }
});

// Marcação de Cota para Repasse Comercial
router.post(["/cotas-repasse", "/comercial/cotas-repasse", "/cotas/repasse"], requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const operadorNome = user?.nome || user?.email || 'Comercial';
    const result = await marcarCotaRepasse({
      ...req.body,
      operadorNome
    });

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('cota_repasse_updated', result);
      io.emit('marina_update', { action: 'cota_repasse', data: result });
    }

    res.json(result);
  } catch (err: any) {
    console.error("[POST cotas-repasse Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao atualizar repasse da cota" });
  }
});

// Transferência de Cota entre Clientes ou Recompra para Estoque El Mexicano
router.post(["/cotas/transferir", "/cotas-transferir", "/comercial/cotas/transferir"], requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const operadorNome = user?.nome || user?.email || 'Comercial';
    const result = await transferirOuRecomprarCota({
      ...req.body,
      operadorNome
    });

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('cota_transferida', result);
      io.emit('marina_update', { action: 'cota_transferida', data: result });
    }

    res.json(result);
  } catch (err: any) {
    console.error("[POST cotas/transferir Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao transferir cota" });
  }
});

router.post(["/cotas/recomprar", "/cotas-recomprar", "/comercial/cotas/recomprar"], requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const operadorNome = user?.nome || user?.email || 'Comercial';
    const result = await transferirOuRecomprarCota({
      ...req.body,
      clienteDestinoId: undefined, // Recompra para El Mexicano
      operadorNome
    });

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('cota_recomprada', result);
      io.emit('marina_update', { action: 'cota_recomprada', data: result });
    }

    res.json(result);
  } catch (err: any) {
    console.error("[POST cotas/recomprar Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao recomprar cota" });
  }
});

// Histórico de Movimentações de Cotas
router.get(["/cotas/historico", "/cotas-historico", "/comercial/cotas/historico"], requireAdminAuth, async (req, res) => {
  try {
    const embarcacaoId = req.query.embarcacaoId ? String(req.query.embarcacaoId) : undefined;
    const historico = await getCotasHistorico(embarcacaoId);
    res.json({ success: true, historico });
  } catch (err: any) {
    console.error("[GET cotas/historico Error]:", err);
    res.status(500).json({ error: true, message: "Erro ao buscar histórico de cotas" });
  }
});

// Frota Consolidada com Espelho de Cotas & Status Marina em Tempo Real
router.get(["/frota-cotas", "/comercial/frota-cotas", "/embarcacoes-ativos", "/comercial/embarcacoes-ativos"], requireAdminAuth, async (req, res) => {
  try {
    const data = await getFrotaConsolidadaComCotas();
    res.json({ success: true, ...data });
  } catch (err: any) {
    console.error("[GET frota-cotas Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao carregar frota comercial consolidada" });
  }
});

// ==========================================
// Catálogo Digital Comercial & Vitrine Pública
// ==========================================
router.get(["/catalogo/public", "/public/catalogo", "/catalogo-publico"], async (req, res) => {
  try {
    const frotaData = await getFrotaConsolidadaComCotas();
    const allBoats = Array.isArray(frotaData?.frota) ? frotaData.frota : [];

    // Regra do Catálogo: apenas embarcações ativas que possuam pelo menos 1 cota disponível
    // (estoque_mexicano sob titularidade da El Mexicano ou repasse ativo)
    const vitrineRaw = allBoats.filter((b: any) => {
      const disponiveisEstoque = Number(b.cotasDisponiveisEstoque) || 0;
      const emRepasse = Number(b.cotasEmRepasse) || 0;
      const totalDisponivel = disponiveisEstoque + emRepasse;
      const isAtivo = b.status !== 'inativo' && b.ativo !== false && b.ativo !== 0;
      return isAtivo && totalDisponivel > 0;
    });

    // Curadoria de imagens de luxo náutico caso a lancha não possua imagemUrl cadastrada
    const fallbackNauticalImages = [
      'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80'
    ];

    // Ocultar dados confidenciais internos (nomes de cotistas, dados financeiros restritos)
    const barcos = vitrineRaw.map((b: any, index: number) => {
      let fotos: string[] = [];
      if (b.imagemUrl) fotos.push(b.imagemUrl);
      if (b.fotos) {
        try {
          const parsed = typeof b.fotos === 'string' ? JSON.parse(b.fotos) : b.fotos;
          if (Array.isArray(parsed)) {
            parsed.forEach((f: any) => {
              if (f && typeof f === 'string' && !fotos.includes(f)) fotos.push(f);
            });
          }
        } catch (e) {}
      }
      if (fotos.length === 0) {
        fotos.push(fallbackNauticalImages[index % fallbackNauticalImages.length]);
      }

      let itensConforto: string[] = [];
      if (b.acessorios) {
        if (Array.isArray(b.acessorios)) {
          itensConforto = b.acessorios;
        } else if (typeof b.acessorios === 'string') {
          try {
            const parsed = JSON.parse(b.acessorios);
            if (Array.isArray(parsed)) itensConforto = parsed;
            else itensConforto = b.acessorios.split(',').map((s: string) => s.trim());
          } catch {
            itensConforto = b.acessorios.split(',').map((s: string) => s.trim());
          }
        }
      }
      if (itensConforto.length === 0) {
        itensConforto = [
          'Churrasqueira Gourmet',
          'Som Náutico Bluetooth',
          'Toldo Retrátil',
          'Ducha de Popa Pressurizada',
          'Solário de Proa',
          'Mesa de Centro Rebatível'
        ];
      }

      const totalCotas = Number(b.totalCotas) > 0 ? Number(b.totalCotas) : 4;
      const cotasDisponiveisCount = (Number(b.cotasDisponiveisEstoque) || 0) + (Number(b.cotasEmRepasse) || 0);

      return {
        id: b.id,
        nome: b.nome,
        modelo: b.modelo || 'Lancha Esportiva & Passeio',
        fabricante: b.fabricante || 'Estaleiro Premium',
        ano: b.ano || new Date().getFullYear(),
        motorizacao: b.potencia || b.tipo_propulsao || 'Motor Centro-Rabeta',
        potencia: b.potencia || '',
        marcaMotor: b.marcaMotor || '',
        tipoPropulsao: b.tipo_propulsao || (b.tipo === 'jet' ? 'Hidrojato' : 'Centro-Rabeta'),
        horasUso: Number(b.horasMotor) || Number(b.horimetroActual) || 0,
        capacidade: b.capacidadePassageiros || (b.tipo === 'jet' ? 3 : 8),
        fotos,
        imagemPrincipal: fotos[0],
        itensConforto,
        valorCota: Number(b.valorCota) || 180000,
        taxaAdmMensal: Number(b.taxaAdmMensal) || 2500,
        totalCotas,
        cotasDisponiveisCount,
        cotasEstoqueCount: Number(b.cotasDisponiveisEstoque) || 0,
        cotasRepasseCount: Number(b.cotasEmRepasse) || 0,
        vaga: b.vaga || 'Marina Náutica',
        tamanho: b.tamanho || '28 pés',
        statusMarina: b.statusMarina || 'na_marina'
      };
    });

    // Se informado ?vendedor=..., resolver dados de contato do consultor comercial
    let vendedorInfo: any = null;
    const vParam = String(req.query.vendedor || '').trim();
    const currentPool = getDbPool();

    if (vParam && currentPool) {
      try {
        const [funcRows]: any = await currentPool.query(`
          SELECT id, nome, cargo, setor, telefone, usuarioId
          FROM Funcionarios
          WHERE id = ? OR LOWER(nome) = LOWER(?) OR LOWER(nome) LIKE LOWER(?)
          LIMIT 1
        `, [vParam, vParam, `%${vParam}%`]);

        if (funcRows && funcRows.length > 0) {
          const f = funcRows[0];
          const rawPhone = f.telefone ? String(f.telefone).replace(/\D/g, '') : '';
          const phoneFormatted = rawPhone.length >= 10
            ? (rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`)
            : '558791229333';

          vendedorInfo = {
            id: f.id,
            nome: f.nome,
            cargo: f.cargo || 'Consultor Náutico Especialista',
            whatsapp: phoneFormatted
          };
        } else {
          // Tenta buscar em AdminUsers
          const [userRows]: any = await currentPool.query(`
            SELECT id, username, funcionarioId
            FROM AdminUsers
            WHERE id = ? OR LOWER(username) = LOWER(?)
            LIMIT 1
          `, [vParam, vParam]);

          if (userRows && userRows.length > 0) {
            const u = userRows[0];
            let vendedorNome = u.username;
            let vendedorPhone = '558791229333';
            if (u.funcionarioId) {
              const [fLinked]: any = await currentPool.query("SELECT nome, telefone, cargo FROM Funcionarios WHERE id = ?", [u.funcionarioId]);
              if (fLinked && fLinked[0]) {
                vendedorNome = fLinked[0].nome || vendedorNome;
                if (fLinked[0].telefone) {
                  const rawP = String(fLinked[0].telefone).replace(/\D/g, '');
                  if (rawP.length >= 10) vendedorPhone = rawP.startsWith('55') ? rawP : `55${rawP}`;
                }
              }
            }
            vendedorInfo = {
              id: String(u.id),
              nome: vendedorNome,
              cargo: 'Consultor Náutico Especialista',
              whatsapp: vendedorPhone
            };
          } else {
            // Se o parâmetro for apenas um nome em texto (ex: ?vendedor=Lucas)
            vendedorInfo = {
              id: vParam,
              nome: decodeURIComponent(vParam),
              cargo: 'Consultor Comercial Náutico',
              whatsapp: '558791229333'
            };
          }
        }
      } catch (err) {
        console.warn("[Vendedor query error]:", err);
      }
    }

    // Default caso não encontre ou não seja passado vendedor
    if (!vendedorInfo) {
      vendedorInfo = {
        id: 'comercial',
        nome: 'Equipe Comercial El Mexicano',
        cargo: 'Atendimento & Vendas Náuticas',
        whatsapp: '558791229333'
      };
    }

    res.json({
      success: true,
      count: barcos.length,
      barcos,
      vendedor: vendedorInfo
    });
  } catch (err: any) {
    console.error("[GET /catalogo/public Error]:", err);
    res.status(500).json({ error: true, message: "Erro ao carregar catálogo público" });
  }
});

// Endpoint público de captura para compatibilidade com rotas comerciais (/api/comercial/leads/captura)
router.post(["/leads/captura", "/captura-lead"], async (req, res) => {
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

    const cleanDigits = String(telefone).replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 8) {
      return res.status(400).json({ error: "Telefone/WhatsApp inválido" });
    }

    const selectedBoatId = embarcacaoId || embarcacaoInteresseId || null;
    const finalVendedorNome = vendedorNome || vendedor || null;
    const finalOrigem = origem || (utms?.utmSource) || utmSource || 'catalogo';
    const finalPermutaResumo = descricaoPermuta || resumoPermuta || null;
    const hasPermuta = Boolean(possuiPermuta || finalPermutaResumo);

    let boatName = '';
    if (selectedBoatId) {
      try {
        const pool = getDbPool();
        if (pool) {
          const [boats]: any = await pool.query("SELECT nome FROM Embarcacoes WHERE id = ? LIMIT 1", [selectedBoatId]);
          if (boats && boats.length > 0) boatName = boats[0].nome || '';
        }
      } catch (e) {}
    }

    const nowIso = new Date().toISOString();
    const allLeads = await getAllLeadsComercial();

    const existingLead = allLeads.find((l: any) => {
      const p = String(l.telefone || '').replace(/\D/g, '');
      if (!p) return false;
      return (
        p === cleanDigits ||
        (cleanDigits.length >= 8 && p.endsWith(cleanDigits.slice(-8))) ||
        (p.length >= 8 && cleanDigits.endsWith(p.slice(-8)))
      );
    });

    let savedLead: any = null;
    let isDuplicate = false;

    if (existingLead) {
      isDuplicate = true;
      const boatLabel = boatName ? `"${boatName}"` : (selectedBoatId ? `(ID ${selectedBoatId})` : 'do Catálogo');
      const existingTimeline = Array.isArray(existingLead.timeline) ? existingLead.timeline : [];
      const newEvent = {
        id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        data: nowIso,
        tipo: 'interesse',
        titulo: 'Novo Interesse no Catálogo Digital',
        descricao: `Lead demonstrou novo interesse na embarcação ${boatLabel} via Catálogo Digital [Origem: ${finalOrigem}]${hasPermuta ? ` (Permuta: ${finalPermutaResumo || 'Sim'})` : ''}`,
        autorNome: 'Vitrine Digital'
      };

      let ebs = Array.isArray(existingLead.embarcacoesInteresse) ? [...existingLead.embarcacoesInteresse] : [];
      if (selectedBoatId && !ebs.includes(selectedBoatId)) {
        ebs.push(selectedBoatId);
      }

      savedLead = await upsertLeadComercial({
        ...existingLead,
        nome: nome.trim() || existingLead.nome,
        email: email || existingLead.email,
        cidade: cidade || existingLead.cidade,
        temperatura: 'quente',
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
      const boatLabel = boatName ? `"${boatName}"` : (selectedBoatId ? `(ID ${selectedBoatId})` : '');
      const initialTimeline = [
        {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

    const defaultPhone = '558791229333';
    const permutaMention = hasPermuta
      ? `\n\n📌 *Nota:* Possuo um bem para avaliação de permuta/troca${finalPermutaResumo ? ` (${finalPermutaResumo})` : ''}.`
      : '';

    const whatsappMessage = `🌊 *Olá! Estive navegando no Catálogo Digital da El Mexicano.* 🚤\n\n` +
      `Gostei muito da embarcação *${boatName || 'disponível no catálogo'}* e quero conhecer as condições da cota e agendar uma visita na Marina!\n\n` +
      `👤 *Meu Nome:* ${nome.trim()}\n` +
      `📱 *WhatsApp:* ${telefone.trim()}` +
      permutaMention +
      `\n\n_Aguardo o retorno do consultor para tirar dúvidas._`;

    const whatsappUrl = `https://wa.me/${defaultPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    res.json({
      success: true,
      lead: savedLead,
      isDuplicate,
      whatsappUrl,
      message: isDuplicate ? "Interesse adicional registrado com sucesso!" : "Lead registrado com sucesso!"
    });
  } catch (err: any) {
    console.error("Erro na captura de lead (comercial):", err);
    res.status(500).json({ error: "Falha ao registrar lead de interesse" });
  }
});

// ==========================================
// Permutas (Trade-in)
// ==========================================
router.get(["/permutas", "/comercial/permutas"], requireAdminAuth, async (req, res) => {
  try {
    const permutas = await getAllPermutas();
    res.json({ success: true, permutas });
  } catch (err: any) {
    console.error("[GET permutas Error]:", err);
    res.status(500).json({ error: true, message: "Erro ao buscar permutas" });
  }
});

router.post(["/permutas", "/comercial/permutas"], requireAdminAuth, async (req, res) => {
  try {
    const permuta = await upsertPermuta(req.body);

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('permuta_created', permuta);
    }

    res.json({ success: true, permuta });
  } catch (err: any) {
    console.error("[POST permutas Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar permuta" });
  }
});

router.patch(["/permutas/:id/avaliar", "/comercial/permutas/:id/avaliar"], requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const payload = {
      ...req.body,
      avaliadoPor: req.body.avaliadoPor || user?.nome || 'Diretoria'
    };
    const permuta = await avaliarPermutaDiretoria(id, payload);

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('permuta_avaliada', permuta);
    }

    res.json({ success: true, permuta });
  } catch (err: any) {
    console.error("[PATCH permutas/:id/avaliar Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao avaliar permuta" });
  }
});

// ==========================================
// Check-in Visitas & Test Drives
// ==========================================
router.get(["/visitas", "/comercial/visitas"], requireAdminAuth, async (req, res) => {
  try {
    const visitas = await getAllCheckinsVisita();
    res.json({ success: true, visitas });
  } catch (err: any) {
    console.error("[GET visitas Error]:", err);
    res.status(500).json({ error: true, message: "Erro ao buscar visitas" });
  }
});

router.post(["/visitas", "/comercial/visitas", "/visitas/checkin"], requireAdminAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const payload = {
      ...req.body,
      vendedorNome: req.body.vendedorNome || user?.nome || 'Comercial',
      vendedorId: req.body.vendedorId || user?.id || null
    };
    const checkin = await createCheckinVisita(payload);

    const io = (req.app as any).locals?.io;
    if (io) {
      io.emit('checkin_visita_created', checkin);
    }

    res.json({ success: true, checkin });
  } catch (err: any) {
    console.error("[POST visitas checkin Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao registrar check-in" });
  }
});

// Checagem de Conflito de Agenda (Reservas de Cotistas + Manutenções OS) para Visita Comercial / Sea Trial
router.get(["/disponibilidade-visita", "/comercial/disponibilidade-visita"], requireAdminAuth, async (req, res) => {
  try {
    const { embarcacaoId, data } = req.query;
    if (!embarcacaoId || !data) {
      return res.status(400).json({ error: true, message: "Parâmetros 'embarcacaoId' e 'data' (YYYY-MM-DD) são obrigatórios" });
    }
    const resultado = await verificarDisponibilidadeVisita(String(embarcacaoId), String(data));
    res.json({ success: true, ...resultado });
  } catch (err: any) {
    console.error("[GET disponibilidade-visita Error]:", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao verificar disponibilidade" });
  }
});

export default router;

