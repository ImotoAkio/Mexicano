import React, { useState, useEffect } from 'react';
import { Kanban, Wrench, Clock, Package, Plus } from 'lucide-react';
import KanbanBoard from './pecas/KanbanBoard';
import MaintenanceModal from './pecas/MaintenanceModal';
import { Manutencao, Embarcacao, Mecanico } from '../types';
import { maintenanceDB, boatDB, mecanicoDB } from '../db';

export default function PecasKanbanPage() {
  // Data State
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Manutencao | null>(null);

  const loadData = () => {
    setManutencoes(maintenanceDB.getAll());
    setEmbarcacoes(boatDB.getAll());
    setMecanicos(mecanicoDB.getAll());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Polling for updates
    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = (item?: Manutencao) => {
    setEditingItem(item || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    loadData();
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 flex-col overflow-hidden">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            Painel de Manutenções
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestão de manutenções ativas via Kanban.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Chamado
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <KanbanBoard 
          manutencoes={manutencoes} 
          embarcacoes={embarcacoes}
          mecanicos={mecanicos}
          onOpenCard={handleOpenModal}
          onRefresh={loadData}
        />
      </main>

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
    </div>
  );
}
