import React, { useState, useEffect, useRef } from 'react';
import { Cliente } from '../../types';

interface SearchableClientSelectProps {
  clients: Cliente[];
  value: string;
  onChange: (val: string) => void;
}

export default function SearchableClientSelect({ clients, value, onChange }: SearchableClientSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedClient = clients.find(c => c.id === value);
  const filteredClients = clients.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.telefone || '').includes(search)
  );

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`w-full text-left text-xs border rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white flex justify-between items-center cursor-pointer ${
          !value ? 'border-rose-300 bg-rose-50 text-rose-800 font-medium' : 'border-slate-300 text-slate-800 font-medium'
        }`}
      >
        <span className="truncate">
          {selectedClient ? selectedClient.nome : '-- Selecione o Cliente --'}
        </span>
        <span className="text-[10px] text-slate-400 pl-1 shrink-0">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 space-y-2 max-h-60 flex flex-col">
          <input
            type="text"
            placeholder="Pesquisar cotista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
            autoFocus
          />
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-44 subtle-scrollbar">
            {filteredClients.length === 0 ? (
              <div className="p-2 text-xs text-slate-400 text-center">Nenhum cotista encontrado</div>
            ) : (
              filteredClients.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-2 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition-colors text-xs flex flex-col"
                >
                  <span className="font-semibold text-slate-700">{c.nome}</span>
                  {c.telefone && <span className="text-[10px] text-slate-500">{c.telefone}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
