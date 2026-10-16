import { Router, Request, Response } from "express";
import { requireStrictAdminAuth, apiLimiter } from "./middlewares";
import {
  getUtvVeiculos,
  upsertUtvVeiculo,
  deleteUtvVeiculo,
  getUtvCotistas,
  upsertUtvCotista,
  deleteUtvCotista,
  getUtvUsos,
  getUtvUsoById,
  upsertUtvUso,
  deleteUtvUso,
  getUtvControleAnual,
  getUtvManutencoes,
  upsertUtvManutencao,
  deleteUtvManutencao,
  calcularRateioUtv
} from "../server-db";

const router = Router();

// Aplica limitação de taxa e autenticação estrita de administrador em todas as rotas de UTV
router.use(apiLimiter);
router.use(requireStrictAdminAuth);

// ──────────────────────────────────────────────
// 1. VEÍCULOS UTV
// ──────────────────────────────────────────────

router.get("/veiculos", async (_req: Request, res: Response) => {
  try {
    const veiculos = await getUtvVeiculos();
    res.json({ success: true, veiculos });
  } catch (err: any) {
    console.error("[UTV VEICULOS GET ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar veículos UTV" });
  }
});

router.post("/veiculos/save", async (req: Request, res: Response) => {
  try {
    await upsertUtvVeiculo(req.body);
    res.json({ success: true, message: "Veículo UTV salvo com sucesso" });
  } catch (err: any) {
    console.error("[UTV VEICULOS SAVE ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar veículo UTV" });
  }
});

router.delete("/veiculos/:id", async (req: Request, res: Response) => {
  try {
    await deleteUtvVeiculo(req.params.id);
    res.json({ success: true, message: "Veículo UTV excluído com sucesso" });
  } catch (err: any) {
    console.error("[UTV VEICULOS DELETE ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao excluir veículo UTV" });
  }
});

// ──────────────────────────────────────────────
// 2. COTISTAS UTV
// ──────────────────────────────────────────────

router.get("/cotistas", async (req: Request, res: Response) => {
  try {
    const ano = req.query.ano ? Number(req.query.ano) : undefined;
    const cotistas = await getUtvCotistas(ano);
    res.json({ success: true, cotistas });
  } catch (err: any) {
    console.error("[UTV COTISTAS GET ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar cotistas UTV" });
  }
});

router.post("/cotistas/save", async (req: Request, res: Response) => {
  try {
    await upsertUtvCotista(req.body);
    res.json({ success: true, message: "Cotista UTV salvo com sucesso" });
  } catch (err: any) {
    console.error("[UTV COTISTAS SAVE ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar cotista UTV" });
  }
});

router.delete("/cotistas/:id", async (req: Request, res: Response) => {
  try {
    await deleteUtvCotista(req.params.id);
    res.json({ success: true, message: "Cotista UTV excluído com sucesso" });
  } catch (err: any) {
    console.error("[UTV COTISTAS DELETE ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao excluir cotista UTV" });
  }
});

// ──────────────────────────────────────────────
// 3. CONTROLE ANUAL (30 DIAS & ACÚMULO)
// ──────────────────────────────────────────────

router.get("/controle-anual", async (req: Request, res: Response) => {
  try {
    const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();
    const controle = await getUtvControleAnual(ano);
    res.json({ success: true, ano, controle });
  } catch (err: any) {
    console.error("[UTV CONTROLE ANUAL GET ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao carregar controle anual" });
  }
});

// ──────────────────────────────────────────────
// 4. USOS, AGENDAMENTOS E CHECKLISTS
// ──────────────────────────────────────────────

router.get("/usos", async (req: Request, res: Response) => {
  try {
    const { veiculoId, cotistaId, dataUso, status, ano } = req.query;
    const usos = await getUtvUsos({
      veiculoId: veiculoId as string,
      cotistaId: cotistaId as string,
      dataUso: dataUso as string,
      status: status as string,
      ano: ano ? Number(ano) : undefined
    });
    res.json({ success: true, usos });
  } catch (err: any) {
    console.error("[UTV USOS GET ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar usos de UTV" });
  }
});

router.get("/usos/:id", async (req: Request, res: Response) => {
  try {
    const uso = await getUtvUsoById(req.params.id);
    if (!uso) {
      return res.status(404).json({ error: true, message: "Registro de uso não encontrado" });
    }
    res.json({ success: true, uso });
  } catch (err: any) {
    console.error("[UTV USOS GET BY ID ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar uso de UTV" });
  }
});

