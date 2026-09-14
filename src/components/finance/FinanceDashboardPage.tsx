import React, { useState, useEffect } from 'react';
import { TransacaoFinanceira } from '../../types';
import FinanceDashboard from './FinanceDashboard';
import { Loader2 } from 'lucide-react';
import { STORAGE_KEYS } from '../../utils/constants';

export default function FinanceDashboardPage() {
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('Todos');

  useEffect(() => {
    fetchTransacoes();
  }, []);

  const fetchTransacoes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token') || localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
      if (!token) return;
      
      const res = await fetch('/api/financeiro/transacoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransacoes(data || []);
      }
    } catch (error) {
      console.error('Erro ao listar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Visão Geral (Dashboard)</h1>
          <p className="text-slate-500">Acompanhamento consolidado e indicadores financeiros</p>
        </div>
        
        {/* Filtro Global da Página */}
        <div className="flex flex-wrap bg-white rounded-lg p-1 border border-slate-200 shadow-sm gap-1">
          {['Todos', 'Marina', 'Vale Administradora', 'Mexicano'].map(empresa => (
            <button
              key={empresa}
              onClick={() => setEmpresaFiltro(empresa)}
              className={`px-4 py-2 ${
                empresaFiltro === empresa 
                ? 'bg-slate-100/80 text-slate-900 font-semibold shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
              } rounded-md transition-all text-sm`}
            >
              {empresa}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <Loader2 className="w-8 h-8 text-[#E3A833] animate-spin" />
        </div>
      ) : (
        <FinanceDashboard 
          transacoes={transacoes}
          isAdmin={true} 
          empresaFiltro={empresaFiltro} 
        />
      )}
    </div>
  );
}
