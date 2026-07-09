import React from 'react';
import { MessageSquare, HardDrive } from 'lucide-react';
import InternalChat from './InternalChat';
import InternalDrive from './InternalDrive';

export default function PortalInterno() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
            </div>
            Portal Interno
          </h1>
          <p className="text-sm text-slate-500 mt-3 max-w-2xl leading-relaxed">
            Comunicação instantânea e compartilhamento de arquivos entre a Administração e o Financeiro.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-6 min-h-0">
        {/* Chat Section */}
        <div className="w-full lg:w-[35%] h-[500px] lg:h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <InternalChat />
        </div>

        {/* Drive Section */}
        <div className="w-full lg:w-[65%] h-[500px] lg:h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <InternalDrive />
        </div>
      </div>
    </div>
  );
}