// Lançamento de nova reserva com trava de saldo de 30 dias e disponibilidade de data
router.post("/usos/reservar", async (req: Request, res: Response) => {
  try {
    const { veiculoId, cotistaId, dataUso, observacoesSaida } = req.body;

    if (!veiculoId || !cotistaId || !dataUso) {
      return res.status(400).json({ error: true, message: "Veículo, cotista e data de uso são obrigatórios." });
    }

    const ano = parseInt(dataUso.split("-")[0], 10) || new Date().getFullYear();

    // 1. Verifica se já existe reserva ativa para esse veículo na data
    const usosExistentes = await getUtvUsos({ veiculoId, dataUso });
    const conflito = usosExistentes.find(u => u.status !== "cancelado");
    if (conflito) {
      return res.status(400).json({
        error: true,
        message: `O veículo já possui uso/reserva agendada para ${dataUso} (Status: ${conflito.status}).`
      });
    }

    // 2. Verifica franquia anual de 30 dias do cotista
    const controle = await getUtvControleAnual(ano);
    const cotistaControle = controle.find(c => c.cotistaId === cotistaId);

    if (cotistaControle && cotistaControle.saldoDisponivel <= 0) {
      return res.status(400).json({
        error: true,
        message: `Cotista ${cotistaControle.nome} esgotou a franquia de ${cotistaControle.limiteDiasAnual} dias para o ano ${ano}. Saldo disponível: 0 dias.`
      });
    }

    const novoUso = {
      id: `utv_res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      veiculoId,
      cotistaId,
      dataUso,
      status: "reservado",
      observacoesSaida: observacoesSaida || null,
      createdAt: new Date().toISOString()
    };

    await upsertUtvUso(novoUso);
    res.json({ success: true, message: "Reserva criada com sucesso. 1 dia bloqueado provisoriamente.", uso: novoUso });
  } catch (err: any) {
    console.error("[UTV RESERVA ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao realizar reserva" });
  }
});

// Checklist de Retirada (Saída)
router.post("/usos/retirada", async (req: Request, res: Response) => {
  try {
    const { id, horaSaida, kmInicial, horimetroInicial, limpezaSaida, fotosSaida, observacoesSaida, operadorSaida } = req.body;

    if (!id) {
      return res.status(400).json({ error: true, message: "ID do uso é obrigatório." });
    }

    const usoAtual = await getUtvUsoById(id);
    if (!usoAtual) {
      return res.status(404).json({ error: true, message: "Uso não encontrado." });
    }

    if (usoAtual.status === "realizado") {
      return res.status(400).json({ error: true, message: "Este uso já foi finalizado como realizado." });
    }

    const atualizado = {
      ...usoAtual,
      horaSaida: horaSaida || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      kmInicial: kmInicial !== undefined ? Number(kmInicial) : usoAtual.kmInicial,
      horimetroInicial: horimetroInicial !== undefined ? Number(horimetroInicial) : usoAtual.horimetroInicial,
      limpezaSaida: limpezaSaida || "limpo",
      tanqueSaida: "cheio", // Regra obrigatória: tanque cheio na saída
      fotosSaida: fotosSaida || usoAtual.fotosSaida || [],
      observacoesSaida: observacoesSaida !== undefined ? observacoesSaida : usoAtual.observacoesSaida,
      operadorSaida: operadorSaida || (req as any).user?.username || "Admin",
      status: "em_uso"
    };

    await upsertUtvUso(atualizado);
    res.json({ success: true, message: "Checklist de retirada registrado. Veículo em uso.", uso: atualizado });
  } catch (err: any) {
    console.error("[UTV RETIRADA ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao registrar retirada" });
  }
});

// Checklist de Devolução (Retorno) & Fechamento Realizado
router.post("/usos/devolucao", async (req: Request, res: Response) => {
  try {
    const {
      id,
      horaChegada,
      kmFinal,
      horimetroFinal,
      limpezaChegada,
      tanqueCheioDevolvido,
      comprovanteAbastecimentoUrl,
      avarias,
      fotosChegada,
      observacoesChegada,
      operadorChegada
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: true, message: "ID do uso é obrigatório." });
    }

    const usoAtual = await getUtvUsoById(id);
    if (!usoAtual) {
      return res.status(404).json({ error: true, message: "Uso não encontrado." });
    }

    const kmF = Number(kmFinal);
    const horimF = Number(horimetroFinal);
    const kmI = Number(usoAtual.kmInicial) || 0;
    const horimI = Number(usoAtual.horimetroInicial) || 0;

    if (kmF < kmI) {
      return res.status(400).json({
        error: true,
        message: `KM final (${kmF}) não pode ser menor que o KM inicial (${kmI}).`
      });
    }

    if (horimF < horimI) {
      return res.status(400).json({
        error: true,
        message: `Horímetro final (${horimF} h) não pode ser menor que o inicial (${horimI} h).`
      });
    }

    const kmRodado = Math.round((kmF - kmI) * 100) / 100;
    const horasUtilizadas = Math.round((horimF - horimI) * 100) / 100;

    const agora = new Date().toISOString();
    const fechador = (req as any).user?.username || "Admin";

    const atualizado = {
      ...usoAtual,
      horaChegada: horaChegada || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      kmFinal: kmF,
      horimetroFinal: horimF,
      kmRodado,
      horasUtilizadas,
      limpezaChegada: limpezaChegada || "limpo",
      tanqueChegada: "cheio",
      tanqueCheioDevolvido: tanqueCheioDevolvido !== undefined ? Boolean(tanqueCheioDevolvido) : true,
      comprovanteAbastecimentoUrl: comprovanteAbastecimentoUrl || usoAtual.comprovanteAbastecimentoUrl || null,
      avarias: avarias || null,
      fotosChegada: fotosChegada || usoAtual.fotosChegada || [],
      observacoesChegada: observacoesChegada !== undefined ? observacoesChegada : usoAtual.observacoesChegada,
      operadorChegada: operadorChegada || fechador,
      fechadoEm: agora,
      fechadoPor: fechador,
      status: "realizado" // Efetiva a baixa no saldo anual do cotista
    };

    await upsertUtvUso(atualizado);
    res.json({
      success: true,
      message: `Uso finalizado e registrado como Realizado! Consumo: ${kmRodado} km | ${horasUtilizadas.toFixed(1)} h. Baixa efetivada no saldo anual do cotista.`,
      uso: atualizado
    });
  } catch (err: any) {
    console.error("[UTV DEVOLUCAO ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao registrar devolução" });
  }
});

// Cancelamento de Uso / Reserva
router.post("/usos/cancelar", async (req: Request, res: Response) => {
  try {
    const { id, motivoCancelamento } = req.body;
    if (!id) {
      return res.status(400).json({ error: true, message: "ID do uso é obrigatório." });
    }

    const usoAtual = await getUtvUsoById(id);
    if (!usoAtual) {
      return res.status(404).json({ error: true, message: "Uso não encontrado." });
    }

    if (usoAtual.status === "realizado") {
      return res.status(400).json({
        error: true,
        message: "Não é permitido cancelar um uso já 'Realizado'. Apenas reservas e usos em andamento podem ser cancelados."
      });
    }

    const atualizado = {
      ...usoAtual,
      status: "cancelado",
      canceladoEm: new Date().toISOString(),
      canceladoPor: (req as any).user?.username || "Admin",
      motivoCancelamento: motivoCancelamento || "Cancelamento solicitado"
    };

    await upsertUtvUso(atualizado);
    res.json({ success: true, message: "Uso cancelado. A data foi liberada e o saldo da cota anual foi estornado.", uso: atualizado });
  } catch (err: any) {
    console.error("[UTV CANCELAR ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao cancelar uso" });
  }
});

// Exclusão de registro com verificação de integridade estrita
router.delete("/usos/:id", async (req: Request, res: Response) => {
  try {
    await deleteUtvUso(req.params.id);
    res.json({ success: true, message: "Registro excluído com sucesso." });
  } catch (err: any) {
    console.error("[UTV DELETE USO ERROR]", err);
    // Se for a trava de integridade de 'realizado', devolve 400
    res.status(400).json({ error: true, message: err.message || "Erro ao excluir registro de uso." });
  }
});

// ──────────────────────────────────────────────
// 5. RATEIO DE MANUTENÇÃO
// ──────────────────────────────────────────────

router.get("/manutencoes", async (_req: Request, res: Response) => {
  try {
    const manutencoes = await getUtvManutencoes();
    res.json({ success: true, manutencoes });
  } catch (err: any) {
    console.error("[UTV MANUTENCOES GET ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar manutenções" });
  }
});

router.post("/manutencoes/calcular", async (req: Request, res: Response) => {
  try {
    const { veiculoId, valorTotal, criterioRateio, ano } = req.body;
    if (!valorTotal || Number(valorTotal) <= 0) {
      return res.status(400).json({ error: true, message: "Valor total válido é obrigatório." });
    }

    const calculo = await calcularRateioUtv({
      veiculoId,
      valorTotal: Number(valorTotal),
      criterioRateio: criterioRateio || "horas",
      ano: ano ? Number(ano) : undefined
    });

    res.json({ success: true, calculo });
  } catch (err: any) {
    console.error("[UTV CALCULAR RATEIO ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao calcular rateio" });
  }
});

router.post("/manutencoes/salvar", async (req: Request, res: Response) => {
  try {
    const { veiculoId, data, descricao, valorTotal, criterioRateio, detalhesRateio } = req.body;

    if (!veiculoId || !descricao || !valorTotal) {
      return res.status(400).json({ error: true, message: "Veículo, descrição e valor total são obrigatórios." });
    }

    const manut = {
      veiculoId,
      data: data || new Date().toISOString().split("T")[0],
      descricao,
      valorTotal: Number(valorTotal),
      criterioRateio: criterioRateio || "horas",
      detalhesRateio,
      registradoPor: (req as any).user?.username || "Admin"
    };

    await upsertUtvManutencao(manut);
    res.json({ success: true, message: "Rateio de manutenção registrado com sucesso!" });
  } catch (err: any) {
    console.error("[UTV SALVAR MANUTENCAO ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar manutenção" });
  }
});

router.delete("/manutencoes/:id", async (req: Request, res: Response) => {
  try {
    await deleteUtvManutencao(req.params.id);
    res.json({ success: true, message: "Registro de manutenção excluído com sucesso." });
  } catch (err: any) {
    console.error("[UTV DELETE MANUTENCAO ERROR]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao excluir manutenção." });
  }
});

export default router;
