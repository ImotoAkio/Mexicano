import React from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  summary: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({
  isOpen,
  summary,
  onClose,
  onConfirm
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Confirmar Exclusão</h3>
        <p className="text-slate-600 text-xs leading-relaxed font-sans">
          Deseja realmente excluir o agendamento de <strong className="text-slate-900 font-semibold">"{summary}"</strong> do sistema? Esta ação é irreversível.
        </p>
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
          >
            Sim, Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
