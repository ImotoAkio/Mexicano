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
    <div className="min-h-full flex flex-col font-sans">
      <EngineHoursControl 
        embarcacoes={embarcacoes} 
        manutencoes={manutencoes}
        onRefresh={loadData} 
      />
    </div>
  );
}
