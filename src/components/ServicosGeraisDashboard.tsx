import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  User as UserIcon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { AtividadesOperacionaisTab } from './MarinaOperador/AtividadesOperacionaisTab';
import { PerfilTab } from './MarinaOperador/PerfilTab';
import logoMarinaSrc from '../../logos/logo_marina.svg';
import { getAdminToken } from '../db';

interface ServicosGeraisDashboardProps {
  onLogout: () => void;
  operadorNome?: string;
}

const getFormattedDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const yyyy = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10) - 1;
  const dd = parseInt(parts[2], 10);
  const d = new Date(yyyy, mm, dd);
  const months = ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'];
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${dayStr} De ${months[d.getMonth()]}`;
};

export default function ServicosGeraisDashboard({
  onLogout,
  operadorNome,
}: ServicosGeraisDashboardProps) {
  const todayStr = getFormattedDate(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'atividades' | 'perfil'>('atividades');
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const nomeColaborador =
    operadorNome ||
    localStorage.getItem('admin_name') ||
    localStorage.getItem('admin_username') ||
    'Colaborador';

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const token = getAdminToken();
    const socket = io('/', { path: '/socket.io', auth: { token } });
    socket.on('connect', () => setIsSocketConnected(true));
    socket.on('disconnect', () => setIsSocketConnected(false));
    return () => {
      socket.disconnect();
    };
  }, []);

  const handlePrevDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(getFormattedDate(d));
  };

  const handleNextDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDate(getFormattedDate(d));
  };

  const isToday = selectedDate === todayStr;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20">
      {/* Header Compacto Mobile-First */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 border-b border-slate-800 shadow-md">
        <div className="max-w-4xl mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={logoMarinaSrc}
              alt="Marina"
              className="h-7 w-auto object-contain shrink-0 brightness-0 invert"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold tracking-tight truncate">
                  {nomeColaborador}
                </span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">
                Serviços Gerais · Controle de Atividades
              </span>
            </div>
          </div>

          {/* Navegador de Data no Topo */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handlePrevDay}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <label className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>{isToday ? 'Hoje' : formatDisplayDate(selectedDate)}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={handleNextDay}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      {activeTab === 'atividades' && (
        <main className="max-w-4xl mx-auto p-3 sm:p-4">
          <AtividadesOperacionaisTab
            classeDestino="servicos_gerais"
            operadorNome={nomeColaborador}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </main>
      )}

      {activeTab === 'perfil' && (
        <PerfilTab
          operadorNome={nomeColaborador}
          isSocketConnected={isSocketConnected}
          onLogout={() => {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_username');
            localStorage.removeItem('admin_role');
            localStorage.removeItem('admin_name');
            onLogout();
          }}
          showToast={showToast}
          onOpenNotifications={() => {}}
        />
      )}

      {/* Barra Inferior */}
      <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around fixed bottom-0 w-full z-40 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.08)]">
        <button
          onClick={() => setActiveTab('atividades')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'atividades' ? 'text-[#186b77]' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <CheckCircle2 className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Minhas Atividades</span>
        </button>

        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'perfil' ? 'text-[#186b77]' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <UserIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Meu Perfil</span>
        </button>
      </div>
    </div>
  );
}
