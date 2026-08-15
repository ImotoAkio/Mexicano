import React, { useState, useEffect } from 'react';
import EngineHoursControl from './EngineHoursControl';
import { Embarcacao, Manutencao } from '../../types';
import { boatDB, maintenanceDB } from '../../db';

export default function PecasHorimetrosPage() {
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);

  const loadData = () => {
    setEmbarcacoes(boatDB.getAll());
    setManutencoes(maintenanceDB.getAll());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Polling for updates
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-slate-800">Controle de Horímetros</h2>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhe as horas de motor das embarcações e planeje as próximas revisões.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-200">
        <EngineHoursControl 
          embarcacoes={embarcacoes} 
          manutencoes={manutencoes}
          onRefresh={loadData} 
        />
      </div>
    </div>
  );
}
