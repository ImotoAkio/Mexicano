import React, { useState, useEffect } from 'react';
import { TransacaoFinanceira } from '../../types';
import FinanceDashboard from './FinanceDashboard';
import { Loader2 } from 'lucide-react';
import { STORAGE_KEYS } from '../../utils/constants';
import { motion } from 'framer-motion';

export default function FinanceDashboardPage() {
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('Todos');
  const companies = ['Todos', 'Marina', 'Vale Administradora', 'Mexicano'];

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
    <div className="w-full h-full bg-[#f5f5f7] flex flex-col pt-8">

      {/* HEADER SECTION */}
      <div className="px-8 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end shrink-0 gap-4">
        <div>
          <h1 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight leading-none mb-2 mt-0">
            Inteligência & Visão Gerencial
          </h1>
          <p className="text-[15px] font-medium text-[#86868b] tracking-tight">
            Dashboard consolidado de KPIs, projeções de fluxo de caixa e Mini-DRE.
          </p>
        </div>

        {/* Apple-style Multi-Tenant Segmented Control */}
        <div className="flex bg-[#e5e5ea]/50 p-1 rounded-full backdrop-blur-xl border border-white/50 shadow-sm relative overflow-x-auto custom-scrollbar max-w-full">
          {companies.map(empresa => {
            const isActive = empresaFiltro === empresa;
            return (
              <button
                key={empresa}
                onClick={() => setEmpresaFiltro(empresa)}
                className={`relative z-10 px-6 py-2 text-[14px] font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  isActive ? 'text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCompanyDashboard"
                    className="absolute inset-0 bg-white rounded-full shadow-sm border border-black/[0.04]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                {empresa}
              </button>
            )
          })}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 px-8 pb-8 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center h-64">
             <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
          </div>
        ) : (
          <FinanceDashboard
            transacoes={transacoes}
            isAdmin={true}
            empresaFiltro={empresaFiltro}
          />
        )}
      </div>
    </div>
  );
}