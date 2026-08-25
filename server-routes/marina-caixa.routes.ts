import { Router } from "express";
import { requireMarinaManagerOrAdminAuth, sensitiveLimiter } from "./middlewares";
import {
  getCaixaMarinaTransacoes,
  upsertCaixaMarinaTransacao,
  deleteCaixaMarinaTransacao,
  devolverColetesCaixaMarina,
  getCaixaMarinaFechamento,
  salvarCaixaMarinaFechamento,
  getAbastecimentosPendentesCaixa
} from "../server-db";
import { getDbPool } from "../server-db";

const router = Router();

router.get("/transacoes", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const { startDate, endDate, tipo, categoria, formaPagamento, status, search } = req.query;
    const transacoes = await getCaixaMarinaTransacoes({
      startDate: startDate as string,
      endDate: endDate as string,
      tipo: tipo as string,
      categoria: categoria as string,
      formaPagamento: formaPagamento as string,
      status: status as string,
      search: search as string,
    });
    res.json(transacoes);
  } catch (err: any) {
    console.error("[Caixa Marina Transacoes Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar lançamentos do caixa." });
  }
});

router.post("/transacoes/save", requireMarinaManagerOrAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteCaixaMarinaTransacao(data.id || data);
    } else if (action === 'upsert') {
      if (Array.isArray(data)) {
        for (const item of data) {
          await upsertCaixaMarinaTransacao(item);
        }
      } else {
        await upsertCaixaMarinaTransacao(data);
      }
    } else {
      return res.status(400).json({ error: true, message: `Ação inválida: ${action}` });
    }

    const io = (req.app as any).locals.io;
    if (io) io.emit('marina_caixa_update', { action, data });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Caixa Marina Save Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar lançamento do caixa." });
  }
});

router.post("/transacoes/devolver-coletes", requireMarinaManagerOrAdminAuth, sensitiveLimiter, async (req, res) => {
  const { id, devolvidoPor } = req.body;
  if (!id) return res.status(400).json({ error: true, message: "ID da transação não fornecido." });

  try {
    await devolverColetesCaixaMarina(id, devolvidoPor || 'Gerente');
    const io = (req.app as any).locals.io;
    if (io) io.emit('marina_caixa_update', { action: 'devolver_coletes', id });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Caixa Marina Devolver Coletes Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao marcar coletes como devolvidos." });
  }
});

router.get("/fechamento", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const dataStr = (req.query.data as string) || new Date().toISOString().split('T')[0];
    const fechamento = await getCaixaMarinaFechamento(dataStr);
    res.json(fechamento || null);
  } catch (err: any) {
    console.error("[Caixa Marina Fechamento Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao obter fechamento de caixa." });
  }
});

router.post("/fechamento/salvar", requireMarinaManagerOrAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const fechamentoData = req.body;
    if (!fechamentoData || !fechamentoData.data) {
      return res.status(400).json({ error: true, message: "Data do fechamento é obrigatória." });
    }

    await salvarCaixaMarinaFechamento(fechamentoData);
    const io = (req.app as any).locals.io;
    if (io) io.emit('marina_caixa_update', { action: 'fechamento', data: fechamentoData });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Caixa Marina Salvar Fechamento Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao salvar fechamento de caixa." });
  }
});

router.get("/abastecimentos-pendentes", requireMarinaManagerOrAdminAuth, async (req, res) => {
  try {
    const pendentes = await getAbastecimentosPendentesCaixa();
    res.json(pendentes);
  } catch (err: any) {
    console.error("[Caixa Marina Abastecimentos Pendentes Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao buscar abastecimentos pendentes." });
  }
});

router.post("/abastecimentos-baixar", requireMarinaManagerOrAdminAuth, sensitiveLimiter, async (req, res) => {
  const { reservaId, formaPagamento, valorTotal, operadorNome, comprovanteUrl } = req.body;
  if (!reservaId) return res.status(400).json({ error: true, message: "ID da reserva é obrigatório." });

  try {
    const currentPool = getDbPool();
    if (!currentPool) throw new Error("Banco de dados offline.");

    // Obter dados da reserva
    const [rows] = await currentPool.query("SELECT * FROM Reservas WHERE id = ?", [reservaId]);
    const reserva = (rows as any[])[0];
    if (!reserva) return res.status(404).json({ error: true, message: "Reserva não encontrada." });

    const litros = Number(reserva.abastecimentoLitros || reserva.litrosAbastecidos) || 0;
    const finalValor = Number(valorTotal) || Number(reserva.abastecimentoValorTotal) || (litros * 9.00);
    const finalFormaPagamento = formaPagamento || reserva.abastecimentoFormaPagamento || 'pix';
    const finalOperador = operadorNome || 'Gerente';
    const finalComprovante = comprovanteUrl || reserva.abastecimentoComprovanteUrl || null;

    // 1. Atualizar a reserva
    await currentPool.query(
      `UPDATE Reservas SET
        abastecimentoStatusCobranca = 'cobrado',
        abastecimentoFormaPagamento = ?,
        abastecimentoValorTotal = ?,
        abastecimentoComprovanteUrl = ?
       WHERE id = ?`,
      [finalFormaPagamento, finalValor, finalComprovante, reservaId]
    );

    // 2. Criar lançamento no Caixa da Marina
    const caixaTransacao = {
      id: `cx_fuel_${reservaId}_${Date.now()}`,
      tipo: 'entrada',
      categoria: 'combustivel',
      descricao: `Abastecimento de ${litros}L (Reserva ${reservaId})`,
      valor: finalValor,
      formaPagamento: finalFormaPagamento,
      data: reserva.data || new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'confirmado',
      clienteTipo: 'cotista',
      clienteId: reserva.clienteId || null,
      embarcacaoId: reserva.embarcacaoId || null,
      reservaId: reservaId,
      combustivelLitros: litros,
      comprovanteUrl: finalComprovante,
      observacoes: `Baixa de combustível realizada por ${finalOperador}`,
      registradoPor: finalOperador,
      createdAt: new Date().toISOString()
    };

    await upsertCaixaMarinaTransacao(caixaTransacao);

    const io = (req.app as any).locals.io;
    if (io) {
      io.emit('marina_update', { action: 'update', reservation: { id: reservaId, abastecimentoStatusCobranca: 'cobrado' } });
      io.emit('marina_caixa_update', { action: 'upsert', data: caixaTransacao });
    }

    res.json({ success: true, transacao: caixaTransacao });
  } catch (err: any) {
    console.error("[Caixa Marina Baixa Abastecimento Error]", err);
    res.status(500).json({ error: true, message: err.message || "Erro ao dar baixa no abastecimento." });
  }
});

export default router;
