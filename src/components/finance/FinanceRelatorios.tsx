import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TransacaoFinanceira } from '../../types';
import { Calendar, Filter, FileText, Download, Building, DollarSign } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { PageHeader, ComponentCard, Button, Badge } from '../tailadmin';

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

  const toggleEmpresa = (empresa: string) => {
    setSelectedEmpresas(prev => ({
      ...prev,
      [empresa]: !prev[empresa]
    }));
  };

  const filteredTransacoes = useMemo(() => {
    return transacoes.filter(t => {
      // Data
      if (dateStart && t.dataVencimento < dateStart) return false;
      if (dateEnd && t.dataVencimento > dateEnd) return false;

      // Status
      if (t.status !== 'pago') return false;

      // Empresa
      const emp = t.empresa || 'Mexicano';
      if (!selectedEmpresas[emp]) return false;

      return true;
    });
  }, [transacoes, dateStart, dateEnd, selectedEmpresas]);

  // Group by plano de contas
  const dreData = useMemo(() => {
    const receitas: Record<string, number> = {};
    const despesas: Record<string, number> = {};
    let totalReceitas = 0;
    let totalDespesas = 0;

    filteredTransacoes.forEach(t => {
      const plano = planosContas.find(p => p.id === t.planoContasId);
      const categoryName = plano ? plano.descricao : (t.categoria || 'Outros');
      const val = parseFloat(t.valor as any) || 0;

      if (t.tipo === 'receita') {
        receitas[categoryName] = (receitas[categoryName] || 0) + val;
        totalReceitas += val;
      } else if (t.tipo === 'despesa') {
        despesas[categoryName] = (despesas[categoryName] || 0) + val;
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
  }, [filteredTransacoes, planosContas]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

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

      let drawWidth = pdfWidth;
      let drawHeight = pdfWidth / imgRatio;

      if (drawHeight > pdfHeight) {
        doc.addPage();
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
    return (
      <div className="flex flex-col justify-center items-center h-72 gap-3 bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Carregando relatório e DRE...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-6">
      <PageHeader
        pageTitle="Relatórios & Demonstrativo de Resultados (DRE)"
        subtitle="Gere relatórios gerenciais consolidados agrupados por plano de contas e empresa"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Relatórios & DRE" }
        ]}
        actions={
          <Button
            variant="primary"
            size="md"
            startIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            isLoading={isExporting}
          >
            Exportar PDF (DRE)
          </Button>
        }
      />

      {/* Filters Card */}
      <ComponentCard
        title="Parâmetros do Relatório"
        subtitle="Defina o período e as empresas a consolidar"
      >
        <div className="flex flex-col md:flex-row gap-6">
          {/* Date Form */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Período
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Empresas Form */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" /> Empresas
            </span>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {['Marina Velho Chico', 'Vale Administradora', 'Mexicano'].map(emp => (
                <label key={emp} className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedEmpresas[emp] || false}
                    onChange={() => toggleEmpresa(emp)}
                    className="w-4 h-4 text-brand-500 bg-white border-slate-300 rounded focus:ring-brand-500 focus:ring-2"
                  />
                  {emp}
                </label>
              ))}
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* DRE Area */}
      <div
        ref={dreRef}
        className="bg-white border border-slate-200/90 shadow-xs rounded-2xl p-6 md:p-8"
        style={{ backgroundColor: isExporting ? '#ffffff' : '' }}
      >
        <div className="text-center mb-8 border-b border-slate-100 pb-5">
          <h2 className="text-xl font-bold text-slate-900">Demonstrativo de Resultado Operacional (DRE)</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Período: {dateStart ? new Date(dateStart + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início'} a {dateEnd ? new Date(dateEnd + 'T12:00:00').toLocaleDateString('pt-BR') : 'Fim'}
          </p>
          <div className="flex justify-center gap-2 mt-3">
            {Object.keys(selectedEmpresas).filter(k => selectedEmpresas[k]).map(e => (
              <Badge key={e} color="light" size="sm">
                {e}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Receitas */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-5">
            <h3 className="text-sm font-bold text-emerald-700 mb-4 border-b border-emerald-200 pb-2 flex justify-between items-center">
              <span>Receitas Operacionais (Entradas)</span>
              <span>{formatCurrency(dreData.totalReceitas)}</span>
            </h3>
            <div className="space-y-2.5">
              {Object.keys(dreData.receitas).length === 0 && <p className="text-slate-400 text-xs">Sem receitas realizadas no período.</p>}
              {Object.entries(dreData.receitas)
                .sort((a,b) => b[1] - a[1])
                .map(([cat, val]) => (
                <div key={cat} className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-emerald-100/50 last:border-0">
                  <span className="text-slate-700">{cat}</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Despesas */}
          <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-5">
            <h3 className="text-sm font-bold text-rose-700 mb-4 border-b border-rose-200 pb-2 flex justify-between items-center">
              <span>Despesas Operacionais (Saídas)</span>
              <span>{formatCurrency(dreData.totalDespesas)}</span>
            </h3>
            <div className="space-y-2.5">
              {Object.keys(dreData.despesas).length === 0 && <p className="text-slate-400 text-xs">Sem despesas realizadas no período.</p>}
              {Object.entries(dreData.despesas)
                .sort((a,b) => b[1] - a[1])
                .map(([cat, val]) => (
                <div key={cat} className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-rose-100/50 last:border-0">
                  <span className="text-slate-700">{cat}</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resumo Final */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200/80 bg-slate-50/60">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-brand-500"/>
              Resultado Operacional Líquido
            </span>
            <span className={`text-3xl sm:text-4xl font-extrabold ${dreData.saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(dreData.saldo)}
            </span>
            <span className="text-xs text-slate-400 mt-1">
              Receitas Realizadas - Despesas Realizadas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
