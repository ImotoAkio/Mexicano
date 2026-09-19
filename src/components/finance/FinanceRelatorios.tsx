import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TransacaoFinanceira } from '../../types';
import { Calendar, Filter, FileText, Download, Building, DollarSign } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export default function FinanceRelatorios() {
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [planosContas, setPlanosContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedEmpresas, setSelectedEmpresas] = useState<Record<string, boolean>>({
    'Marina Velho Chico': true,
    'Vale Administradora': true,
    'Mexicano': true
  });

  const [isExporting, setIsExporting] = useState(false);
  const dreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTransacoes();

    // Set default dates to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setDateStart(firstDay);
    setDateEnd(lastDay);
  }, []);

  const fetchTransacoes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/financeiro/transacoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransacoes(data || []);
      }
      const resPlanos = await fetch('/api/financeiro/planos-contas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resPlanos.ok) {
        const dataPlanos = await resPlanos.json();
        setPlanosContas(dataPlanos || []);
      }
    } catch (err) {
      console.error('Erro ao buscar transacoes:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmpresa = (emp: string) => {
    setSelectedEmpresas(prev => ({
      ...prev,
      [emp]: !prev[emp]
    }));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Process data for DRE
  const dreData = useMemo(() => {
    // 1. Filter transacoes
    let filtered = transacoes.filter(t => t.status === 'pago'); // DRE typically realized

    if (dateStart) {
      filtered = filtered.filter(t => (t.dataPagamento || t.dataVencimento) >= dateStart);
    }
    if (dateEnd) {
      filtered = filtered.filter(t => (t.dataPagamento || t.dataVencimento) <= dateEnd);
    }

    filtered = filtered.filter(t => {
      const emp = t.empresa || 'Mexicano'; // fallback
      return selectedEmpresas[emp] === true;
    });

    const receitas: Record<string, number> = {};
    const despesas: Record<string, number> = {};

    let totalReceitas = 0;
    let totalDespesas = 0;

    filtered.forEach(t => {
      const plano = planosContas.find((p: any) => p.id === t.planoContasId);
      const cat = plano ? plano.descricao : (t.categoria || 'Sem Categoria');
      const val = Number(t.valor);

      if (t.tipo === 'receita') {
        receitas[cat] = (receitas[cat] || 0) + val;
        totalReceitas += val;
      } else {
        despesas[cat] = (despesas[cat] || 0) + val;
        totalDespesas += val;
      }
    });

    return {
      receitas,
      despesas,
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas
    };
  }, [transacoes, dateStart, dateEnd, selectedEmpresas, planosContas]);

  const handleExport = async () => {
    if (!dreRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await toPng(dreRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const doc = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      const imgProps = doc.getImageProperties(canvas);
      const imgRatio = imgProps.width / imgProps.height;
      const pdfRatio = pdfWidth / pdfHeight;

      let drawWidth = pdfWidth;
      let drawHeight = pdfWidth / imgRatio;

      if (drawHeight > pdfHeight) {
        doc.addPage(); // If extremely long, maybe paginate? Simple approach for now.
      }

      doc.addImage(canvas, 'PNG', 0, 0, drawWidth, drawHeight);
      doc.save(`DRE_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Falha ao exportar relatório.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-slate-800">Carregando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            Relatórios & DRE (Demonstrativo de Resultados)
          </h2>
          <p className="text-slate-500 mt-1">Gere relatórios detalhados agrupados por plano de contas e empresa.</p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow cursor-pointer transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Processando...' : 'Exportar PDF Relatório Operacional'}
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col md:flex-row gap-6">
        {/* Date Form */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-4 h-4" /> Período
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 p-2 rounded focus:outline-none focus:border-indigo-500"
            />
            <span className="text-slate-500">até</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 p-2 rounded focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Empresas Form */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <Building className="w-4 h-4" /> Empresas
          </h3>
          <div className="flex items-center gap-3">
            {['Marina Velho Chico', 'Vale Administradora', 'Mexicano'].map(emp => (
              <label key={emp} className="flex items-center gap-2 text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedEmpresas[emp] || false}
                  onChange={() => toggleEmpresa(emp)}
                  className="w-4 h-4 text-indigo-600 bg-white border-gray-500 rounded focus:ring-indigo-500 focus:ring-2"
                />
                {emp}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* DRE Area */}
      <div
        ref={dreRef}
        className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8"
        style={{ backgroundColor: isExporting ? '#ffffff' : '' }}
      >
        <div className="text-center mb-8 border-b border-slate-200 pb-4">
          <h1 className="text-xl font-bold text-slate-800">Demonstrativo de Resultado Operacional (DRE)</h1>
          <p className="text-slate-500 text-sm mt-1">
            Período: {dateStart ? new Date(dateStart + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início'} a {dateEnd ? new Date(dateEnd + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}
          </p>
          <div className="flex justify-center gap-2 mt-2">
            {Object.keys(selectedEmpresas).filter(k => selectedEmpresas[k]).map(e => (
              <span key={e} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded text-slate-600">{e}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Receitas */}
          <div>
            <h3 className="text-lg font-bold text-emerald-400 mb-4 border-b border-emerald-500/20 pb-2">Receitas (Entradas)</h3>
            <div className="space-y-3">
              {Object.keys(dreData.receitas).length === 0 && <p className="text-slate-400 text-sm">Sem receitas no período.</p>}
              {Object.entries(dreData.receitas)
                .sort((a,b) => b[1] - a[1])
                .map(([cat, val]) => (
                <div key={cat} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{cat}</span>
                  <span className="text-slate-800 font-medium">{formatCurrency(val)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 flex justify-between items-center border-t border-slate-200">
              <span className="font-bold text-emerald-400">Total Receitas</span>
              <span className="font-bold text-emerald-400">{formatCurrency(dreData.totalReceitas)}</span>
            </div>
          </div>

          {/* Despesas */}
          <div>
            <h3 className="text-lg font-bold text-rose-400 mb-4 border-b border-rose-500/20 pb-2">Despesas (Saídas)</h3>
            <div className="space-y-3">
              {Object.keys(dreData.despesas).length === 0 && <p className="text-slate-400 text-sm">Sem despesas no período.</p>}
              {Object.entries(dreData.despesas)
                .sort((a,b) => b[1] - a[1])
                .map(([cat, val]) => (
                <div key={cat} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{cat}</span>
                  <span className="text-slate-800 font-medium">{formatCurrency(val)}</span>
                </div>
              ))}
            </div>
             <div className="mt-4 pt-3 flex justify-between items-center border-t border-slate-200">
              <span className="font-bold text-rose-400">Total Despesas</span>
              <span className="font-bold text-rose-400">{formatCurrency(dreData.totalDespesas)}</span>
            </div>
          </div>
        </div>

        {/* Resumo Final */}
        <div className="mt-8 pt-6 border-t-2 border-slate-200">
          <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 shadow-sm bg-slate-50">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5"/>
              Resultado Operacional (Saldo)
            </span>
            <span className={`text-4xl font-black ${dreData.saldo >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(dreData.saldo)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
