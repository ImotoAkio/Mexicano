import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Plus,
  ChevronRight,
  ChevronLeft,
  FolderOpen
} from 'lucide-react';
import { Cliente, Embarcacao, StatusContrato } from '../../types';
import ComercialClient3DFolder from './ComercialClient3DFolder';

interface ComercialContratosDirectoryViewProps {
  clients: Cliente[];
  boats: Embarcacao[];
  boatsMap: Map<string, Embarcacao>;
  onOpenViewer: (cliente: Cliente, type?: 'aquisicao' | 'adm') => void;
  onOpenDetails: (cliente: Cliente) => void;
  onDownloadPdf: (cliente: Cliente, e: React.MouseEvent, type?: 'aquisicao' | 'adm') => void;
  onEditContract: (clientId: string) => void;
  onCreateNewContract: () => void;
  onStatusChange: (clientId: string, newStatus: StatusContrato) => void;
}

export default function ComercialContratosDirectoryView({
  clients,
  boatsMap,
  onOpenViewer,
  onOpenDetails,
  onDownloadPdf,
  onEditContract,
  onCreateNewContract,
  onStatusChange
}: ComercialContratosDirectoryViewProps) {
  // Paginação e Performance da GPU
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Redefinir página quando a lista filtrada mudar
  useEffect(() => {
    setPage(1);
  }, [clients.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(clients.length / pageSize));
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return clients.slice(start, start + pageSize);
  }, [clients, page, pageSize]);

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/70 p-12 text-center max-w-lg mx-auto shadow-xs mt-6">
        <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3.5 border border-stone-200/60 shadow-2xs">
          <FolderOpen className="w-6 h-6 text-stone-400" />
        </div>
        <h4 className="text-[15px] font-semibold text-stone-900 tracking-tight">Nenhum contrato localizado</h4>
        <p className="text-[12px] text-stone-500 max-w-sm mx-auto mt-1">
          Não encontramos nenhum cliente com os filtros ou busca informados.
        </p>
        <button
          onClick={onCreateNewContract}
          className="mt-4 h-9 px-4 rounded-lg bg-mx-ink text-white text-[12px] font-semibold hover:bg-mx-ink-700 transition-colors inline-flex items-center gap-1.5 shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Emitir Novo Contrato</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Grid Principal de Diretórios (Soltos no canvas bg-mx-sand sem div externa) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-1 pb-4">
        {paginatedClients.map(client => {
          const boatId = client.embarcacoes?.[0]?.embarcacaoId || client.embarcacaoId;
          const boat = boatId ? boatsMap.get(boatId) : null;
          return (
            <ComercialClient3DFolder
              key={client.id}
              client={client}
              boat={boat || null}
              onOpenViewer={onOpenViewer}
              onOpenDetails={onOpenDetails}
              onDownloadPdf={onDownloadPdf}
              onEditContract={onEditContract}
              onStatusChange={onStatusChange}
            />
          );
        })}
      </div>

      {/* ─── Paginação Padrão Mexicano Dashboard (Card Solto no Canvas) ─── */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-[12px] text-stone-500 font-medium">
          <span>
            Exibindo <strong className="text-stone-800 font-semibold tabular-nums">{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, clients.length)}</strong> de <strong className="text-stone-800 font-semibold tabular-nums">{clients.length}</strong> clientes
          </span>
          <span className="text-stone-300">•</span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-stone-400">Por página:</span>
            {[12, 24, 48].map(size => (
              <button
                key={size}
                onClick={() => { setPageSize(size); setPage(1); }}
                className={`h-6 px-2 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  pageSize === size 
                    ? 'bg-stone-900 text-white shadow-2xs' 
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-3 rounded-lg border border-stone-200 bg-white text-[12px] font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <span className="h-8 px-3 rounded-lg bg-stone-100 flex items-center text-[12px] font-semibold text-stone-700 tabular-nums">
              {page} de {totalPages}
            </span>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 px-3 rounded-lg border border-stone-200 bg-white text-[12px] font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Próxima</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
