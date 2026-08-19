import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sliders, 
  X, 
  Clock, 
  Ship, 
  Save, 
  Check, 
  AlertTriangle, 
  Search,
  Bell,
  Settings
} from 'lucide-react';
import { Embarcacao } from '../../types';
import { boatDB } from '../../db';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function SystemSettingsModal({
  isOpen,
  onClose,
  onRefresh
}: SystemSettingsModalProps) {
  
  const [activeTab, setActiveTab] = useState<'horimetros' | 'alertas'>('horimetros');
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Standard revision settings state
  const [lanchaRevisionHours, setLanchaRevisionHours] = useState(50);
  const [jetRevisionHours, setJetRevisionHours] = useState(50);
  const [alertThresholdHours, setAlertThresholdHours] = useState(10);
  
  // Edited boat horimeters map
  const [editedHoras, setEditedHoras] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const boats = boatDB.getAll();
      setEmbarcacoes(boats);
      const initialHoras: Record<string, number> = {};
      boats.forEach(b => {
        initialHoras[b.id] = b.horasMotor || 0;
      });
      setEditedHoras(initialHoras);
    }
  }, [isOpen]);

  const filteredBoats = useMemo(() => {
    return embarcacoes.filter(b => {
      const s = searchTerm.toLowerCase();
      return (
        b.nome.toLowerCase().includes(s) ||
        (b.numero && b.numero.toLowerCase().includes(s)) ||
        (b.modelo && b.modelo.toLowerCase().includes(s))
      );
    });
  }, [embarcacoes, searchTerm]);

  if (!isOpen) return null;

  const handleHoraChange = (boatId: string, value: number) => {
    setEditedHoras(prev => ({
      ...prev,
      [boatId]: Math.max(0, value)
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Update each boat's horasMotor in boatDB
      for (const b of embarcacoes) {
        const newHoras = editedHoras[b.id];
        if (newHoras !== undefined && newHoras !== b.horasMotor) {
          await boatDB.update(b.id, { horasMotor: newHoras });
        }
      }

      setSaveSuccess(true);
      if (onRefresh) onRefresh();

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      alert("Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#186b77] text-white flex items-center justify-center border border-teal-400/40 shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Configurações do Sistema</h3>
              <p className="text-xs text-slate-400 font-medium">Gestão de regras de revisão e controle de horas das embarcações</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 shrink-0">
          <button
            onClick={() => setActiveTab('horimetros')}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'horimetros'
                ? 'border-[#186b77] text-[#186b77]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Horas & Horímetros das Embarcações</span>
          </button>

          <button
            onClick={() => setActiveTab('alertas')}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'alertas'
                ? 'border-[#186b77] text-[#186b77]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Regras de Notificações & Revisão</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          
          {activeTab === 'horimetros' && (
            <div className="space-y-5">
              
              {/* Info banner */}
              <div className="p-4 bg-teal-50 border border-teal-200/80 rounded-2xl flex items-start gap-3 text-xs text-teal-900">
                <Clock className="w-5 h-5 text-[#186b77] shrink-0 mt-0.5" />
                <div>
                  <strong className="font-extrabold block text-slate-900">Ajuste Direto de Horímetros:</strong>
                  <span>Altere as horas dos motores diretamente abaixo para alinhar os registros com o relógio físico das embarcações.</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar embarcação por nome ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white transition-all"
                />
              </div>

              {/* Boat Engine Hours Table */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-[11px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Embarcação</th>
                      <th className="py-3 px-4">Tipo / Modelo</th>
                      <th className="py-3 px-4">Próxima Revisão</th>
                      <th className="py-3 px-4 text-right">Horas Atuais (Horímetro)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                    {filteredBoats.map(boat => (
                      <tr key={boat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 font-extrabold block">
                            {boat.nome} (M{boat.numero})
                          </strong>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {boat.modelo || boat.tipo}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#186b77]">
                          {boat.proximaRevisaoHoras || 50} h
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                            <input
                              type="number"
                              step="0.1"
                              value={editedHoras[boat.id] ?? (boat.horasMotor || 0)}
                              onChange={(e) => handleHoraChange(boat.id, parseFloat(e.target.value) || 0)}
                              className="w-20 text-right font-mono font-black text-slate-900 bg-transparent outline-none text-xs"
                            />
                            <span className="text-slate-400 font-bold">h</span>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredBoats.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 text-xs font-medium">
                          Nenhuma embarcação encontrada para o filtro informado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {activeTab === 'alertas' && (
            <div className="space-y-6">
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-extrabold block text-slate-900">Regras de Alerta Automático:</strong>
                  <span>Defina os prazos para disparo de alertas de manutenção preventivas na marina.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Intervalo Revisão Lanchas
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={lanchaRevisionHours}
                      onChange={(e) => setLanchaRevisionHours(parseInt(e.target.value) || 50)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                    />
                    <span className="text-xs font-bold text-slate-500">horas</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Intervalo Revisão Jet Skis
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={jetRevisionHours}
                      onChange={(e) => setJetRevisionHours(parseInt(e.target.value) || 50)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                    />
                    <span className="text-xs font-bold text-slate-500">horas</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 sm:col-span-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Alerta Antecipado de Revisão ("Próxima da Revisão")
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={alertThresholdHours}
                      onChange={(e) => setAlertThresholdHours(parseInt(e.target.value) || 10)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                    />
                    <span className="text-xs font-bold text-slate-500">horas antes do limite</span>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-slate-400">
            {saveSuccess ? '✅ Alterações salvas com sucesso!' : 'Confirme para atualizar os registros no banco de dados'}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-extrabold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#186b77] hover:bg-[#12555f] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvo!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
