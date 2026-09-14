import React, { useState } from 'react';
import FinanceConfig from './FinanceConfig';

export default function FinanceCadastroConfigs() {
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('Todos');

  return (
    <div className="p-6">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Cadastros Financeiros</h1>
          <p className="text-slate-500">Gerencie Planos de Contas, Contas Bancárias e Fornecedores</p>
        </div>
        
        {/* Filtro Global da Página */}
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          {['Todos', 'Marina', 'Vale Administradora', 'Mexicano'].map(empresa => (
            <button
              key={empresa}
              onClick={() => setEmpresaFiltro(empresa)}
              className={`px-4 py-2 ${
                empresaFiltro === empresa 
                ? 'bg-slate-100/80 text-slate-900 font-semibold shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
              } rounded-md transition-all text-sm`}
            >
              {empresa}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-slate-50 text-slate-800">
        {/* Reusing FinanceConfig component but outside of the old monolithic page */}
        <FinanceConfig isAdmin={true} isFinanceiro={true} empresa={empresaFiltro} />
      </div>
    </div>
  )
}
