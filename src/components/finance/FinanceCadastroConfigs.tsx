import React, { useState } from 'react';
import FinanceConfig from './FinanceConfig';
import { PageHeader } from '../tailadmin';

export default function FinanceCadastroConfigs() {
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('Todos');
  const companies = ['Todos', 'Marina Velho Chico', 'Vale Administradora', 'Mexicano'];

  return (
    <div className="w-full flex flex-col space-y-6">
      <PageHeader
        pageTitle="Cadastros Financeiros"
        subtitle="Gerencie Contas Bancárias, Categorias (Plano de Contas), Centros de Custo e Fornecedores"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Cadastros" }
        ]}
        actions={
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto max-w-full gap-1">
            {companies.map(empresa => {
              const isActive = empresaFiltro === empresa;
              return (
                <button
                  key={empresa}
                  onClick={() => setEmpresaFiltro(empresa)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {empresa}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="w-full">
        <FinanceConfig isAdmin={true} isFinanceiro={true} empresa={empresaFiltro} />
      </div>
    </div>
  );
}
