import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Select from "react-select";
import {
  X, Check, DollarSign, Calendar, FileText, Wallet,
  Repeat, CreditCard, ChevronDown, ListPlus, Receipt,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { TransacaoFinanceira } from '../../types';

interface FinanceLancamentoDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (lancamentos: Partial<TransacaoFinanceira>[]) => void;
  defaultEmpresa?: string;
  clientes?: any[];
  fornecedores?: any[];
  planosContas?: any[];
  
  centrosCusto?: any[];
  contasBancarias?: any[];
  embarcacoes?: any[];
}

export default function FinanceLancamentoDrawer({
  open,
  onClose,
  onSave,
  defaultEmpresa = 'Todos',
  clientes = [],
  fornecedores = [],
  planosContas = [],
  
  centrosCusto = [],
  contasBancarias = [],
  embarcacoes = []
}: FinanceLancamentoDrawerProps) {
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

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
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
    }
  }, [open, defaultEmpresa]);

  const rawValue = parseFloat(valor.replace(/\./g,'').replace(',','.')) || 0;

  // Generate Preview
  const parcelas = React.useMemo(() => {
    if (!isRepetir || modoRepeticao !== 'parcelado' || qtdParcelas <= 1 || rawValue <= 0) return [];

    // Split equally
    let baseValue = Math.floor((rawValue / qtdParcelas) * 100) / 100;
    const diff = Math.round((rawValue - (baseValue * qtdParcelas)) * 100) / 100;

    const parts = [];
    const baseDate = new Date(vencimento + 'T12:00:00');

    for (let i = 0; i < qtdParcelas; i++) {
       let pValue = baseValue;
       if (i === 0) pValue += diff; // Add remainder to first parcel

       let pDate = new Date(baseDate);
       if (frequencia === 'mensal') {
         pDate.setMonth(pDate.getMonth() + i);
       } else {
         pDate.setDate(pDate.getDate() + (i * 7));
       }

       parts.push({
         numero: i + 1,
         dataVencimento: pDate.toISOString().split('T')[0],
         valor: pValue
       });
    }
    return parts;
  }, [isRepetir, modoRepeticao, qtdParcelas, frequencia, vencimento, rawValue]);

  const handleSave = () => {
    if (!valor || !vencimento || !planoContasId || !descricao) {
      alert('Preencha os campos obrigatórios (Valor, Data, Plano de Contas, Descrição)');
      return;
    }

    if (isRepetir && modoRepeticao === 'parcelado' && parcelas.length > 0) {
      const lancamentos = parcelas.map(p => ({
        tipo,
        empresa,
        valor: p.valor,
        dataVencimento: p.dataVencimento,
        categoria: "",
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
      const maxLancs = 12; // Example pre-generate 12 months

      for(let i=0; i<maxLancs; i++) {
         let pDate = new Date(baseDate);
         pDate.setMonth(pDate.getMonth() + i);
         lancamentos.push({
            tipo, empresa, valor: rawValue,
            dataVencimento: pDate.toISOString().split('T')[0],
            categoria: "", planoContasId, centroCustoId, descricao: descricao,
            clienteId: tipo === 'receita' ? clienteId : undefined,
            fornecedorId: tipo === 'despesa' ? fornecedorId : undefined,
            embarcacaoId, contaBancariaId,
            status: 'lancado' as const,
         });
      }
      onSave(lancamentos as any);
    } else {
      onSave([{
        tipo, empresa, valor: rawValue, dataVencimento: vencimento,
        categoria: "", planoContasId, centroCustoId, descricao, clienteId: tipo === 'receita' ? clienteId : undefined,
        fornecedorId: tipo === 'despesa' ? fornecedorId : undefined,
        embarcacaoId, contaBancariaId,
        status: 'lancado' as const
      }]);
    }
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g,'');
    if (!v) { setValor(''); return; }

    let num = (parseInt(v, 10) / 100).toFixed(2);
    let str = num.replace('.', ',');
    str = str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setValor(str);
  };

  return (
    <AnimatePresence>
      {open && (
        <React.Fragment>
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
            onClick={onClose}
          />

          {/* Side-Over Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-[540px] bg-[#f5f5f7] shadow-2xl z-[100] flex flex-col border-l border-white/50"
          >
            {/* Header */}
            <div className="px-8 py-6 bg-white/70 backdrop-blur-xl border-b border-black/[0.04] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tipo === 'receita' ? 'bg-[#008f5d]/10' : 'bg-[#e30000]/10'}`}>
                  {tipo === 'receita' ? <TrendingUp className="w-5 h-5 text-[#008f5d]" /> : <TrendingDown className="w-5 h-5 text-[#e30000]" />}
                </div>
                <div>
                  <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight">Novo Lançamento</h2>
                  <p className="text-[13px] font-medium text-[#86868b]">Cadastre uma nova transação</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#e5e5ea] flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-8 space-y-8">

                {/* 1. Tipo & Empresa Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">Natureza</h3>
                  </div>
                  <div className="flex bg-[#e5e5ea] p-1 rounded-xl">
                    <button
                      onClick={() => setTipo('receita')}
                      className={`flex-1 py-2 text-[14px] font-semibold rounded-lg transition-all ${tipo === 'receita' ? 'bg-white shadow-sm text-[#008f5d]' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                    >
                      Receita
                    </button>
                    <button
                      onClick={() => setTipo('despesa')}
                      className={`flex-1 py-2 text-[14px] font-semibold rounded-lg transition-all ${tipo === 'despesa' ? 'bg-white shadow-sm text-[#e30000]' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                    >
                      Despesa
                    </button>
                  </div>

                  <div className="pt-2">
                     <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Empresa Destino</label>
                     <select
                       value={empresa}
                       onChange={e => setEmpresa(e.target.value)}
                       className="w-full bg-white border border-[#d2d2d7] rounded-xl px-4 py-3 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 transition-shadow appearance-none"
                     >
                       <option value="Mexicano">Mexicano</option>
                       <option value="Vale Administradora">Vale Administradora</option>
                       <option value="Marina Velho Chico">Marina Velho Chico</option>
                     </select>
                  </div>
                </div>

                {/* 2. Valores e Datas */}
                <div className="bg-white rounded-2xl p-6 border border-black/[0.04] shadow-sm space-y-5">
                   <h3 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight flex items-center gap-2">
                     <DollarSign className="w-4 h-4 text-[#86868b]" /> Dados Principais
                   </h3>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Valor Total (R$)*</label>
                       <input
                         type="text"
                         value={valor}
                         onChange={handleValorChange}
                         placeholder="0,00"
                         className={`w-full bg-[#f5f5f7] border border-transparent rounded-xl px-4 py-3 text-[17px] font-semibold focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10 transition-all ${tipo === 'receita' ? 'text-[#008f5d]' : 'text-[#e30000]'}`}
                       />
                     </div>
                     <div>
                       <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Vencimento*</label>
                       <input
                         type="date"
                         value={vencimento}
                         onChange={e => setVencimento(e.target.value)}
                         className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-4 py-3 text-[15px] font-medium text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0071e3] transition-all"
                       />
                     </div>
                   </div>

                   <div>
                     <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Descrição do Lançamento*</label>
                     <input
                       type="text"
                       value={descricao}
                       onChange={e => setDescricao(e.target.value)}
                       placeholder="Ex: Pagamento Fornecedor XYZ"
                       className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-4 py-3 text-[15px] font-medium text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0071e3] transition-all"
                     />
                   </div>
                </div>

                {/* 3. Classificação */}
                <div className="bg-white rounded-2xl p-6 border border-black/[0.04] shadow-sm space-y-5">
                   <h3 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight flex items-center gap-2">
                     <ListPlus className="w-4 h-4 text-[#86868b]" /> Classificação
                   </h3>

                   <div className="grid grid-cols-1 gap-4">
                     <div>
                       <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Plano de Contas*</label>
                       <Select
                         placeholder="Selecione o plano..."
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
                         styles={{
                           control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                           menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                           option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' }),
                           menuPortal: (base) => ({ ...base, zIndex: 9999 })
                         }}
                         menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                         classNamePrefix="react-select"
                       />
                       
                       <label className="block text-[13px] font-medium text-[#86868b] mt-4 mb-1.5 ml-1">Centro de Custo</label>
                       <Select
                         placeholder="Selecione o centro de custo..."
                         isClearable
                         noOptionsMessage={() => "Nenhum centro de custo"}
                         options={centrosCusto
                           .filter(c => c.status === 'ativo' && (c.empresa === 'Todos' || c.empresa === empresa))
                           .map(c => ({ value: c.id, label: c.nome }))}
                         value={centrosCusto.find(c => c.id === centroCustoId) ? {
                            value: centroCustoId,
                            label: centrosCusto.find(c => c.id === centroCustoId)?.nome || ''
                         } : null}
                         onChange={(opt: any) => setCentroCustoId(opt?.value || "")}
                         styles={{
                           control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                           menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                           option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' }),
                           menuPortal: (base) => ({ ...base, zIndex: 9999 })
                         }}
                         menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                         classNamePrefix="react-select"
                       />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       {tipo === 'receita' ? (
                         <div>
                           <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Cliente</label>
                           <Select
                             placeholder="Opcional..."
                             isClearable
                             noOptionsMessage={() => "Nenhum cliente"}
                             options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                             value={clientes.find(c => c.id === clienteId) ? { value: clienteId, label: clientes.find(c => c.id === clienteId)?.nome } : null}
                             onChange={(opt: any) => setClienteId(opt?.value || "")}
                             styles={{
                               control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                               menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                               option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' }),
                               menuPortal: (base) => ({ ...base, zIndex: 9999 })
                             }}
                             menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                             classNamePrefix="react-select"
                           />
                         </div>
                       ) : (
                         <div>
                           <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Fornecedor</label>
                           <Select
                             placeholder="Opcional..."
                             isClearable
                             noOptionsMessage={() => "Nenhum fornecedor"}
                             options={fornecedores.map(f => ({ value: f.id, label: f.nome }))}
                             value={fornecedores.find(f => f.id === fornecedorId) ? { value: fornecedorId, label: fornecedores.find(f => f.id === fornecedorId)?.nome } : null}
                             onChange={(opt: any) => setFornecedorId(opt?.value || "")}
                             styles={{
                               control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                               menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                               option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' }),
                               menuPortal: (base) => ({ ...base, zIndex: 9999 })
                             }}
                             menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                             classNamePrefix="react-select"
                           />
                         </div>
                       )}

                       <div>
                         <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Conta Bancária</label>
                         <Select
                             placeholder="Nenhuma..."
                             isClearable
                             noOptionsMessage={() => "Nenhuma conta"}
                             options={contasBancarias.map(c => ({ value: c.id, label: c.nome + (c.banco ? ' - ' + c.banco : '') }))}
                             value={contasBancarias.find(c => c.id === contaBancariaId) ? { value: contaBancariaId, label: contasBancarias.find(c => c.id === contaBancariaId)?.nome } : null}
                             onChange={(opt: any) => setContaBancariaId(opt?.value || "")}
                             styles={{
                               control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.25rem', borderColor: 'transparent', backgroundColor: '#f5f5f7', boxShadow: 'none', '&:hover': { borderColor: 'transparent' } }),
                               menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 9999 }),
                               option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f0f0f5' : 'white', color: '#1d1d1f' }),
                               menuPortal: (base) => ({ ...base, zIndex: 9999 })
                             }}
                             menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                             classNamePrefix="react-select"
                           />
                       </div>
                     </div>
                   </div>
                </div>

                {/* 4. Split / Parcelamento */}
                <div className={`rounded-2xl transition-all duration-300 ${isRepetir ? 'bg-[#f0f4ff] border border-[#0071e3]/20 shadow-sm' : 'bg-transparent border border-[#d2d2d7]/50 border-dashed hover:border-[#0071e3]/50 hover:bg-[#f0f4ff]/50'}`}>
                  <button
                    onClick={() => setIsRepetir(!isRepetir)}
                    className="w-full px-6 py-4 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 text-[#1d1d1f]">
                      <div className={`p-2 rounded-full transition-colors ${isRepetir ? 'bg-[#0071e3] text-white' : 'bg-[#e5e5ea] text-[#86868b] group-hover:text-[#0071e3]'}`}>
                        <Repeat className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-[15px]">Repetir ou Parcelar</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors duration-300 relative ${isRepetir ? 'bg-[#34c759]' : 'bg-[#d2d2d7]'}`}>
                      <motion.div
                         layout
                         className="w-5 h-5 bg-white rounded-full absolute top-[2px] shadow-sm"
                         animate={{ left: isRepetir ? 'calc(100% - 22px)' : '2px' }}
                         transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isRepetir && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 border-t border-[#0071e3]/10">
                           <div className="grid grid-cols-2 gap-4 mb-5">
                             <div>
                               <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Modo</label>
                               <select
                                 value={modoRepeticao}
                                 onChange={e => setModoRepeticao(e.target.value as any)}
                                 className="w-full bg-white border border-[#0071e3]/20 rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 appearance-none"
                               >
                                 <option value="parcelado">Parcelado (Divide o valor)</option>
                                 <option value="recorrente">Recorrente (Repete o valor)</option>
                               </select>
                             </div>
                             <div>
                               <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Frequência</label>
                               <select
                                 value={frequencia}
                                 onChange={e => setFrequencia(e.target.value as any)}
                                 className="w-full bg-white border border-[#0071e3]/20 rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 appearance-none"
                               >
                                 <option value="mensal">Mensal</option>
                                 <option value="semanal">Semanal</option>
                               </select>
                             </div>
                           </div>

                           {modoRepeticao === 'parcelado' && (
                             <div className="mb-5">
                               <label className="block text-[13px] font-medium text-[#86868b] mb-1.5 ml-1">Número de Parcelas</label>
                               <div className="flex bg-white rounded-xl border border-[#0071e3]/20 overflow-hidden w-32">
                                 <button onClick={() => setQtdParcelas(Math.max(2, qtdParcelas - 1))} className="px-3 hover:bg-[#f5f5f7] font-semibold text-[#1d1d1f] flex-1 border-r border-[#0071e3]/10">-</button>
                                 <span className="flex-1 text-center py-2 text-[14px] font-semibold text-[#1d1d1f]">{qtdParcelas}</span>
                                 <button onClick={() => setQtdParcelas(Math.min(48, qtdParcelas + 1))} className="px-3 hover:bg-[#f5f5f7] font-semibold text-[#1d1d1f] flex-1 border-l border-[#0071e3]/10">+</button>
                               </div>
                             </div>
                           )}

                           {/* Preview Render */}
                           {(parcelas.length > 0 && rawValue > 0 && modoRepeticao === 'parcelado') && (
                             <div className="bg-white rounded-xl border border-[#0071e3]/20 overflow-hidden">
                               <div className="px-4 py-2 bg-[#f8fbff] border-b border-[#0071e3]/10 text-[12px] font-semibold text-[#0071e3] uppercase tracking-wider">
                                 Pré-visualização ({parcelas.length} parcelas)
                               </div>
                               <div className="max-h-[160px] overflow-y-auto">
                                 {parcelas.map((p, idx) => (
                                   <div key={idx} className="flex justify-between items-center px-4 py-2 bg-white border-b border-[#f5f5f7] last:border-0">
                                     <div className="flex items-center gap-3">
                                       <span className="w-5 h-5 bg-[#f5f5f7] text-[#86868b] rounded text-[11px] font-bold flex items-center justify-center">{p.numero}</span>
                                       <span className="text-[14px] text-[#1d1d1f] font-medium">Data: {new Date(p.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                     </div>
                                     <div className="text-[14px] font-semibold text-[#1d1d1f]">
                                       R$ {p.valor.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
                                     </div>
                                   </div>
                                 ))}
                               </div>
                               <div className="px-4 py-3 bg-[#f5f5f7]/50 flex justify-between items-center border-t border-[#0071e3]/10">
                                  <span className="text-[13px] font-medium text-[#86868b]">Total da Operação</span>
                                  <span className="text-[15px] font-bold text-[#1d1d1f]">R$ {rawValue.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                               </div>
                             </div>
                           )}

                           {(modoRepeticao === 'recorrente' && rawValue > 0) && (
                             <div className="mt-2 bg-[#fff8e5] border border-[#ffcc00]/30 rounded-xl p-4">
                                <p className="text-[13px] text-[#bf8c00] font-medium leading-relaxed mb-0">
                                  No modo <strong>Recorrente</strong>, será criado um lançamento de <strong className="text-[#1d1d1f]">R$ {rawValue.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong> que se repetirá acompanhando a data de vencimento (por até 12 meses). O valor <strong>não é dividido</strong>.
                                </p>
                             </div>
                           )}

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 flex items-center justify-end gap-3 bg-white/70 backdrop-blur-xl border-t border-black/[0.04]">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full text-[15px] font-medium text-[#1d1d1f] hover:bg-[#e5e5ea] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-2.5 rounded-full text-[15px] font-semibold text-white bg-[#0071e3] hover:bg-[#0077ED] transition-colors shadow-sm"
              >
                Confirmar Lançamento
              </button>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}