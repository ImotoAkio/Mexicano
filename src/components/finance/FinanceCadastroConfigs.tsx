import React, { useState } from 'react';
import FinanceConfig from './FinanceConfig';
import { motion } from 'framer-motion';

export default function FinanceCadastroConfigs() {
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('Todos');
  const companies = ['Todos', 'Marina', 'Vale Administradora', 'Mexicano'];

  return (
    <div className="w-full h-full bg-[#f5f5f7] flex flex-col pt-8">

      {/* HEADER SECTION */}
      <div className="px-8 mb-8 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight leading-none mb-2">
            Cadastros Base
          </h1>
          <p className="text-[15px] font-medium text-[#86868b] tracking-tight">
            Gerencie Contas Bancárias, Planos de Contas e Fornecedores.
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
                    layoutId="activeCompany"
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
        <FinanceConfig isAdmin={true} isFinanceiro={true} empresa={empresaFiltro} />
      </div>
    </div>
  )
}
