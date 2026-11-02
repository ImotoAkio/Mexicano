import React, { useState } from 'react';
import WhatsAppAutomationsTab from './WhatsAppAutomationsTab';
import { Bot, Sparkles, Check, AlertTriangle } from 'lucide-react';

export default function NotificationsRobotPage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
          {toast.message}
        </div>
      )}

      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#186b77] text-white flex items-center justify-center shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Robô de Notificações Inteligentes
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  WhatsApp
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Configure os horários de confirmação de reservas, avisos financeiros e alterne entre os modos Automático e Manual.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal do Painel de Automações */}
      <WhatsAppAutomationsTab showToast={showToast} />
    </div>
  );
}
