import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowDownToLine,
  Building2,
  UserCheck,
  Ship,
  Calendar,
  X,
  CheckSquare,
  Square,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface ImportGempModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  defaultEmpresa?: string;
  contasBancarias?: any[];
  planosContas?: any[];
  centrosDeCusto?: any[];
}

export default function ImportGempModal({
  isOpen,
  onClose,
  onImportSuccess,
  defaultEmpresa = 'Todos',
  contasBancarias = [],
  planosContas = [],
  centrosDeCusto = [],
}: ImportGempModalProps) {
  // Filtros de consulta ao banco Firebird
  const [empresaQuery, setEmpresaQuery] = useState<string>(() => {
    if (defaultEmpresa === 'Mexicano') return 'MEXICANO';
    if (defaultEmpresa === 'Vale Administradora') return 'VALE_ADMINISTRADORA';
    return 'AMBAS';
  });
  const [tipoQuery, setTipoQuery] = useState<string>('AMBOS');
  const [escopoQuery, setEscopoQuery] = useState<
    'abertos_e_quitados_corte' | 'apenas_abertos' | 'todo_historico'
  >('abertos_e_quitados_corte');

  const [dataCorteQuitados, setDataCorteQuitados] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });

  // Estado de carregamento e resultado da pré-visualização
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importSuccessResult, setImportSuccessResult] = useState<{
    insertedOrUpdated: number;
    affectedClients: number;
  } | null>(null);

  // Filtros locais da tabela de pré-visualização
  const [searchTerm, setSearchTerm] = useState('');
  const [acaoFilter, setAcaoFilter] = useState<string>('pendentes'); // 'todos' | 'pendentes' | 'novo' | 'atualizar' | 'inalterado'
  const [vinculoFilter, setVinculoFilter] = useState<string>('todos'); // 'todos' | 'vinculados' | 'apenas_gemp'
  const [situacaoFilter, setSituacaoFilter] = useState<string>('todos'); // 'todos' | 'aberto' | 'pago'
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Classificação contábil opcional na importação
  const [contaBancariaIdPadrao, setContaBancariaIdPadrao] = useState<string>('');
  const [centroCustoIdPadrao, setCentroCustoIdPadrao] = useState<string>('');

  const handleFetchPreview = async () => {
    setLoadingPreview(true);
    setErrorMsg(null);
    setImportSuccessResult(null);

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

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Erro ao buscar pré-visualização do GEMP.');
      }

      setPreviewData(data);

      // Seleciona por padrão todos os itens "novo" ou "atualizar"
      const autoSelected = new Set<string>();
      (data.items || []).forEach((item: any) => {
        if (item.acaoSincronizacao === 'novo' || item.acaoSincronizacao === 'atualizar') {
          autoSelected.add(item.id);
        }
      });
      setSelectedIds(autoSelected);

      // Se não houver novos/atualizar, mostra todos na tabela para o usuário ver
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

  // Dispara consulta inicial ao abrir o modal
  useEffect(() => {
    if (isOpen && !previewData && !loadingPreview) {
      handleFetchPreview();
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!previewData?.items) return [];
    const q = searchTerm.toLowerCase().trim();

    return previewData.items.filter((item: any) => {
      if (acaoFilter === 'pendentes') {
        if (item.acaoSincronizacao !== 'novo' && item.acaoSincronizacao !== 'atualizar') return false;
      } else if (acaoFilter !== 'todos' && item.acaoSincronizacao !== acaoFilter) {
        return false;
      }

      const hasLocalLink = Boolean(item.clienteId || item.fornecedorId);
      if (vinculoFilter === 'vinculados' && !hasLocalLink) return false;
      if (vinculoFilter === 'apenas_gemp' && hasLocalLink) return false;

      if (situacaoFilter === 'aberto' && item.status === 'pago') return false;
      if (situacaoFilter === 'pago' && item.status !== 'pago') return false;

      if (q) {
        const hay = `${item.gempFavorecidoNome} ${item.gempFavorecidoDoc} ${item.clienteNomeLocal || ''} ${
          item.fornecedorNomeLocal || ''
        } ${item.descricao} ${item.categoria} ${item.gempEmbarcacaoVaga} ${item.gempServicosItens} ${
          item.gempId
        } ${item.documento}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [previewData, searchTerm, acaoFilter, vinculoFilter, situacaoFilter]);

  const allVisibleSelected =
    filteredItems.length > 0 && filteredItems.every((i: any) => selectedIds.has(i.id));

  const toggleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      filteredItems.forEach((i: any) => next.delete(i.id));
    } else {
      filteredItems.forEach((i: any) => next.add(i.id));
    }
    setSelectedIds(next);
  };

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirmImport = async () => {
    if (!previewData?.items || selectedIds.size === 0) return;
    setImporting(true);
    setErrorMsg(null);

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
          centroCustoIdPadrao: centroCustoIdPadrao || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || 'Falha ao gravar lançamentos importados.');
      }

      setImportSuccessResult({
        insertedOrUpdated: data.insertedOrUpdated || itemsToImport.length,
        affectedClients: data.affectedClients || 0,
      });

      onImportSuccess();
      window.dispatchEvent(new CustomEvent('finance_updated'));
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro durante a importação.');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const formatBRL = (val: number) =>
    `R$ ${(Number(val) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Importação Financeira — ERP GEMP (Firebird 5.0)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <ShieldCheck className="w-3 h-3" /> Read-Only (Sem Locks)
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Pré-visualização homologada (200.150.193.41:3050 • WIN1252) com vínculo automático por CPF/CNPJ e Embarcação.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Configuração da Consulta ao GEMP */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Banco / Empresa GEMP
              </label>
              <select
                value={empresaQuery}
                onChange={(e) => setEmpresaQuery(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900"
              >
                <option value="AMBAS">Ambas (Mexicano + Vale)</option>
                <option value="MEXICANO">Mexicano Lanchas (VTDADOS.FDB)</option>
                <option value="VALE_ADMINISTRADORA">Vale Administradora (VTDADOS2.FDB)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Módulo Financeiro
              </label>
              <select
                value={tipoQuery}
                onChange={(e) => setTipoQuery(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900"
              >
                <option value="AMBOS">Receber + Pagar (Completo)</option>
                <option value="RECEITA">Apenas Contas a Receber (RECEBER)</option>
                <option value="DESPESA">Apenas Contas a Pagar (PAGAR)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Escopo de Histórico
              </label>
              <select
                value={escopoQuery}
                onChange={(e) => setEscopoQuery(e.target.value as any)}
                className="w-full h-9 px-2.5 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-900"
              >
                <option value="abertos_e_quitados_corte">Abertos + Quitados desde Corte</option>
                <option value="apenas_abertos">Apenas Títulos em Aberto</option>
                <option value="todo_historico">100% do Histórico do GEMP</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Data de Corte (Quitados)
              </label>
              <input
                type="date"
                disabled={escopoQuery !== 'abertos_e_quitados_corte'}
                value={dataCorteQuitados}
                onChange={(e) => setDataCorteQuitados(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-800 disabled:opacity-50 focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={loadingPreview}
                className="w-full h-9 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
                <span>{loadingPreview ? 'Consultando GEMP...' : 'Consultar GEMP'}</span>
              </button>
            </div>
          </div>

          {/* Avisos de erro ou sucesso */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {importSuccessResult && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Importação concluída com sucesso!</strong> {importSuccessResult.insertedOrUpdated}{' '}
                  lançamentos sincronizados e {importSuccessResult.affectedClients} clientes tiveram a situação financeira atualizada.
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 cursor-pointer"
              >
                Fechar e Ver Lançamentos
              </button>
            </div>
          )}

          {previewData?.errors?.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              {previewData.errors.map((e: any, idx: number) => (
                <div key={idx}>
                  ⚠️ <strong>{e.empresa} ({e.tipo}):</strong> {e.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KPIs da Pré-visualização */}
        {previewData?.summary && (
          <div className="px-4 py-3 bg-white border-b border-stone-200 grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0">
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
              <div className="text-[10px] font-semibold uppercase text-stone-400">Total no GEMP</div>
              <div className="text-base font-bold text-stone-900 mt-0.5">
                {previewData.summary.total} títulos
              </div>
              <div className="text-[10px] text-stone-500">
                {previewData.summary.receitasCount} Rec. • {previewData.summary.despesasCount} Desp.
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/70">
              <div className="text-[10px] font-semibold uppercase text-blue-600">Novos p/ Importar</div>
              <div className="text-base font-bold text-blue-800 mt-0.5">
                {previewData.summary.novos}
              </div>
              <div className="text-[10px] text-blue-600">
                +{previewData.summary.atualizacoes} atualizações de status
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
              <div className="text-[10px] font-semibold uppercase text-emerald-700">Contas a Receber</div>
              <div className="text-sm font-bold text-emerald-800 mt-0.5 tabular-nums">
                {formatBRL(previewData.summary.valorTotalReceitas)}
              </div>
              <div className="text-[10px] text-emerald-600">
                {previewData.summary.clientesVinculados} vinculados a Clientes locais
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/70">
              <div className="text-[10px] font-semibold uppercase text-rose-700">Contas a Pagar</div>
              <div className="text-sm font-bold text-rose-800 mt-0.5 tabular-nums">
                {formatBRL(previewData.summary.valorTotalDespesas)}
              </div>
              <div className="text-[10px] text-rose-600">
                {previewData.summary.fornecedoresVinculados} vinculados a Fornecedores
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
              <div className="text-[10px] font-semibold uppercase text-amber-700">Embarcações / Vagas</div>
              <div className="text-base font-bold text-amber-900 mt-0.5">
                {previewData.summary.embarcacoesVinculadas} vinculadas
              </div>
              <div className="text-[10px] text-amber-700">
                Não cadastrados mantidos em metadata
              </div>
            </div>
          </div>
        )}

        {/* Filtros internos da tabela de preview */}
        <div className="px-4 py-2.5 bg-stone-50/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar cliente, CPF/CNPJ, barco, doc..."
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-900"
              />
            </div>

            <select
              value={acaoFilter}
              onChange={(e) => setAcaoFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-700"
            >
              <option value="pendentes">Novos + Atualizações</option>
              <option value="todos">Todos ({previewData?.items?.length || 0})</option>
              <option value="novo">Apenas Novos ({previewData?.summary?.novos || 0})</option>
              <option value="atualizar">Apenas Atualizações ({previewData?.summary?.atualizacoes || 0})</option>
              <option value="inalterado">Já Sincronizados ({previewData?.summary?.inalterados || 0})</option>
            </select>

            <select
              value={vinculoFilter}
              onChange={(e) => setVinculoFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-700"
            >
              <option value="todos">Todos os Favorecidos</option>
              <option value="vinculados">Vinculados no Nosso Sistema</option>
              <option value="apenas_gemp">Não Cadastrados (Mantidos em Metadata)</option>
            </select>

            <select
              value={situacaoFilter}
              onChange={(e) => setSituacaoFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-700"
            >
              <option value="todos">Abertos + Quitados</option>
              <option value="aberto">Apenas em Aberto / Vencidos</option>
              <option value="pago">Apenas Quitados</option>
            </select>
          </div>

          <div className="text-xs font-semibold text-stone-600">
            Exibindo {filteredItems.length} •{' '}
            <span className="text-stone-900 font-bold">{selectedIds.size} selecionados</span>
          </div>
        </div>

        {/* Tabela de Pré-visualização */}
        <div className="flex-1 overflow-y-auto">
          {loadingPreview ? (
            <div className="p-16 flex flex-col items-center justify-center text-stone-400 gap-3">
              <div className="w-9 h-9 border-3 border-stone-900 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-stone-600">
                Conectando ao Firebird 5.0 (200.150.193.41:3050) em modo Read-Only...
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-14 text-center text-stone-400 text-xs">
              Nenhum título encontrado para os filtros selecionados.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-9">
                    <button
                      type="button"
                      onClick={toggleSelectAllVisible}
                      className="flex items-center justify-center text-stone-600 hover:text-stone-900 cursor-pointer"
                      title="Selecionar/Desmarcar visíveis"
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="w-4 h-4 text-stone-900" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Origem / Ação</th>
                  <th className="py-2.5 px-3">Favorecido (GEMP → Nosso Sistema)</th>
                  <th className="py-2.5 px-3">Embarcação / Vaga</th>
                  <th className="py-2.5 px-3">Descrição / Itens Faturados</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredItems.slice(0, 500).map((item: any) => {
                  const isSelected = selectedIds.has(item.id);
                  const hasLocalLink = Boolean(item.clienteId || item.fornecedorId);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-stone-50'
                      }`}
                    >
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className="flex items-center justify-center cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-stone-900" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400" />
                          )}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.origemEmpresa === 'MEXICANO'
                                ? 'bg-stone-900 text-white'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {item.origemEmpresa === 'MEXICANO' ? 'MEXICANO' : 'VALE ADM'}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              item.acaoSincronizacao === 'novo'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : item.acaoSincronizacao === 'atualizar'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-stone-100 text-stone-500'
                            }`}
                          >
                            {item.acaoSincronizacao === 'novo'
                              ? 'Novo'
                              : item.acaoSincronizacao === 'atualizar'
                              ? 'Atualizar'
                              : 'Sincronizado'}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          #{item.gempId} {item.documento > 0 ? `• Doc ${item.documento}` : ''}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-stone-900 truncate max-w-[230px]">
                          {item.gempFavorecidoNome}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {item.gempFavorecidoDoc && (
                            <span className="text-[10px] font-mono text-stone-400">
                              {item.gempFavorecidoDoc}
                            </span>
                          )}
                          {hasLocalLink ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                              <UserCheck className="w-2.5 h-2.5" /> Vinculado
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                              Apenas GEMP (Metadata)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        {item.embarcacaoNomeLocal ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            <Ship className="w-3 h-3" /> {item.embarcacaoNomeLocal}
                          </span>
                        ) : item.gempEmbarcacaoVaga ? (
                          <span className="text-[11px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md inline-block truncate max-w-[160px]">
                            {item.gempEmbarcacaoVaga}
                          </span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              item.tipo === 'receita'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {item.tipo === 'receita' ? 'Receber' : 'Pagar'}
                          </span>
                          <span className="font-semibold text-stone-800">{item.categoria}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 truncate max-w-[280px] mt-0.5" title={item.descricao}>
                          {item.gempDescricaoOriginal || item.descricao}
                          {item.gempServicosItens ? ` • ${item.gempServicosItens}` : ''}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-stone-800">
                          {new Date(item.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                            item.status === 'pago'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.status === 'vencido'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.status === 'pago'
                            ? 'Quitado'
                            : item.status === 'vencido'
                            ? 'Vencido'
                            : 'Em Aberto'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-bold tabular-nums ${
                            item.tipo === 'receita' ? 'text-stone-900' : 'text-rose-700'
                          }`}
                        >
                          {item.tipo === 'despesa' ? '- ' : ''}
                          {formatBRL(item.valor)}
                        </span>
                        {item.gempReferenciaParcela && (
                          <div className="text-[10px] text-stone-400">{item.gempReferenciaParcela}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {filteredItems.length > 500 && (
            <div className="p-3 text-center text-xs text-stone-500 bg-stone-50 border-t border-stone-200">
              Exibindo os primeiros 500 registros na tabela para performance visual ({filteredItems.length} filtrados no total). Todos os {selectedIds.size} selecionados serão importados.
            </div>
          )}
        </div>

        {/* Footer com Classificação Opcional e Botão de Importação */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={contaBancariaIdPadrao}
              onChange={(e) => setContaBancariaIdPadrao(e.target.value)}
              className="h-9 px-2.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-700"
            >
              <option value="">Conta Bancária Padrão (Opcional)</option>
              {contasBancarias.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.empresa})
                </option>
              ))}
            </select>

            <select
              value={centroCustoIdPadrao}
              onChange={(e) => setCentroCustoIdPadrao(e.target.value)}
              className="h-9 px-2.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-700"
            >
              <option value="">Centro de Custo Padrão (Opcional)</option>
              {centrosDeCusto.map((cc: any) => (
                <option key={cc.id} value={cc.id}>
                  {cc.nome} ({cc.empresa})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing || selectedIds.size === 0}
              className="h-9 px-5 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>
                {importing
                  ? 'Importando para o Sistema...'
                  : `Importar ${selectedIds.size} Lançamento(s) do GEMP`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
