import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  List, 
  Kanban as KanbanIcon, 
  Calendar, 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Wrench,
  SlidersHorizontal,
  Bell
} from 'lucide-react';
import KanbanBoard from './pecas/KanbanBoard';
import MaintenanceModal from './pecas/MaintenanceModal';
import MaintenanceViewerModal from './pecas/MaintenanceViewerModal';
import MaintenanceOverview from './pecas/MaintenanceOverview';
import MaintenanceListView from './pecas/MaintenanceListView';
import MaintenanceCalendarView from './pecas/MaintenanceCalendarView';
import MaintenanceDocumentsView from './pecas/MaintenanceDocumentsView';
import UserAvatarMenu from './header/UserAvatarMenu';
import SystemSettingsModal from './header/SystemSettingsModal';
import { Manutencao, Embarcacao, Mecanico } from '../types';
import { maintenanceDB, boatDB, mecanicoDB } from '../db';

export default function PecasKanbanPage() {
  // Data State
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  
  // View State (Overview, List, Board, Calendar, Documents)
  const [activeView, setActiveView] = useState<'board' | 'list' | 'overview' | 'calendar' | 'documents'>('board');
  
  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'stage' | 'urgency' | 'boat'>('stage');
  const [filterUrgency, setFilterUrgency] = useState<string>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Manutencao | null>(null);
  const [viewingItem, setViewingItem] = useState<Manutencao | null>(null);

  const loadData = () => {
    setManutencoes(maintenanceDB.getAll());
    setEmbarcacoes(boatDB.getAll());
    setMecanicos(mecanicoDB.getAll());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = (item?: Manutencao) => {
    if (item) {
      // Abre o visualizador quando clica num card existente
      setViewingItem(item);
      setIsViewerOpen(true);
    } else {
      // Nova OS abre direto o editor
      setEditingItem(null);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    loadData();
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setViewingItem(null);
    loadData();
  };

  const promoteViewerToEditor = () => {
    setEditingItem(viewingItem);
    setIsViewerOpen(false);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-screen w-full bg-[#f3f7f5] flex-col overflow-hidden font-sans">
      
      {/* Padronizado Header & Bar Container */}
      <header className="bg-[#f3f7f5] border-b border-slate-200/60 p-4 sm:p-6 shrink-0 space-y-5">
        
        {/* 1. Header Padronizado (Breadcrumb, Título & Ícones Utilitários à Direita) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <nav className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <span>Frotas</span>
              <span>/</span>
              <span className="text-[#186b77] font-bold">Painel de Manutenções</span>
            </nav>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Painel de Manutenções
            </h1>
          </div>

          {/* Botões Utilitários Circulares Padronizados */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button 
              onClick={() => {
                const input = document.querySelector('input[placeholder*="Pesquisar OS"]') as HTMLInputElement;
                if (input) input.focus();
              }}
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

        {/* 2. Seletor de Visualizações Flutuantes (Visão Geral, Lista, Kanban, Calendário, Documentos) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 custom-scrollbar">
          
          <button
            onClick={() => setActiveView('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'overview'
                ? 'bg-[#facc15] text-slate-900 shadow-2xs font-black'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'list'
                ? 'bg-[#facc15] text-slate-900 shadow-2xs font-black'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Lista</span>
          </button>

          <button
            onClick={() => setActiveView('board')}
            className={`flex items-center gap-2 px-4.5 py-2 rounded-2xl text-xs transition-all cursor-pointer ${
              activeView === 'board'
                ? 'bg-[#facc15] text-slate-900 shadow-2xs font-black'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <KanbanIcon className="w-4 h-4" />
            <span>Quadro Kanban</span>
          </button>

          <button
            onClick={() => setActiveView('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'calendar'
                ? 'bg-[#facc15] text-slate-900 shadow-2xs font-black'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendário</span>
          </button>

          <button
            onClick={() => setActiveView('documents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'documents'
                ? 'bg-[#facc15] text-slate-900 shadow-2xs font-black'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documentos & Orçamentos</span>
          </button>

        </div>

        {/* 3. Card de Controle de Busca, Filtros & Ação Padronizado */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Campo de Pesquisa */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar OS, barco (ex: M19) ou tarefa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white transition-all"
            />
          </div>

          {/* Filtros e Ação */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Ordenação */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
              <span className="text-slate-400">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer"
              >
                <option value="stage">Estágio</option>
                <option value="urgency">Urgência</option>
                <option value="boat">Embarcação</option>
              </select>
            </div>

            {/* Botão de Ação Primário Padronizado (Teal #186b77) */}
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-[#186b77] hover:bg-[#12555f] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Ordem de Serviço</span>
            </button>

          </div>

        </div>

      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeView === 'overview' && (
          <MaintenanceOverview
            manutencoes={manutencoes}
            embarcacoes={embarcacoes}
            mecanicos={mecanicos}
            onOpenOS={handleOpenModal}
            onNavigateToTab={(tab) => setActiveView(tab as any)}
          />
        )}

        {activeView === 'list' && (
          <MaintenanceListView
            manutencoes={manutencoes}
            embarcacoes={embarcacoes}
            mecanicos={mecanicos}
            onOpenOS={handleOpenModal}
            onRefresh={loadData}
            searchTerm={searchTerm}
          />
        )}

        {activeView === 'board' && (
          <KanbanBoard 
            manutencoes={manutencoes} 
            embarcacoes={embarcacoes}
            mecanicos={mecanicos}
            onOpenCard={handleOpenModal}
            onRefresh={loadData}
            searchTerm={searchTerm}
            sortBy={sortBy}
          />
        )}

        {activeView === 'calendar' && (
          <MaintenanceCalendarView
            manutencoes={manutencoes}
            embarcacoes={embarcacoes}
            onOpenOS={handleOpenModal}
          />
        )}

        {activeView === 'documents' && (
          <MaintenanceDocumentsView
            manutencoes={manutencoes}
            embarcacoes={embarcacoes}
            onOpenOS={handleOpenModal}
            onRefresh={loadData}
            searchTerm={searchTerm}
          />
        )}
      </main>

      {/* OS Maintenance Modal */}
      {isModalOpen && (
        <MaintenanceModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          editingItem={editingItem}
          embarcacoes={embarcacoes}
          mecanicos={mecanicos}
          onRefresh={loadData}
        />
      )}

      {/* OS Maintenance Viewer Modal */}
      {isViewerOpen && viewingItem && (
        <MaintenanceViewerModal
          isOpen={isViewerOpen}
          onClose={handleCloseViewer}
          item={viewingItem}
          embarcacao={embarcacoes.find(b => b.id === viewingItem.embarcacaoId)}
          mecanico={mecanicos.find(m => m.id === viewingItem.mecanico)}
          onEditClick={promoteViewerToEditor}
        />
      )}

      {/* System & Horímetro Settings Modal */}
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
