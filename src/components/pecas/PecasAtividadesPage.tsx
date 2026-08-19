import React, { useState } from 'react';
import { Search, SlidersHorizontal, Bell } from 'lucide-react';
import FinanceKanban from '../finance/FinanceKanban';
import UserAvatarMenu from '../header/UserAvatarMenu';
import SystemSettingsModal from '../header/SystemSettingsModal';

export default function PecasAtividadesPage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="h-full flex flex-col bg-[#f3f7f5] overflow-hidden font-sans">
      
      {/* Header Padronizado */}
      <header className="bg-[#f3f7f5] border-b border-slate-200/60 p-4 sm:p-6 shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <nav className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <span>Operação</span>
              <span>/</span>
              <span className="text-[#186b77] font-bold">Quadro de Atividades</span>
            </nav>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quadro de Atividades
            </h1>
          </div>

          {/* Botões Utilitários Circulares Padronizados */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button 
              className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Configurações do Sistema"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button 
              className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors relative cursor-pointer"
              title="Notificações"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute top-2 right-2 border-2 border-white" />
            </button>

            <UserAvatarMenu />
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 min-h-0 p-6 overflow-y-auto custom-scrollbar">
        <FinanceKanban setor="pecas_servicos" />
      </div>

      {/* System Settings & Horímetro Modal */}
      {isSettingsOpen && (
        <SystemSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

    </div>
  );
}
