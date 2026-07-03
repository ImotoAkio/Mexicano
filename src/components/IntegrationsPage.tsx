import React, { useState, useEffect } from 'react';
import { Compass, CalendarDays, CheckCircle2, X } from 'lucide-react';
import { Cliente } from '../types';
import { 
  initiateOAuthLogin, 
  isServiceAccountMode, 
  getServiceAccountEmail, 
  getCalendarMappings, 
  saveCalendarMappings, 
  fetchCalendarList, 
  saveGoogleServiceAccount, 
  getGoogleClientId, 
  setGoogleClientId,
  getCachedToken,
  setCachedToken,
  checkServerConfig,
} from '../googleCalendar';
import { boatDB, clientDB } from '../db';

export default function IntegrationsPage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mappings state
  const [calendarMappings, setCalendarMappingsState] = useState<Record<string, string>>({});
  const [isGCalModalOpen, setIsGCalModalOpen] = useState(false);
  const [bulkMappingsInput, setBulkMappingsInput] = useState<string>('');

  // Google OAuth Configs
  const [clientId, setClientId] = useState('');
  const [gcalConnected, setGcalConnected] = useState(false);
  const [saJsonInput, setSaJsonInput] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [isSAMode, setIsSAMode] = useState(isServiceAccountMode());

  useEffect(() => {
    setClientId(getGoogleClientId());
    setGcalConnected(!!getCachedToken());
    
    const mappings = getCalendarMappings();
    setCalendarMappingsState(mappings);
    const bulkLines = Object.entries(mappings).map(([k, v]) => `${k} = ${v}`).join('\n');
    setBulkMappingsInput(bulkLines);

    

    // Verify service account config asynchronously on mount
    checkServerConfig().then(isActive => {
      setIsSAMode(isActive);
    });
  }, []);

  const handleSaveServiceAccount = async () => {
    const raw = saJsonInput.trim();
    if (!raw) {
      showToast('Cole o JSON da Conta de Serviço', 'error');
      return;
    }
    setIsLoading(true);
    const result = await saveGoogleServiceAccount(raw);
    setIsLoading(false);
    if (result.success) {
      showToast(result.message);
      setSaJsonInput('');
      const isActive = await checkServerConfig();
      setIsSAMode(isActive);
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleSaveBulkMappings = () => {
    const lines = bulkMappingsInput.split('\n');
    const parsed: Record<string, string> = {};
    lines.forEach(line => {
      const idx = line.indexOf('=');
      if (idx !== -1) {
        const key = line.substring(0, idx).trim().toLowerCase();
        const val = line.substring(idx + 1).trim();
        if (key && val) parsed[key] = val;
      }
    });
    saveCalendarMappings(parsed);
    setCalendarMappingsState(parsed);
    showToast('Mapeamentos salvos com sucesso!');
    setIsGCalModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 border transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Hero Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Integrações de Sistema</h2>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie conexões do Google Calendar e serviços do WhatsApp da plataforma.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GOOGLE CALENDAR SIMPLE CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5 flex items-center justify-between bg-slate-50 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Google Calendar</h3>
                <p className="text-[10px] text-slate-500">Sincronização de agendas</p>
              </div>
            </div>
            {isSAMode ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider">
                CONTA DE SERVIÇO ATIVA
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase">
                Desconectado
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            {!isSAMode ? (
              <div className="space-y-3">
                <label className="block text-[11px] uppercase font-bold text-slate-500 font-mono">Credenciais JSON da Conta de Serviço</label>
                <textarea
                  rows={3}
                  placeholder='{ "type": "service_account", "project_id": "...", "private_key": "...", ... }'
                  value={saJsonInput}
                  onChange={(e) => setSaJsonInput(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-3 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSaveServiceAccount}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  {isLoading ? 'Salvando...' : 'Salvar JSON e Conectar'}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs text-emerald-800 space-y-2">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Conexão operando normalmente.
                </p>
                <p className="text-[10px] font-mono opacity-80 pl-6 select-all">{getServiceAccountEmail()}</p>
              </div>
            )}
            
            <button
              onClick={() => setIsGCalModalOpen(true)}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4 text-slate-400" />
              Configurar Mapeamento de Agendas
            </button>
          </div>
        </div>

        {/* GOOGLE CALENDAR MODAL */}
        {isGCalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mapeamento de Agendas</h3>
                  <p className="text-[10px] text-slate-500">Defina os IDs do Google Calendar (formato: código = ID)</p>
                </div>
                <button onClick={() => setIsGCalModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">
                <textarea
                  rows={8}
                  value={bulkMappingsInput}
                  onChange={(e) => setBulkMappingsInput(e.target.value)}
                  placeholder="marina = id_marina&#10;m30 = id_m30"
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setIsGCalModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200">Cancelar</button>
                <button onClick={handleSaveBulkMappings} className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700">Salvar Mapeamento</button>
              </div>
            </div>
          </div>
        )}

      </div>


    </div>
  );
}
