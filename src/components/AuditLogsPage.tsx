import React, { useState, useMemo } from 'react';
import { Search, History, Ship, FileText, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { RegistroAtividade, Boat } from '../types';

interface AuditLogsPageProps {
  logs: RegistroAtividade[];
  boats: Boat[];
}

export default function AuditLogsPage({ logs, boats }: AuditLogsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredLogs = useMemo(() => {
    let filtered = [...logs];
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.operadorNome?.toLowerCase().includes(lower) ||
        log.acao?.toLowerCase().includes(lower) ||
        log.detalhes?.toLowerCase().includes(lower) ||
        boats.find(b => b.id === log.embarcacaoId)?.nome?.toLowerCase().includes(lower)
      );
    }
    
    return filtered;
  }, [logs, searchTerm, boats]);

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));

  const getBoatName = (id?: string) => {
    if (!id) return '-';
    return boats.find(b => b.id === id)?.nome || 'Embarcação Excluída';
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };

  return (
    <div className="p-8 h-screen overflow-y-auto bg-slate-50 text-slate-900 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <History className="w-8 h-8 text-blue-600" />
              Registro de Atividades
            </h1>
            <p className="text-slate-500 mt-1">Histórico completo de ações operacionais realizadas no sistema</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por marinheiro, ação..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                  <th className="p-4 font-medium">Data / Hora</th>
                  <th className="p-4 font-medium">Operador</th>
                  <th className="p-4 font-medium">Ação</th>
                  <th className="p-4 font-medium">Detalhes</th>
                  <th className="p-4 font-medium">Embarcação</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-slate-600 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-slate-800 font-medium">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                          {log.operadorNome}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                          {log.acao}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 max-w-xs truncate" title={log.detalhes}>
                        {log.detalhes || '-'}
                      </td>
                      <td className="p-4 text-slate-600">
                        {log.embarcacaoId ? (
                          <div className="flex items-center gap-1.5">
                            <Ship className="w-4 h-4 text-slate-400" />
                            {getBoatName(log.embarcacaoId)}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
