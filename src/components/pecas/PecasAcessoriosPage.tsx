import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Bell } from 'lucide-react';
import AccessoriesControl from './AccessoriesControl';
import UserAvatarMenu from '../header/UserAvatarMenu';
import SystemSettingsModal from '../header/SystemSettingsModal';
import { Embarcacao, Manutencao } from '../../types';
import { boatDB, maintenanceDB } from '../../db';

export default function PecasAcessoriosPage() {
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const loadData = () => {
    setEmbarcacoes(boatDB.getAll());
    setManutencoes(maintenanceDB.getAll());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#f3f7f5] overflow-hidden font-sans">
      
      {/* Header Padronizado */}
      <header className="bg-[#f3f7f5] border-b border-slate-200/60 px-4 py-3 sm:px-6 sm:py-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <nav className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-0.5 flex items-center gap-1.5">
              <span>Frotas</span>
              <span>/</span>
              <span className="text-[#186b77] font-bold">Checklist de Acessórios</span>
            </nav>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
              Checklist de Acessórios
            </h1>
          </div>

          {/* Ícones Utilitários */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Buscar"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Configurações do Sistema"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button 
              className="hidden sm:flex w-9 h-9 rounded-full bg-white border border-slate-200 shadow-2xs items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors relative cursor-pointer"
              title="Notificações"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute top-2 right-2 border-2 border-white" />
            </button>

            <UserAvatarMenu />
          </div>
        </div>
      </header>

      {/* Conteúdo Principal – sem wrapper card em mobile para máximo aproveitamento */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <AccessoriesControl 
          embarcacoes={embarcacoes} 
          manutencoes={manutencoes}
          onRefresh={loadData} 
        />
      </div>

      {/* System Settings Modal */}
      {isSettingsOpen && (
        <SystemSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
