import React from 'react';
import { Briefcase } from 'lucide-react';
import UserAvatarMenu from '../header/UserAvatarMenu';

interface ComercialDashboardProps {
  onLogout?: () => void;
  operadorNome?: string;
}

export default function ComercialDashboard({ onLogout, operadorNome }: ComercialDashboardProps) {
  return (
    <div className="min-h-screen bg-[#eaeff3] font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-slate-700" />
          <h1 className="text-sm font-extrabold text-slate-800 tracking-tight">Painel Comercial</h1>
        </div>
        <UserAvatarMenu onLogout={onLogout} />
      </header>

      {/* Content */}
      <main className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
        <div className="text-center space-y-4 px-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-lg">
            <Briefcase className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800">Painel Comercial</h2>
          <p className="text-sm text-slate-500 max-w-sm">
            Este painel está sendo reconstruído. Em breve, todas as funcionalidades estarão disponíveis aqui.
          </p>
        </div>
      </main>
    </div>
  );
}
