import React, { useState, useEffect } from 'react';
import Select from "react-select";
import {
  X, Check, DollarSign, Calendar, FileText, Wallet,
  Repeat, CreditCard, ChevronDown, ListPlus, Receipt,
  TrendingUp, TrendingDown, Building2, User, Anchor,
  Sliders, Plus, Loader2
} from 'lucide-react';
import { TransacaoFinanceira } from '../../types';

interface FinanceLancamentoDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (lancamentos: Partial<TransacaoFinanceira>[]) => void;
  editingItem?: Partial<TransacaoFinanceira> | null;
  defaultEmpresa?: string;
  clientes?: any[];
  fornecedores?: any[];
  planosContas?: any[];
  centrosCusto?: any[];
  contasBancarias?: any[];
  embarcacoes?: any[];
}

type LancamentoTabId = 'valores' | 'classificacao' | 'vinculos' | 'repeticao';

export default function FinanceLancamentoDrawer({
  open,
  onClose,
  onSave,
  editingItem = null,
  defaultEmpresa = 'Todos',
  clientes = [],
  fornecedores = [],
  planosContas = [],
  centrosCusto = [],
  contasBancarias = [],
  embarcacoes = []
}: FinanceLancamentoDrawerProps) {
  const [activeTab, setActiveTab] = useState<LancamentoTabId>('valores');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita');
  const [empresa, setEmpresa] = useState(defaultEmpresa === 'Todos' ? 'Mexicano' : defaultEmpresa);

  const [valor, setValor] = useState<string>('');
  const [vencimento, setVencimento] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState('');
  const [planoContasId, setPlanoContasId] = useState("");
  const [centroCustoId, setCentroCustoId] = useState("");
  const [descricao, setDescricao] = useState('');

  const [clienteId, setClienteId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [embarcacaoId, setEmbarcacaoId] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState('');

  const [isRepetir, setIsRepetir] = useState(false);
  const [modoRepeticao, setModoRepeticao] = useState<'parcelado' | 'recorrente'>('parcelado');
  const [qtdParcelas, setQtdParcelas] = useState<number>(2);
  const [frequencia, setFrequencia] = useState<'mensal' | 'semanal'>('mensal');
  const [qtdRecorrencias, setQtdRecorrencias] = useState<number>(12);
  const [diaVencimentoRecorrente, setDiaVencimentoRecorrente] = useState<number>(new Date().getDate());

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab('valores');
      if (editingItem) {
        setTipo(editingItem.tipo as 'receita' | 'despesa' || 'receita');
        setEmpresa(editingItem.empresa || (defaultEmpresa === 'Todos' ? 'Mexicano' : defaultEmpresa));

        let numFormat = (Number(editingItem.valor) || 0).toFixed(2).replace('.', ',');
        numFormat = numFormat.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setValor(numFormat);

        setVencimento(editingItem.dataVencimento || new Date().toISOString().split('T')[0]);
        setCategoria(editingItem.categoria || '');
        setPlanoContasId(editingItem.planoContasId || '');
        setCentroCustoId(editingItem.centroCustoId || '');
        setDescricao(editingItem.descricao || '');
        setClienteId(editingItem.clienteId || '');
        setFornecedorId(editingItem.fornecedorId || '');
        setEmbarcacaoId(editingItem.embarcacaoId || '');
        setContaBancariaId(editingItem.contaBancariaId || '');
        setIsRepetir(false);
        setModoRepeticao('parcelado');
        setQtdParcelas(2);
        setFrequencia('mensal');
        setQtdRecorrencias(12);
        setDiaVencimentoRecorrente(new Date().getDate());
      } else {
        setTipo('receita');
        setEmpresa(defaultEmpresa === 'Todos' ? 'Mexicano' : defaultEmpresa);
        setValor('');
        setVencimento(new Date().toISOString().split('T')[0]);
        setCategoria('');
        setPlanoContasId('');
        setCentroCustoId('');
        setDescricao('');
        setClienteId('');
        setFornecedorId('');
        setEmbarcacaoId('');
        setContaBancariaId('');
        setIsRepetir(false);
        setModoRepeticao('parcelado');
        setQtdParcelas(2);
        setFrequencia('mensal');
        setQtdRecorrencias(12);
        setDiaVencimentoRecorrente(new Date().getDate());
      }
    }
  }, [open, editingItem, defaultEmpresa]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const rawValue = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;

  // Split calculation
  const getParcelas = () => {
    if (!isRepetir || modoRepeticao !== 'parcelado' || qtdParcelas < 2 || rawValue <= 0) return [];
    const baseDate = new Date(vencimento + 'T12:00:00');
    const parcelas = [];
    const valParcela = Number((rawValue / qtdParcelas).toFixed(2));
    let diff = Number((rawValue - (valParcela * qtdParcelas)).toFixed(2));

    for (let i = 0; i < qtdParcelas; i++) {
      const pDate = new Date(baseDate);
      if (frequencia === 'mensal') {
        pDate.setMonth(pDate.getMonth() + i);
      } else {
        pDate.setDate(pDate.getDate() + (i * 7));
      }

      let currentVal = valParcela;
      if (i === 0 && diff !== 0) {
        currentVal = Number((valParcela + diff).toFixed(2));
      }

      parcelas.push({
        numero: i + 1,
        dataVencimento: pDate.toISOString().split('T')[0],
        valor: currentVal
      });
    }
    return parcelas;
  };

  const buildDateWithFixedDay = (base: Date, monthOffset: number, fixedDay: number) => {
    const targetMonth = base.getMonth() + monthOffset;
    const year = base.getFullYear() + Math.floor(targetMonth / 12);
    const month = ((targetMonth % 12) + 12) % 12;
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(fixedDay, lastDayOfMonth);
    return new Date(year, month, clampedDay, 12, 0, 0);
  };

  const getRecorrencias = () => {
    if (!isRepetir || modoRepeticao !== 'recorrente' || qtdRecorrencias < 1 || rawValue <= 0) return [];
    const baseDate = new Date(vencimento + 'T12:00:00');
    const list = [];

    for (let i = 0; i < qtdRecorrencias; i++) {
      const pDate = buildDateWithFixedDay(baseDate, i, diaVencimentoRecorrente);
      list.push({
        numero: i + 1,
        dataVencimento: pDate.toISOString().split('T')[0],
        valor: rawValue
      });
    }
    return list;
  };

  const parcelas = getParcelas();
  const recorrencias = getRecorrencias();

  const handleSave = () => {
    if (!descricao.trim()) {
      alert("Informe uma descrição para o lançamento.");
      setActiveTab('valores');
      return;
    }
    if (rawValue <= 0) {
      alert("Informe um valor válido maior que zero.");
      setActiveTab('valores');
      return;
    }
    if (!planoContasId) {
      alert("Selecione um Plano de Contas na aba Classificação.");
      setActiveTab('classificacao');
      return;
    }

    const selectedPlano = planosContas.find(p => p.id === planoContasId);
    const resolvedCategoria = selectedPlano ? selectedPlano.descricao : (categoria || 'Geral');

    if (editingItem) {
      onSave([{
        ...editingItem,
        tipo,
        empresa,
        valor: rawValue,
        dataVencimento: vencimento,
        categoria: resolvedCategoria,
        planoContasId,
        centroCustoId,
        descricao,
        clienteId: tipo === 'receita' ? clienteId : undefined,
        fornecedorId: tipo === 'despesa' ? fornecedorId : undefined,
        embarcacaoId,
        contaBancariaId
      }]);
    } else if (isRepetir && modoRepeticao === 'parcelado') {
      const lancamentos = parcelas.map(p => ({
        tipo,
        empresa,
        valor: p.valor,
        dataVencimento: p.dataVencimento,
        categoria: resolvedCategoria,
        planoContasId,
        centroCustoId,
        descricao: `${descricao} (${p.numero}/${qtdParcelas})`,
        clienteId: tipo === 'receita' ? clienteId : undefined,
        fornecedorId: tipo === 'despesa' ? fornecedorId : undefined,
        embarcacaoId,
        contaBancariaId,
        status: 'lancado' as const,
        numeroParcela: p.numero,
        totalParcelas: qtdParcelas,
        grupoParcelamentoId: `GRP-${Date.now()}`
      }));
      onSave(lancamentos as any);
    } else if (isRepetir && modoRepeticao === 'recorrente') {
      const lancamentos = [];
      const baseDate = new Date(vencimento + 'T12:00:00');
      const grupoId = `GRP-REC-${Date.now()}`;

      for (let i = 0; i < qtdRecorrencias; i++) {
        const pDate = buildDateWithFixedDay(baseDate, i, diaVencimentoRecorrente);
        lancamentos.push({
          tipo,
          empresa,
          valor: rawValue,
          dataVencimento: pDate.toISOString().split('T')[0],
          categoria: resolvedCategoria,
          planoContasId,
          centroCustoId,
          descricao: `${descricao} (${i + 1}/${qtdRecorrencias})`,
          clienteId: tipo === 'receita' ? clienteId : undefined,
          fornecedorId: tipo === 'despesa' ? fornecedorId : undefined,
          embarcacaoId,
          contaBancariaId,
          status: 'lancado' as const,
          numeroParcela: i + 1,
          totalParcelas: qtdRecorrencias,
          grupoParcelamentoId: grupoId
        });
      }
      onSave(lancamentos as any);
    } else {
      onSave([{
        tipo,
        empresa,
        valor: rawValue,
        dataVencimento: vencimento,
        categoria: resolvedCategoria,
        planoContasId,
        centroCustoId,
        descricao,
        clienteId: tipo === 'receita' ? clienteId : undefined,
        fornecedorId: tipo === 'despesa' ? fornecedorId : undefined,
        embarcacaoId,
        contaBancariaId,
        status: 'lancado' as const
      }]);
    }
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (!v) { setValor(''); return; }

    let num = (parseInt(v, 10) / 100).toFixed(2);
    let str = num.replace('.', ',');
    str = str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setValor(str);
  };

  const selectCustomStyles = {
    control: (base: any) => ({
      ...base,
      borderRadius: '0.75rem',
      padding: '0.125rem 0.25rem',
      borderColor: '#e7e5e4',
      backgroundColor: '#ffffff',
      boxShadow: 'none',
      fontSize: '0.75rem',
      fontWeight: 600,
      '&:hover': { borderColor: '#a8a29e' }
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      zIndex: 9999,
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
      border: '1px solid #e7e5e4',
      fontSize: '0.75rem'
    }),
    option: (base: any, { isFocused }: any) => ({
      ...base,
      backgroundColor: isFocused ? '#f5f5f4' : 'white',
      color: '#1c1917',
      fontWeight: 500
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
  };

  const TABS = [
    {
      id: 'valores' as LancamentoTabId,
      label: 'Natureza & Valores',
      icon: DollarSign,
      desc: 'Defina receita ou despesa, valor monetário, vencimento e descrição principal'
    },
    {
      id: 'classificacao' as LancamentoTabId,
      label: 'Classificação Contábil',
      icon: ListPlus,
      desc: 'Vincule o plano de contas gerencial, centro de custo e empresa'
    },
    {
      id: 'vinculos' as LancamentoTabId,
      label: 'Vínculos & Entidades',
      icon: Building2,
      desc: 'Defina cliente titular, fornecedor, conta bancária e embarcação vinculada'
    },
    {
      id: 'repeticao' as LancamentoTabId,
      label: 'Parcelar ou Repetir',
      icon: Repeat,
      desc: 'Configure parcelamentos fixos ou recorrências mensais automáticas',
      badge: !editingItem && isRepetir ? (modoRepeticao === 'parcelado' ? `${qtdParcelas}x` : `${qtdRecorrencias}m`) : undefined
    }
  ];

  const currentTabMeta = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ─── MODAL CONTAINER (Padrão Split View da Referência Comercial) ─── */}
      <div
        className="bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-stone-200/80 w-full max-w-4xl h-[90vh] max-h-[680px] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={editingItem ? 'Editar Lançamento' : 'Novo Lançamento'}
      >
        {/* ================= COLUNA LATERAL ESQUERDA ================= */}
        <aside className="w-full md:w-72 bg-stone-50/70 border-b md:border-b-0 md:border-r border-stone-200/70 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            
            {/* Cabeçalho da Coluna Esquerda */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center justify-center shrink-0 ${
                  tipo === 'receita' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {tipo === 'receita' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <h3 className="font-bold text-[14px] text-stone-900 tracking-tight">
                  {editingItem ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h3>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                {editingItem
                  ? 'Atualização de valores, plano de contas e entidades vinculadas.'
                  : 'Cadastre receitas ou despesas com conciliação contábil e parcelamento.'}
              </p>
            </div>

            {/* Menu Vertical de Navegação por Pílulas */}
            <nav className="space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-stone-600" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Rodapé da Coluna Esquerda: Cartão de Prévia */}
          <div className="pt-4 border-t border-stone-200/60 space-y-2 mt-4">
            <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  tipo === 'receita' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {tipo === 'receita' ? 'Receita' : 'Despesa'}
                </span>
                <span className="text-[11px] text-stone-500 font-medium truncate max-w-[120px]">
                  {empresa}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-medium block">Valor Previsto</span>
                <span className={`text-base font-black tabular-nums ${
                  tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {tipo === 'despesa' ? '- ' : '+ '}R$ {valor || '0,00'}
                </span>
              </div>
              <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span>Vencimento:</span>
                <span className="font-bold text-stone-800">
                  {vencimento ? new Date(vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '--'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= COLUNA DIREITA: CONTEÚDO PRINCIPAL ================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Header da Coluna Direita */}
          <header className="px-6 sm:px-8 py-5 border-b border-stone-200/70 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                {currentTabMeta.label}
              </h2>
              <p className="text-xs text-stone-500 font-normal mt-0.5">
                {currentTabMeta.desc}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Área de Conteúdo Scrollável com Cards Padronizados */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 subtle-scrollbar">

            {/* TAB 1: NATUREZA & VALORES */}
            {activeTab === 'valores' && (
              <div className="space-y-4">
                <div className="bg-stone-50/60 rounded-2xl p-5 border border-stone-200/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700">Tipo de Movimentação</span>
                    <span className="text-xs text-stone-500">Selecione o fluxo do caixa</span>
                  </div>

                  <div className="flex bg-stone-200/70 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTipo('receita')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        tipo === 'receita' ? 'bg-white shadow-xs text-emerald-700' : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      Receita (+ Entrada)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipo('despesa')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        tipo === 'despesa' ? 'bg-white shadow-xs text-rose-700' : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      Despesa (- Saída)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Valor Total (R$) *
                      </label>
                      <input
                        type="text"
                        value={valor}
                        onChange={handleValorChange}
                        placeholder="0,00"
                        className={`w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-base font-bold focus:outline-hidden focus:border-stone-400 tabular-nums ${
                          tipo === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Data de Vencimento *
                      </label>
                      <input
                        type="date"
                        value={vencimento}
                        onChange={e => setVencimento(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Descrição do Lançamento *
                    </label>
                    <input
                      type="text"
                      value={descricao}
                      onChange={e => setDescricao(e.target.value)}
                      placeholder="Ex: Pagamento Fornecedor Combustível, Taxa de Condomínio..."
                      className="w-full h-10 px-3.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Empresa de Destino
                    </label>
                    <select
                      value={empresa}
                      onChange={e => setEmpresa(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-400"
                    >
                      <option value="Mexicano">Mexicano</option>
                      <option value="Vale Administradora">Vale Administradora</option>
                      <option value="Marina Velho Chico">Marina Velho Chico</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CLASSIFICAÇÃO CONTÁBIL */}
            {activeTab === 'classificacao' && (
              <div className="space-y-4">
                <div className="bg-stone-50/60 rounded-2xl p-5 border border-stone-200/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <ListPlus className="w-4 h-4 text-stone-700" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">Parâmetros Contábeis</h4>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Plano de Contas *
                    </label>
                    <Select
                      placeholder="Selecione o plano de contas..."
                      noOptionsMessage={() => "Nenhum plano encontrado"}
                      options={planosContas
                        .filter(p => !p.parentId && p.tipo === tipo)
                        .map(parent => {
                          const children = planosContas.filter(child => child.parentId === parent.id);
                          const label = parent.codigoContabil ? `${parent.codigoContabil} - ${parent.descricao}` : parent.descricao;
                          if (children.length > 0) {
                            return {
                              label,
                              options: children.map(child => ({
                                value: child.id,
                                label: child.codigoContabil ? `${child.codigoContabil} - ${child.descricao}` : child.descricao
                              }))
                            };
                          }
                          return { value: parent.id, label };
                        })}
                      value={planosContas.find(p => p.id === planoContasId) ? {
                         value: planoContasId,
                         label: planosContas.find(p => p.id === planoContasId)?.descricao
                      } : null}
                      onChange={(opt: any) => setPlanoContasId(opt?.value || "")}
                      styles={selectCustomStyles}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      classNamePrefix="react-select"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Centro de Custo
                    </label>
                    <Select
                      placeholder="Selecione o centro de custo..."
                      isClearable
                      noOptionsMessage={() => "Nenhum centro de custo ativo"}
                      options={centrosCusto
                        .filter(c => c.status === 'ativo' && (c.empresa === 'Todos' || c.empresa === empresa))
                        .map(c => ({ value: c.id, label: c.nome }))}
                      value={centrosCusto.find(c => c.id === centroCustoId) ? {
                         value: centroCustoId,
                         label: centrosCusto.find(c => c.id === centroCustoId)?.nome || ''
                      } : null}
                      onChange={(opt: any) => setCentroCustoId(opt?.value || "")}
                      styles={selectCustomStyles}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      classNamePrefix="react-select"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                      Categoria Complementar (Opcional)
                    </label>
                    <input
                      type="text"
                      value={categoria}
                      onChange={e => setCategoria(e.target.value)}
                      placeholder="Sobrescrever categoria livremente se necessário..."
                      className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: VÍNCULOS & ENTIDADES */}
            {activeTab === 'vinculos' && (
              <div className="space-y-4">
                <div className="bg-stone-50/60 rounded-2xl p-5 border border-stone-200/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-stone-700" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                      Entidades Vinculadas à Operação
                    </h4>
                  </div>

                  {tipo === 'receita' ? (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Cliente Cotista
                      </label>
                      <Select
                        placeholder="Buscar cliente cotista cadastrado..."
                        isClearable
                        noOptionsMessage={() => "Nenhum cliente encontrado"}
                        options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                        value={clientes.find(c => c.id === clienteId) ? { value: clienteId, label: clientes.find(c => c.id === clienteId)?.nome } : null}
                        onChange={(opt: any) => setClienteId(opt?.value || "")}
                        styles={selectCustomStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        classNamePrefix="react-select"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Fornecedor / Beneficiário
                      </label>
                      <Select
                        placeholder="Buscar fornecedor cadastrado..."
                        isClearable
                        noOptionsMessage={() => "Nenhum fornecedor encontrado"}
                        options={fornecedores.map(f => ({ value: f.id, label: f.nomeFantasia || f.razaoSocial || f.nome }))}
                        value={fornecedores.find(f => f.id === fornecedorId) ? { value: fornecedorId, label: fornecedores.find(f => f.id === fornecedorId)?.nomeFantasia || fornecedores.find(f => f.id === fornecedorId)?.nome } : null}
                        onChange={(opt: any) => setFornecedorId(opt?.value || "")}
                        styles={selectCustomStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        classNamePrefix="react-select"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Conta Bancária
                      </label>
                      <Select
                        placeholder="Conta bancária de liquidação..."
                        isClearable
                        noOptionsMessage={() => "Nenhuma conta cadastrada"}
                        options={contasBancarias.map(c => ({ value: c.id, label: `${c.nome} ${c.banco ? `(${c.banco})` : ''}` }))}
                        value={contasBancarias.find(c => c.id === contaBancariaId) ? { value: contaBancariaId, label: contasBancarias.find(c => c.id === contaBancariaId)?.nome } : null}
                        onChange={(opt: any) => setContaBancariaId(opt?.value || "")}
                        styles={selectCustomStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        classNamePrefix="react-select"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                        Embarcação Vinculada
                      </label>
                      <Select
                        placeholder="Embarcação (opcional)..."
                        isClearable
                        noOptionsMessage={() => "Nenhuma embarcação"}
                        options={embarcacoes.map(e => ({ value: e.id, label: e.nome }))}
                        value={embarcacoes.find(e => e.id === embarcacaoId) ? { value: embarcacaoId, label: embarcacoes.find(e => e.id === embarcacaoId)?.nome } : null}
                        onChange={(opt: any) => setEmbarcacaoId(opt?.value || "")}
                        styles={selectCustomStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        classNamePrefix="react-select"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PARCELAMENTO & REPETIÇÃO */}
            {activeTab === 'repeticao' && (
              <div className="space-y-4">
                {editingItem ? (
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-500">
                    O parcelamento e repetição em lote só estão disponíveis ao cadastrar novos lançamentos. Para lançamentos existentes, os valores são atualizados diretamente.
                  </div>
                ) : (
                  <div className="bg-stone-50/60 rounded-2xl p-5 border border-stone-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">Repetir ou Parcelar</h4>
                        <p className="text-xs text-stone-500">Gera múltiplos lançamentos programados de forma automática</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsRepetir(!isRepetir)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          isRepetir ? 'bg-emerald-600' : 'bg-stone-300'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-xs transition-transform ${
                            isRepetir ? 'left-[22px]' : 'left-[2px]'
                          }`}
                        />
                      </button>
                    </div>

                    {isRepetir && (
                      <div className="space-y-4 pt-2 border-t border-stone-200/80">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                              Modo de Repetição
                            </label>
                            <select
                              value={modoRepeticao}
                              onChange={e => setModoRepeticao(e.target.value as any)}
                              className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-400"
                            >
                              <option value="parcelado">Parcelado (Divide o valor total)</option>
                              <option value="recorrente">Recorrente (Repete o valor a cada mês)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                              Frequência
                            </label>
                            <select
                              value={frequencia}
                              onChange={e => setFrequencia(e.target.value as any)}
                              className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-400"
                            >
                              <option value="mensal">Mensal</option>
                              <option value="semanal">Semanal</option>
                            </select>
                          </div>
                        </div>

                        {modoRepeticao === 'parcelado' && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                              Quantidade de Parcelas
                            </label>
                            <div className="flex bg-white rounded-xl border border-stone-200 overflow-hidden w-36">
                              <button
                                type="button"
                                onClick={() => setQtdParcelas(Math.max(2, qtdParcelas - 1))}
                                className="px-3 hover:bg-stone-50 font-bold text-stone-700 flex-1 border-r border-stone-200 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="flex-1 text-center py-2 text-xs font-bold text-stone-900">
                                {qtdParcelas}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQtdParcelas(Math.min(48, qtdParcelas + 1))}
                                className="px-3 hover:bg-stone-50 font-bold text-stone-700 flex-1 border-l border-stone-200 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                        {modoRepeticao === 'recorrente' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                                Quantidade de Meses
                              </label>
                              <div className="flex bg-white rounded-xl border border-stone-200 overflow-hidden w-36">
                                <button
                                  type="button"
                                  onClick={() => setQtdRecorrencias(Math.max(1, qtdRecorrencias - 1))}
                                  className="px-3 hover:bg-stone-50 font-bold text-stone-700 flex-1 border-r border-stone-200 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="flex-1 text-center py-2 text-xs font-bold text-stone-900">
                                  {qtdRecorrencias}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setQtdRecorrencias(Math.min(48, qtdRecorrencias + 1))}
                                  className="px-3 hover:bg-stone-50 font-bold text-stone-700 flex-1 border-l border-stone-200 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                                Dia de Vencimento Fixo
                              </label>
                              <div className="flex items-center gap-2">
                                <select
                                  value={diaVencimentoRecorrente}
                                  onChange={e => setDiaVencimentoRecorrente(Number(e.target.value))}
                                  className="w-24 h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-900 focus:outline-hidden focus:border-stone-400"
                                >
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                    <option key={d} value={d}>Dia {String(d).padStart(2, '0')}</option>
                                  ))}
                                </select>
                                <span className="text-xs text-stone-500">de cada mês</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Prévia dos registros gerados */}
                        {parcelas.length > 0 && modoRepeticao === 'parcelado' && (
                          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                            <div className="px-3.5 py-2 bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                              Pré-visualização do Plano ({parcelas.length} parcelas)
                            </div>
                            <div className="max-h-40 overflow-y-auto subtle-scrollbar divide-y divide-stone-100 text-xs">
                              {parcelas.map((p, idx) => (
                                <div key={idx} className="px-3.5 py-1.5 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 bg-stone-100 text-stone-600 rounded text-[10px] font-bold flex items-center justify-center">
                                      {p.numero}
                                    </span>
                                    <span className="text-stone-700 font-medium">
                                      {new Date(p.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                  <span className="font-bold text-stone-900 tabular-nums">
                                    R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {recorrencias.length > 0 && modoRepeticao === 'recorrente' && (
                          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                            <div className="px-3.5 py-2 bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                              Pré-visualização da Recorrência ({recorrencias.length} meses)
                            </div>
                            <div className="max-h-40 overflow-y-auto subtle-scrollbar divide-y divide-stone-100 text-xs">
                              {recorrencias.map((p, idx) => (
                                <div key={idx} className="px-3.5 py-1.5 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold flex items-center justify-center">
                                      {p.numero}
                                    </span>
                                    <span className="text-stone-700 font-medium">
                                      {new Date(p.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                  <span className="font-bold text-stone-900 tabular-nums">
                                    R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer da Coluna Direita com Botões Padronizados */}
          <footer className="px-6 sm:px-8 py-4 bg-stone-50/70 border-t border-stone-200/70 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {editingItem ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}

// Alias para exportação com nome alternativo de modal
export { FinanceLancamentoDrawer as FinanceLancamentoModal };
