import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: React.ReactNode;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  icon?: React.ReactNode;
  renderOption?: (opt: SelectOption, isSelected: boolean) => React.ReactNode;
  renderSelected?: (opt: SelectOption) => React.ReactNode;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção...',
  searchPlaceholder = 'Pesquisar...',
  disabled = false,
  className = '',
  buttonClassName,
  dropdownClassName = '',
  icon,
  renderOption,
  renderSelected,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const normalizeStr = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const term = normalizeStr(search.trim());
    const matchLabel = normalizeStr(opt.label).includes(term);
    const matchSublabel = opt.sublabel ? normalizeStr(opt.sublabel).includes(term) : false;
    return matchLabel || matchSublabel;
  });

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const defaultButtonClass = `w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium flex items-center justify-between gap-2 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${
    isOpen ? 'ring-2 ring-blue-600 border-blue-600 shadow-sm' : 'hover:border-slate-300'
  }`;

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearch('');
          }
        }}
        className={
          buttonClassName
            ? `${buttonClassName} ${isOpen ? 'ring-2 ring-blue-600/20 border-blue-600' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
            : defaultButtonClass
        }
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
          {selectedOption ? (
            renderSelected ? (
              renderSelected(selectedOption)
            ) : (
              <div className="truncate flex items-center gap-2">
                <span className="font-semibold text-slate-800">{selectedOption.label}</span>
                {selectedOption.badge}
              </div>
            )
          ) : (
            <span className="truncate text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[999] p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150 ${dropdownClassName}`}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-800 font-medium"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const selectable = filteredOptions.filter(o => !o.disabled);
                  if (selectable.length > 0) {
                    handleSelect(selectable[0].value);
                  }
                }
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100/60 rounded-lg border border-slate-100 subtle-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center font-medium">
                Nenhum resultado encontrado
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                if (renderOption) {
                  return (
                    <div
                      key={opt.value}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      className={opt.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    >
                      {renderOption(opt, isSelected)}
                    </div>
                  );
                }

                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors ${
                      opt.disabled
                        ? 'opacity-50 cursor-not-allowed bg-slate-50'
                        : isSelected
                        ? 'bg-blue-50/80 text-blue-700 font-bold cursor-pointer'
                        : 'hover:bg-slate-50 text-slate-700 font-medium cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate flex items-center gap-1.5">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge}
                      </div>
                      {opt.sublabel && (
                        <div className={`text-[10px] truncate ${isSelected ? 'text-blue-600/80' : 'text-slate-400'}`}>
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
