import { Router } from "express";
import { requireAdminAuth, sensitiveLimiter } from "./middlewares";
import {
  getNextCodigoOS,
  deleteManutencao,
  upsertManutencao,
  pullDatabase,
  upsertTransacao,
  syncMultipleClientsFinancialStatus,
  getAllTiposManutencao,
  deleteTipoManutencao,
  upsertTipoManutencao,
  getDbPool
} from "../server-db";

const router = Router();

// Route: Operacional/Financeiro - Manutencoes
router.get("/next-code", requireAdminAuth, async (req, res) => {
  try {
    const code = await getNextCodigoOS();
    res.json({ success: true, code });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to generate OS code" });
  }
});

router.post("/save", requireAdminAuth, sensitiveLimiter, async (req, res) => {
  const { action, data } = req.body;
  try {
    if (action === 'delete') {
      await deleteManutencao(data.id);
    } else if (action === 'upsert') {
      await upsertManutencao(data);

      const pool = getDbPool();
      if (!pool) throw new Error("MySQL Connection pool is offline.");
      const [existingTrans] = await pool.query(
        "SELECT id, clienteId, planoContasId, centroCustoId, contaBancariaId, empresa FROM TransacoesFinanceiras WHERE id LIKE ?",
        [`fin_manut_${data.id}%`]
      );
      const hasExisting = (existingTrans as any[]).length > 0;
      const firstExisting = hasExisting ? (existingTrans as any[])[0] : null;

      if (data.gerarFinanceiro || hasExisting) {
        const baseValor = Number(data.valorRepassado) || Number(data.custo) || 0;
        if (baseValor > 0 || Number(data.custo) > 0) {
          const clientsToSync = new Set<string>();
          for (const t of existingTrans as any[]) {
            if (t.clienteId) clientsToSync.add(t.clienteId);
          }

          // ─── Transação SQL: garante atomicidade entre DELETE e INSERTs ───
          const connection = await pool.getConnection();
          try {
            await connection.beginTransaction();

            await connection.query(
              "DELETE FROM TransacoesFinanceiras WHERE id LIKE ?",
              [`fin_manut_${data.id}%`]
            );

            const transacaoBaseId = `fin_manut_${data.id}`;
            const finalPlano = data.planoContasId || (firstExisting ? firstExisting.planoContasId : undefined);
            const finalCentro = data.centroCustoId || (firstExisting ? firstExisting.centroCustoId : undefined);
            const finalConta = data.contaBancariaId || (firstExisting ? firstExisting.contaBancariaId : undefined);
            const finalEmpresa = data.empresa || (firstExisting ? firstExisting.empresa : 'Marina');

            const transacaoBase = {
              id: transacaoBaseId,
              tipo: 'receita',
              categoria: 'Serviços/Manutenção',
              valor: baseValor,
              dataVencimento: data.dataSaida || data.prazoEntrega || data.dataChamado || new Date().toISOString().split('T')[0],
              status: 'lancado',
              descricao: data.descricaoServico || `Manutenção Embarcação`,
              embarcacaoId: data.embarcacaoId,
              planoContasId: finalPlano,
              centroCustoId: finalCentro,
              contaBancariaId: finalConta,
              createdAt: new Date().toISOString(),
              empresa: finalEmpresa
            };

            const dbData = await pullDatabase();
            const boat = dbData.boats.find((b: any) => b.id === data.embarcacaoId);

            if (baseValor > 0) {
              if (boat && boat.donos && boat.donos.length > 0) {
                const numDonos = boat.donos.length;
                const valorRateado = Number((baseValor / numDonos).toFixed(2));

                for (const donoId of boat.donos) {
                  const splitData = {
                    ...transacaoBase,
                    id: `${transacaoBaseId}_${donoId}`,
                    clienteId: donoId,
                    valor: valorRateado,
                    descricao: `${transacaoBase.descricao} | Rateio (1/${numDonos})`
                  };
                  await upsertTransacao(splitData, connection);
                  clientsToSync.add(donoId);
                }
              } else {
                // Adicionando tentativa de vincular cliente caso faltem donos na embarcacao
                const fbClienteId = boat ? (boat.clienteId || null) : null;
                await upsertTransacao({ ...transacaoBase, clienteId: fbClienteId }, connection);
              }
            }

            // --- Despesa do Mecânico ---
            if (data.mecanico && Number(data.custo) > 0) {
              const mechanicDesc = `Pagamento Ref. OS #${data.codigoOS || data.id.substring(0,6)} - Mecânico`;
              const despesaData = {
                id: `${transacaoBaseId}_desp`,
                tipo: 'despesa',
                categoria: 'Serviços/Manutenção (Custo)',
                valor: Number(data.custo),
                dataVencimento: data.dataSaida || data.prazoEntrega || data.dataChamado || new Date().toISOString().split('T')[0],
                status: 'lancado',
                descricao: mechanicDesc,
                embarcacaoId: data.embarcacaoId,
                fornecedorId: data.mecanico,
                planoContasId: finalPlano,
                centroCustoId: finalCentro,
                contaBancariaId: finalConta,
                empresa: finalEmpresa,
                createdAt: new Date().toISOString()
              };
              await upsertTransacao(despesaData, connection);
            }

            await connection.commit();
          } catch (txErr) {
            await connection.rollback();
            throw txErr;
          } finally {
            connection.release();
          }

          if (clientsToSync.size > 0) {
            await syncMultipleClientsFinancialStatus(Array.from(clientsToSync));
          }
        }
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message || "Failed to save manutencao" });
  }
});

export default router;
