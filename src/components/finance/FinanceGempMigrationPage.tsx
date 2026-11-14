import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowDownToLine,
  Building2,
  Trash2,
  Eye,
  Clock,
  FileCode2,
  X,
  Check,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
  ArrowUpRight,
  Filter
} from 'lucide-react';

export default function FinanceGempMigrationPage() {
  // Parâmetros de extração do Firebird
  const [empresaQuery, setEmpresaQuery] = useState<string>('AMBAS');
  const [tipoQuery, setTipoQuery] = useState<string>('AMBOS');
  const [escopoQuery, setEscopoQuery] = useState<
    'abertos_e_quitados_corte' | 'apenas_abertos' | 'todo_historico'
  >('abertos_e_quitados_corte');

  const [dataCorteQuitados, setDataCorteQuitados] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });

  // Catálogos auxiliares do MySQL para classificação padrão
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [planosContas, setPlanosContas] = useState<any[]>([]);
  const [centrosDeCusto, setCentrosDeCusto] = useState<any[]>([]);

  // Defaults opcionais para fallback contábil
  const [contaBancariaIdPadrao, setContaBancariaIdPadrao] = useState<string>('');
  const [planoContasReceitaIdPadrao, setPlanoContasReceitaIdPadrao] = useState<string>('');
  const [planoContasDespesaIdPadrao, setPlanoContasDespesaIdPadrao] = useState<string>('');
  const [centroCustoIdPadrao, setCentroCustoIdPadrao] = useState<string>('');
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Estados de consulta e processamento
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncingDaily, setSyncingDaily] = useState(false);
  const [autoSyncAtiva, setAutoSyncAtiva] = useState(false);
  const [togglingAutoSync, setTogglingAutoSync] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros locais da tabela
  const [searchTerm, setSearchTerm] = useState('');
  const [acaoFilter, setAcaoFilter] = useState<string>('pendentes');
  const [empresaLocalFilter, setEmpresaLocalFilter] = useState<string>('todas');
  const [tipoLocalFilter, setTipoLocalFilter] = useState<string>('todos');
  const [situacaoFilter, setSituacaoFilter] = useState<string>('todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Auditoria e inspeção detalhada
  const [showSchemaAudit, setShowSchemaAudit] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<any | null>(null);

  // Carregar dados contábeis locais
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    Promise.all([
      fetch('/api/financeiro/contas-bancarias', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/financeiro/planos-contas', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/financeiro/centros-custo', { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([rContas, rPlanos, rCentros]) => {
        if (rContas.ok) setContasBancarias(await rContas.json());
        if (rPlanos.ok) setPlanosContas(await rPlanos.json());
        if (rCentros.ok) setCentrosDeCusto(await rCentros.json());
      })
      .catch(console.error);

    handleFetchPreview();
    fetch('/api/financeiro/gemp/auto-sync', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d.autoSyncAtiva === 'boolean') setAutoSyncAtiva(d.autoSyncAtiva); })
      .catch(() => {});
  }, []);


  const handleToggleAutoSync = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setTogglingAutoSync(true);
    try {
      const nextVal = !autoSyncAtiva;
      const res = await fetch('/api/financeiro/gemp/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ autoSyncAtiva: nextVal }),
      });
      if (res.ok) {
        const d = await res.json();
        setAutoSyncAtiva(Boolean(d.autoSyncAtiva));
        setSuccessMsg(d.autoSyncAtiva ? 'Sincronização automática ativada (a cada 15 min).' : 'Sincronização automática desativada. Agora as importações são 100% manuais.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingAutoSync(false);
    }
  };




  const handleFetchPreview = async () => {
    setLoadingPreview(true);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams();

      if (empresaQuery === 'MEXICANO') params.set('empresas', 'MEXICANO');
      else if (empresaQuery === 'VALE_ADMINISTRADORA') params.set('empresas', 'VALE_ADMINISTRADORA');
      else params.set('empresas', 'MEXICANO,VALE_ADMINISTRADORA');

      if (tipoQuery === 'RECEITA') params.set('tipos', 'receita');
      else if (tipoQuery === 'DESPESA') params.set('tipos', 'despesa');
      else params.set('tipos', 'receita,despesa');

      params.set('escopo', escopoQuery);
      if (escopoQuery === 'abertos_e_quitados_corte' && dataCorteQuitados) {
        params.set('dataCorteQuitados', dataCorteQuitados);
      }

      const res = await fetch(`/api/financeiro/gemp/preview?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textSnippet = await res.text();
        throw new Error(`O servidor respondeu com HTML em vez de JSON. Reinicie o backend ou verifique suas credenciais de administrador.`);
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Erro ao consultar o banco Firebird do ERP GEMP.');
      }

      setPreviewData(data);

      const autoSelected = new Set<string>();
      (data.items || []).forEach((item: any) => {
        if (item.acaoSincronizacao === 'novo' || item.acaoSincronizacao === 'atualizar') {
          autoSelected.add(item.id);
        }
      });
      setSelectedIds(autoSelected);

      if (autoSelected.size === 0 && (data.items || []).length > 0) {
        setAcaoFilter('todos');
      } else {
        setAcaoFilter('pendentes');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha de conexão com o servidor Firebird.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!previewData?.items) return [];
    const q = searchTerm.toLowerCase().trim();

    return previewData.items.filter((item: any) => {
      if (acaoFilter === 'pendentes') {
        if (item.acaoSincronizacao !== 'novo' && item.acaoSincronizacao !== 'atualizar') return false;
      } else if (acaoFilter !== 'todos' && item.acaoSincronizacao !== acaoFilter) {
        return false;
      }

      if (empresaLocalFilter !== 'todas' && item.origemEmpresa !== empresaLocalFilter) return false;
      if (tipoLocalFilter !== 'todos' && item.tipo !== tipoLocalFilter) return false;

      if (situacaoFilter === 'aberto' && item.status === 'pago') return false;
      if (situacaoFilter === 'pago' && item.status !== 'pago') return false;

      if (q) {
        const hay = `${item.gempFavorecidoNome} ${item.gempFavorecidoDoc} ${item.clienteNomeLocal || ''} ${
          item.fornecedorNomeLocal || ''
        } ${item.descricao} ${item.documento} ${item.embarcacaoNomeLocal || ''} ${item.gempServicosItens || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [previewData, searchTerm, acaoFilter, empresaLocalFilter, tipoLocalFilter, situacaoFilter]);

  const allFilteredSelected = useMemo(() => {
    if (filteredItems.length === 0) return false;
    return filteredItems.every((item: any) => selectedIds.has(item.id));
  }, [filteredItems, selectedIds]);

  const toggleSelectAllFiltered = () => {
    const next = new Set(selectedIds);
    if (allFilteredSelected) {
      filteredItems.forEach((i: any) => next.delete(i.id));
    } else {
      filteredItems.forEach((i: any) => next.add(i.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirmImport = async () => {
    if (!previewData?.items || selectedIds.size === 0) return;
    setImporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const itemsToImport = previewData.items.filter((i: any) => selectedIds.has(i.id));
      const token = localStorage.getItem('admin_token');

      const res = await fetch('/api/financeiro/gemp/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: itemsToImport,
          contaBancariaIdPadrao: contaBancariaIdPadrao || null,
          planoContasReceitaIdPadrao: planoContasReceitaIdPadrao || null,
          planoContasDespesaIdPadrao: planoContasDespesaIdPadrao || null,
          centroCustoIdPadrao: centroCustoIdPadrao || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Falha ao gravar lançamentos importados.');
      }

      setSuccessMsg(
        `Migração realizada com sucesso: ${data.insertedOrUpdated} lançamentos sincronizados e ${data.affectedClients} clientes atualizados!`
      );
      window.dispatchEvent(new CustomEvent('finance_updated'));
      await handleFetchPreview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro durante a importação.');
    } finally {
      setImporting(false);
    }
  };

  const handleSyncDailyIncremental = async () => {
    setSyncingDaily(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/financeiro/gemp/sync-incremental', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Falha ao sincronizar com o ERP GEMP.');
      }

      if (data.insertedOrUpdated > 0) {
        setSuccessMsg(
          `Sincronização concluída: ${data.novos} novos títulos adicionados e ${data.atualizados} títulos atualizados/baixados com sucesso!`
        );
      } else {
        setSuccessMsg('Tudo atualizado! Nenhum novo lançamento ou alteração pendente no ERP GEMP.');
      }

      window.dispatchEvent(new CustomEvent('finance_updated'));
      await handleFetchPreview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro durante a sincronização incremental.');
    } finally {
      setSyncingDaily(false);
    }
  };

  const handleClearImported = async (target: 'TODOS' | 'MEXICANO' | 'VALE_ADMINISTRADORA') => {
    const label =
      target === 'MEXICANO'
        ? 'da Mexicano Lanchas'
        : target === 'VALE_ADMINISTRADORA'
        ? 'da Vale Administradora'
        : 'de ambas as empresas';

    if (
      !window.confirm(
        `Deseja realmente remover os lançamentos migrados do GEMP ${label}? Apenas registros importados serão removidos, sem alterar o Firebird original nem lançamentos manuais.`
      )
    ) {
      return;
    }

    setClearing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/financeiro/gemp/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ origemEmpresa: target }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Falha ao limpar lançamentos migrados.');
      }
      setSuccessMsg(`${data.deletedCount} lançamentos migrados do GEMP foram removidos com sucesso.`);
      window.dispatchEvent(new CustomEvent('finance_updated'));
      await handleFetchPreview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao limpar lançamentos.');
    } finally {
      setClearing(false);
    }
  };

  const formatBRL = (val: number) =>
    `R$ ${(Number(val) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const importedStats = previewData?.summary?.alreadyImportedStats || {
    totalImported: 0,
    mexicanoRec: 0,
    mexicanoPag: 0,
    valeRec: 0,
    valePag: 0,
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Header Minimalista & Executivo */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Database className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                Migração Financeira ERP GEMP
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Read-Only
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Conexão com Firebird 5.0 (<code className="text-stone-700 font-mono">200.150.193.41:3050</code>) • Vínculo automático de Clientes, Embarcações e Fornecedores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center flex-wrap">
          <button
            type="button"
            disabled={togglingAutoSync}
            onClick={handleToggleAutoSync}
            className={`h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 ${
              autoSyncAtiva
                ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
            title="Controla se o sistema importa atualizações do GEMP automaticamente em segundo plano"
          >
            <span className={`w-2 h-2 rounded-full ${autoSyncAtiva ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>{autoSyncAtiva ? 'Auto-Sync: ATIVO (15m)' : 'Auto-Sync: DESATIVADO (Manual)'}</span>
          </button>
          <button
            type="button"
            disabled={syncingDaily}
            onClick={handleSyncDailyIncremental}
            className="h-9 px-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            title="Verifica títulos novos e atualizações/baixas dos últimos 90 dias em 1 clique"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingDaily ? 'animate-spin' : ''}`} />
            <span>{syncingDaily ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSchemaAudit(!showSchemaAudit)}
            className="h-9 px-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileCode2 className="w-4 h-4 text-stone-500" />
            <span>{showSchemaAudit ? 'Ocultar De → Para' : 'Mapeamento de Campos'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="h-9 px-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-stone-500" />
            <span>Padrões Contábeis</span>
          </button>

          {importedStats.totalImported > 0 && (
            <button
              type="button"
              disabled={clearing}
              onClick={() => handleClearImported('TODOS')}
              className="h-9 px-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Remove do banco os registros que vieram da integração GEMP"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar ({importedStats.totalImported})</span>
            </button>
          )}
        </div>
      </div>

      {/* Drawer / Card Retrátil de Padrões Contábeis (Fallback) */}
      {showConfigDrawer && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Configuração de Vínculos Contábeis Padrão (Opcional)</h3>
              <p className="text-xs text-stone-500">
                Se um lançamento no GEMP não tiver plano de contas ou conta bancária identificados, estes valores serão atribuídos automaticamente.
              </p>
            </div>
            <button
              onClick={() => setShowConfigDrawer(false)}
              className="text-stone-400 hover:text-stone-700 text-xs font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Plano de Receita Padrão</label>
              <select
                value={planoContasReceitaIdPadrao}
                onChange={(e) => setPlanoContasReceitaIdPadrao(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
              >
                <option value="">Automático por Categoria</option>
                {planosContas
                  .filter((p) => p.tipo === 'receita')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.descricao} ({p.empresa})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Plano de Despesa Padrão</label>
              <select
                value={planoContasDespesaIdPadrao}
                onChange={(e) => setPlanoContasDespesaIdPadrao(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
              >
                <option value="">Automático por Categoria</option>
                {planosContas
                  .filter((p) => p.tipo === 'despesa')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.descricao} ({p.empresa})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Conta Bancária Padrão</label>
              <select
                value={contaBancariaIdPadrao}
                onChange={(e) => setContaBancariaIdPadrao(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
              >
                <option value="">Automático por Empresa</option>
                {contasBancarias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.empresa})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Centro de Custo Padrão</label>
              <select
                value={centroCustoIdPadrao}
                onChange={(e) => setCentroCustoIdPadrao(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
              >
                <option value="">Automático por Categoria</option>
                {centrosDeCusto.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.nome} ({cc.empresa})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Mapeamento de Campos (Auditoria De -> Para) */}
      {showSchemaAudit && (
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Auditoria de Campos: ERP GEMP (Firebird) → TransacoesFinanceiras (MySQL)
              </h3>
              <p className="text-xs text-stone-500">
                Cada registro migrado alimenta com fidelidade todas as 23 colunas da nossa modelagem financeira.
              </p>
            </div>
            <button
              onClick={() => setShowSchemaAudit(false)}
              className="text-stone-400 hover:text-stone-700 text-xs font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                col: 'id (PK)',
                src: 'RECEBER.CODREC / PAGAR.CODPAG',
                desc: 'ID único idempotente (ex: gemp_rec_mex_4751) evitando duplicações.',
              },
              {
                col: 'empresa & origem_empresa',
                src: 'VTDADOS.FDB / VTDADOS2.FDB',
                desc: 'Mexicano ou Vale Administradora para visão consolidada e relatórios filtrados.',
              },
              {
                col: 'tipo & status',
                src: "RECEBER/PAGAR + SIT ('A', 'Q')",
                desc: 'RECEITA ou DESPESA; status quitado (pago), atrasado (vencido) ou em aberto.',
              },
              {
                col: 'valor & valorPago',
                src: 'VALOR / VALORPAG',
                desc: 'Conversão precisa com dupla precisão decimal, preservando ambos.',
              },
              {
                col: 'Datas (Venc., Pagto, Emissão)',
                src: 'DATAVENC, DTPAG, DATAEMIS',
                desc: 'Preserva data de emissão original em createdAt e data de pagamento quando quitado.',
              },
              {
                col: 'clienteId & fornecedorId',
                src: 'CLIENTE.CPFCNPJ / FORNECEDOR.CNPJ',
                desc: 'Cruza por CPF/CNPJ (apenas dígitos) ou Razão Social com nosso cadastro existente.',
              },
              {
                col: 'embarcacaoId',
                src: 'EMBARCACAO.NOME_EMBARCACAO',
                desc: 'Vincula à lancha/jet correspondente no cadastro de embarcações.',
              },
              {
                col: 'planoContasId & centroCustoId',
                src: 'CODPLANO / Itens e Serviços',
                desc: 'Identifica categoria (Combustível, Venda de Cota, Mensalidade) e centro de custo.',
              },
              {
                col: 'Parcelas & Metadados',
                src: 'PRC, BL_OBS, DOC',
                desc: 'Número e total de parcelas, grupo de parcelamento e metadados JSON completos.',
              },
            ].map((field, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-stone-900">{field.col}</span>
                  <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Firebird
                  </span>
                </div>
                <div className="text-xs text-stone-700 font-medium">{field.src}</div>
                <div className="text-[11px] text-stone-500 leading-relaxed">{field.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Filtros de Consulta do Servidor Firebird */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Banco / Empresa</label>
              <select
                value={empresaQuery}
                onChange={(e) => setEmpresaQuery(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-800 focus:bg-white focus:outline-none focus:border-stone-400 transition-colors"
              >
                <option value="AMBAS">Ambas as Empresas</option>
                <option value="MEXICANO">Mexicano Lanchas Ltda</option>
                <option value="VALE_ADMINISTRADORA">Vale Administradora de Bens</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Módulo Financeiro</label>
              <select
                value={tipoQuery}
                onChange={(e) => setTipoQuery(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-800 focus:bg-white focus:outline-none focus:border-stone-400 transition-colors"
              >
                <option value="AMBOS">Receber + Pagar (Completo)</option>
                <option value="RECEITA">Contas a Receber (RECEBER)</option>
                <option value="DESPESA">Contas a Pagar (PAGAR)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Escopo de Títulos</label>
              <select
                value={escopoQuery}
                onChange={(e) => setEscopoQuery(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-800 focus:bg-white focus:outline-none focus:border-stone-400 transition-colors"
              >
                <option value="abertos_e_quitados_corte">Abertos + Quitados Recentes</option>
                <option value="apenas_abertos">Apenas Títulos em Aberto</option>
                <option value="todo_historico">Todo o Histórico</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Data de Corte (Quitados)</label>
              <input
                type="date"
                disabled={escopoQuery !== 'abertos_e_quitados_corte'}
                value={dataCorteQuitados}
                onChange={(e) => setDataCorteQuitados(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-800 focus:bg-white focus:outline-none focus:border-stone-400 disabled:opacity-40 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFetchPreview}
              disabled={loadingPreview}
              className="h-10 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loadingPreview ? 'animate-spin' : ''}`} />
              <span>{loadingPreview ? 'Conectando Firebird...' : 'Atualizar Pré-Visualização'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Indicadores Resumidos dos Títulos */}
      {previewData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Extraídos</span>
            <div className="text-2xl font-bold text-stone-900 mt-1">{previewData.summary.total}</div>
            <span className="text-[11px] text-stone-500 mt-0.5 block">
              {previewData.summary.receitasCount} rec • {previewData.summary.despesasCount} desp
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Para Sincronizar</span>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              {previewData.summary.novos + previewData.summary.atualizacoes}
            </div>
            <span className="text-[11px] text-blue-600/80 mt-0.5 block">
              {previewData.summary.novos} novos • {previewData.summary.atualizacoes} atualiz.
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Total Receitas</span>
            <div className="text-lg font-bold text-emerald-700 mt-1 tabular-nums">
              {formatBRL(previewData.summary.valorTotalReceitas)}
            </div>
            <span className="text-[11px] text-emerald-600/80 mt-0.5 block">
              {previewData.summary.clientesVinculados} clientes vinculados
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Total Despesas</span>
            <div className="text-lg font-bold text-rose-700 mt-1 tabular-nums">
              {formatBRL(previewData.summary.valorTotalDespesas)}
            </div>
            <span className="text-[11px] text-rose-600/80 mt-0.5 block">
              {previewData.summary.fornecedoresVinculados} fornec. vinculados
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Embarcações</span>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {previewData.summary.embarcacoesVinculadas}
            </div>
            <span className="text-[11px] text-amber-600/80 mt-0.5 block">Identificadas pelo GEMP</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Status no Banco</span>
            <div className="text-2xl font-bold text-stone-800 mt-1">
              {importedStats.totalImported}
            </div>
            <span className="text-[11px] text-stone-500 mt-0.5 block">Já migrados anteriormente</span>
          </div>
        </div>
      )}

      {/* 4. Tabela de Pré-Visualização e Seleção para Importação */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Barra Superior da Tabela: Ações em Lote e Filtros Locais */}
        <div className="p-4 border-b border-stone-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50/50">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente, documento, barco..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
              />
            </div>

            <select
              value={acaoFilter}
              onChange={(e) => setAcaoFilter(e.target.value)}
              className="h-9 px-2.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-700"
            >
              <option value="pendentes">Pendentes de Importação</option>
              <option value="novo">Apenas Novos</option>
              <option value="atualizar">Apenas Atualizações</option>
              <option value="inalterado">Já Importados</option>
              <option value="todos">Todos os Registros</option>
            </select>

            <select
              value={tipoLocalFilter}
              onChange={(e) => setTipoLocalFilter(e.target.value)}
              className="h-9 px-2.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-700"
            >
              <option value="todos">Receitas e Despesas</option>
              <option value="receita">Apenas Receitas</option>
              <option value="despesa">Apenas Despesas</option>
            </select>

            <select
              value={situacaoFilter}
              onChange={(e) => setSituacaoFilter(e.target.value)}
              className="h-9 px-2.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-700"
            >
              <option value="todos">Todas as Situações</option>
              <option value="aberto">Em Aberto</option>
              <option value="pago">Quitados</option>
            </select>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-stone-500">
              Selecionados: <strong className="text-stone-900">{selectedIds.size}</strong> de {filteredItems.length}
            </span>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing || selectedIds.size === 0}
              className="h-9 px-4 rounded-xl bg-mx-ink hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>{importing ? 'Sincronizando...' : `Importar Selecionados (${selectedIds.size})`}</span>
            </button>
          </div>
        </div>

        {/* Listagem em Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200/80 bg-stone-50 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="rounded border-stone-300 text-stone-900 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Origem</th>
                <th className="py-3 px-3">Tipo / Doc</th>
                <th className="py-3 px-3">Favorecido (Cliente / Fornecedor)</th>
                <th className="py-3 px-3">Embarcação / Itens</th>
                <th className="py-3 px-3">Vencimento</th>
                <th className="py-3 px-3 text-right">Valor</th>
                <th className="py-3 px-3 text-center">Situação</th>
                <th className="py-3 px-3 text-center">Ação</th>
                <th className="py-3 px-4 text-center w-12">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-stone-400">
                    {loadingPreview
                      ? 'Consultando banco Firebird 5.0...'
                      : 'Nenhum lançamento encontrado para os filtros selecionados.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => {
                  const isSelected = selectedIds.has(item.id);
                  const isReceita = item.tipo === 'receita';
                  const isQuitado = item.status === 'pago';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-stone-50/70 transition-colors ${
                        isSelected ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="rounded border-stone-300 text-stone-900 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          {item.origemEmpresa === 'MEXICANO' ? 'Mexicano' : 'Vale Adm.'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-medium text-stone-900">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isReceita ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{isReceita ? 'Receber' : 'Pagar'}</span>
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                          Doc #{item.documento || item.gempId}
                          {item.numeroParcela ? ` (Prc ${item.numeroParcela}/${item.totalParcelas})` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-[220px]">
                        <div className="font-semibold text-stone-900 truncate" title={item.gempFavorecidoNome}>
                          {item.gempFavorecidoNome}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1">
                          {item.clienteNomeLocal || item.fornecedorNomeLocal ? (
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Vinculado ao cadastro
                            </span>
                          ) : (
                            <span className="text-stone-400">
                              Doc: {item.gempFavorecidoDoc || 'Sem CPF/CNPJ'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-medium text-stone-800 truncate" title={item.embarcacaoNomeLocal || item.gempEmbarcacaoVaga}>
                          {item.embarcacaoNomeLocal ? (
                            <span className="text-amber-700 font-bold">{item.embarcacaoNomeLocal}</span>
                          ) : (
                            item.gempEmbarcacaoVaga || '—'
                          )}
                        </div>
                        {item.gempServicosItens && (
                          <div className="text-[10px] text-stone-400 truncate" title={item.gempServicosItens}>
                            {item.gempServicosItens}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-stone-800 font-medium">
                          {item.dataVencimento ? item.dataVencimento.split('-').reverse().join('/') : '—'}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Emissão: {item.dataEmissao ? item.dataEmissao.split('-').reverse().join('/') : '—'}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div
                          className={`font-bold tabular-nums ${
                            isReceita ? 'text-emerald-700' : 'text-stone-900'
                          }`}
                        >
                          {formatBRL(item.valor)}
                        </div>
                        {isQuitado && item.valorPago > 0 && (
                          <div className="text-[10px] text-stone-400 tabular-nums">
                            Pago: {formatBRL(item.valorPago)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isQuitado
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.situacaoGemp || (isQuitado ? 'QUITADO' : 'ABERTO')}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.acaoSincronizacao === 'novo'
                              ? 'bg-blue-50 text-blue-700'
                              : item.acaoSincronizacao === 'atualizar'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {item.acaoSincronizacao === 'novo'
                            ? 'Novo'
                            : item.acaoSincronizacao === 'atualizar'
                            ? 'Atualizar'
                            : 'Já Importado'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setInspectingItem(item)}
                          className="w-7 h-7 rounded-lg hover:bg-stone-200/60 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
                          title="Inspecionar campos que serão gravados no banco"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Inspeção Detalhada da Linha */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Inspeção de Campos — Doc #{inspectingItem.documento || inspectingItem.gempId}
                </h3>
                <p className="text-xs text-stone-500">
                  Prévia exata de como este título será gravado em `TransacoesFinanceiras`.
                </p>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="w-8 h-8 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">Identificador no Sistema</span>
                  <div className="font-mono font-bold text-stone-800 mt-0.5">{inspectingItem.id}</div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">Empresa / Origem</span>
                  <div className="font-bold text-stone-800 mt-0.5">
                    {inspectingItem.empresa} ({inspectingItem.origemEmpresa})
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">Favorecido Vinculado</span>
                  <div className="font-bold text-stone-800 mt-0.5">
                    {inspectingItem.clienteNomeLocal || inspectingItem.fornecedorNomeLocal || inspectingItem.gempFavorecidoNome}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {inspectingItem.clienteId ? `ID Cliente: ${inspectingItem.clienteId}` : inspectingItem.fornecedorId ? `ID Fornec: ${inspectingItem.fornecedorId}` : 'Não vinculado no cadastro local'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">Embarcação Vinculada</span>
                  <div className="font-bold text-stone-800 mt-0.5">
                    {inspectingItem.embarcacaoNomeLocal || inspectingItem.gempEmbarcacaoVaga || 'Nenhuma'}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {inspectingItem.embarcacaoId ? `ID Barco: ${inspectingItem.embarcacaoId}` : 'Sem vínculo direto'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">Valor Original / Pago</span>
                  <div className="font-bold text-stone-800 mt-0.5 tabular-nums">
                    {formatBRL(inspectingItem.valorOriginal)} / {formatBRL(inspectingItem.valorPago)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">Vencimento / Emissão</span>
                  <div className="font-bold text-stone-800 mt-0.5">
                    {inspectingItem.dataVencimento} (Emissão: {inspectingItem.dataEmissao})
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">Descrição Formatada</span>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 leading-relaxed font-mono text-[11px]">
                  {inspectingItem.descricao}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">Metadados Técnicos (JSON)</span>
                <pre className="p-3 rounded-xl bg-stone-900 text-stone-100 text-[11px] font-mono overflow-x-auto max-h-40">
                  {JSON.stringify(inspectingItem.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer"
              >
                Fechar Inspeção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
