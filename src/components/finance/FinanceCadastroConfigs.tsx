import React, { useState } from 'react';
import FinanceConfig from './FinanceConfig';

export default function FinanceCadastroConfigs() {
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('Todos');

  return (
    <div className="p-6">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Cadastros Financeiros</h1>
          <p className="text-gray-400">Gerencie Planos de Contas, Contas Bancárias e Fornecedores</p>
        </div>
        
        {/* Filtro Global da Página */}
        <div className="flex bg-[#2A2D35] rounded-lg p-1 border border-white/5">
          {['Todos', 'Marina', 'Vale Administradora', 'Mexicano'].map(empresa => (
            <button
              key={empresa}
              onClick={() => setEmpresaFiltro(empresa)}
              className={`px-4 py-2 ${
                empresaFiltro === empresa 
                ? 'bg-[#E3A833] text-black font-semibold shadow-sm' 
                : 'text-gray-400 hover:text-white'
              } rounded-md transition-all text-sm`}
            >
              {empresa}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-[#1A1C23] text-white">
        {/* Reusing FinanceConfig component but outside of the old monolithic page */}
        <FinanceConfig isAdmin={true} isFinanceiro={true} empresa={empresaFiltro} />
      </div>
    </div>
  )
}
