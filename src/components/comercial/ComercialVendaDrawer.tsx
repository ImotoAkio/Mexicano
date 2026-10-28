import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Ship,
  User,
  UserPlus,
  DollarSign,
  CheckCircle2,
  Upload,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Search,
  CreditCard
} from 'lucide-react';
import { Cliente, Embarcacao } from '../../types';
import { clientDB, boatDB, syncWithRemote } from '../../db';
import { getBoatCode } from '../../utils/boatUtils';
import { isInternalMexicano } from '../../utils/constants';
import {
  getBoatCotaOccupancyMap,
  getBoatCotasList,
  getBoatTotalCotas,
  getFirstAvailableCota,
  normalizeCotaCode,
  getClientCotasForBoat,
  getBoatEstoqueResumo
} from '../../utils/cotaUtils';
import ComercialClientModal from './ComercialClientModal';

function formatBoatMxx(boat?: Partial<Embarcacao> | null): string {
  if (!boat) return '';
  const code = getBoatCode(boat);
  if (/^M\d+/i.test(code)) return code.toUpperCase();
  const numMatch = String(boat.nome || '').match(/(?:EL\s*MEXICANO|M)[\s\-_]*(\d+)/i);
  if (numMatch) {
    return `M${numMatch[1].padStart(2, '0')}`;
  }
  return code;
}

interface ComercialVendaDrawerProps {
  open: boolean;
  onClose: () => void;
  preselectedClientId?: string | null;
  preselectedBoatId?: string | null;
  onSuccess?: (result: any) => void;
}

type VendaTabId = 'cotista' | 'entrada' | 'parcelamento' | 'taxa_adm' | 'resumo';


function getNextMonthDueDate(day: number, fromDateStr?: string): string {
  const baseDate = fromDateStr ? new Date(fromDateStr + 'T12:00:00') : new Date();
  const nextMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
  const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, day || 10), maxDay);
  const yyyy = nextMonth.getFullYear();
  const mm = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const dd = String(safeDay).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function calculateMonthsUntilDecember(dateStr: string): number {
  if (!dateStr) return 12;
  const parts = dateStr.split('-');
  if (parts.length < 2) return 12;
  const month = parseInt(parts[1], 10);
  if (isNaN(month) || month < 1 || month > 12) return 12;
  return Math.max(1, 12 - month + 1);
}

function getYearFromDate(dateStr: string): number {
  if (!dateStr) return new Date().getFullYear();
  const parts = dateStr.split('-');
  const yyyy = parseInt(parts[0], 10);
  return isNaN(yyyy) ? new Date().getFullYear() : yyyy;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  keywords?: string;
  badge?: string;
  badgeTone?: 'neutral' | 'emerald' | 'amber';
}

interface ComercialSearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  icon?: React.ReactNode;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function ComercialSearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = 'Digite para pesquisar...',
  icon,
  emptyMessage = 'Nenhum resultado encontrado',
  emptyActionLabel,
  onEmptyAction
}: ComercialSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find(opt => opt.value === value),
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = normalizeText(search.trim());
    if (!q) return options;
    return options.filter(opt => {
      const haystack = normalizeText(
        `${opt.label} ${opt.sublabel || ''} ${opt.keywords || ''}`
      );
      return haystack.includes(q);
    });
  }, [options, search]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          setSearch('');
        }}
        className={`w-full h-10 px-3.5 rounded-xl border bg-white text-xs flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
          isOpen
            ? 'border-mx-ink ring-2 ring-mx-ink/15'
            : 'border-stone-200 hover:border-stone-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && <span className="text-stone-400 shrink-0">{icon}</span>}
          {selectedOption ? (
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <span className="font-semibold text-stone-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-[11px] text-stone-400 truncate hidden sm:inline tabular-nums">
                  {selectedOption.sublabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-stone-400 font-medium truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedOption?.badge && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                selectedOption.badgeTone === 'emerald'
                  ? 'bg-emerald-100/80 text-emerald-800'
                  : selectedOption.badgeTone === 'amber'
                  ? 'bg-amber-100/80 text-amber-800'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-stone-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-mx-ink' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-stone-200/90 rounded-2xl shadow-[0_14px_34px_-8px_rgba(0,0,0,0.16)] z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setIsOpen(false);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0].value);
                  }
                }
              }}
              className="w-full h-8 pl-8 pr-7 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-mx-ink outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-44 overflow-y-auto divide-y divide-stone-100 rounded-xl border border-stone-100">
            {filteredOptions.length === 0 ? (
              <div className="p-3.5 text-center space-y-2">
                <p className="text-xs text-stone-400 font-medium">{emptyMessage}</p>
                {onEmptyAction && emptyActionLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onEmptyAction();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    {emptyActionLabel}
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-mx-ink-50 text-mx-ink font-bold'
                        : 'hover:bg-stone-50 text-stone-700 font-medium'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-stone-900 font-semibold">
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                              opt.badgeTone === 'emerald'
                                ? 'bg-emerald-100/80 text-emerald-800'
                                : opt.badgeTone === 'amber'
                                ? 'bg-amber-100/80 text-amber-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <div className="text-[11px] text-stone-500 truncate mt-0.5 tabular-nums">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-mx-ink shrink-0" />}
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

export default function ComercialVendaDrawer({
  open,
  onClose,
  preselectedClientId,
  preselectedBoatId,
  onSuccess
}: ComercialVendaDrawerProps) {
  const [activeTab, setActiveTab] = useState<VendaTabId>('cotista');
  const [clients, setClients] = useState<Cliente[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  // Dados de vínculo Cliente + Embarcação + Cota
  const [clienteId, setClienteId] = useState<string>('');
  const [embarcacaoId, setEmbarcacaoId] = useState<string>('');
  const [cota, setCota] = useState<string>('C1');
  const [dataVenda, setDataVenda] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Valores da Venda e Entrada
  const [valorTotal, setValorTotal] = useState<string>('');
  const [valorEntrada, setValorEntrada] = useState<string>('');
  const [dataEntrada, setDataEntrada] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [entradaPaga, setEntradaPaga] = useState<boolean>(false);
  const [comprovanteEntrada, setComprovanteEntrada] = useState<string | null>(null);
  const [comprovanteNome, setComprovanteNome] = useState<string | null>(null);
  const [isUploadingComprovante, setIsUploadingComprovante] = useState<boolean>(false);

  // Parcelas da Cota
  const [numParcelas, setNumParcelas] = useState<string>('24');
  const [valorParcelaManual, setValorParcelaManual] = useState<string>('');
  const [diaVencimento, setDiaVencimento] = useState<string>('10');
  const [primeiroVencimento, setPrimeiroVencimento] = useState<string>(() => getNextMonthDueDate(10));
  const [formaPagamento, setFormaPagamento] = useState<string>('Boleto / PIX');
  const [showSchedulePreview, setShowSchedulePreview] = useState<boolean>(false);

  // Taxa de Administração Opcional
  const [gerarTaxaAdm, setGerarTaxaAdm] = useState<boolean>(false);
  const [valorTaxaAdm, setValorTaxaAdm] = useState<string>('850.00');
  const [diaVencimentoTaxaAdm, setDiaVencimentoTaxaAdm] = useState<string>('10');
  const [primeiroVencimentoTaxaAdm, setPrimeiroVencimentoTaxaAdm] = useState<string>(() => getNextMonthDueDate(10));
  const [mesesTaxaAdm, setMesesTaxaAdm] = useState<string>(() => {
    const initialDue = getNextMonthDueDate(10);
    return String(calculateMonthsUntilDecember(initialDue));
  });

  // Configurações padrão carregadas do Administrador
  const [defaultConfigInfo, setDefaultConfigInfo] = useState<{
    vendaPadraoEmpresa: string;
    vendaPadraoCategoria: string;
    taxaAdmPadraoEmpresa: string;
    taxaAdmPadraoCategoria: string;
  }>({
    vendaPadraoEmpresa: 'Mexicano',
    vendaPadraoCategoria: 'Venda de Cota',
    taxaAdmPadraoEmpresa: 'Vale Administradora',
    taxaAdmPadraoCategoria: 'Taxa de Administração'
  });

  const [observacoes, setObservacoes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Atalho ESC para fechar
  useEffect(() => {
    if (!open || isNewClientModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isNewClientModalOpen, onClose]);

  // Carregar clientes, embarcações e configuração padrão ao abrir
  useEffect(() => {
    if (!open) return;

    const cl = clientDB.getAll();
    const bt = boatDB.getAll();
    setClients([...cl]);
    setBoats([...bt]);
    setErrorMsg(null);
    setActiveTab('cotista');
    setValorTotal('');
    setValorEntrada('');
    setEntradaPaga(false);
    setComprovanteEntrada(null);
    setComprovanteNome(null);

    if (preselectedClientId) {
      setClienteId(preselectedClientId);
    } else if (cl.length > 0 && !clienteId) {
      setClienteId('');
    }

    if (preselectedBoatId) {
      setEmbarcacaoId(preselectedBoatId);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const initialDueAdm = getNextMonthDueDate(parseInt(diaVencimentoTaxaAdm, 10) || 10, todayStr);
    setPrimeiroVencimentoTaxaAdm(initialDueAdm);
    setMesesTaxaAdm(String(calculateMonthsUntilDecember(initialDueAdm)));

    // Buscar configurações padrão definidas pelo Administrador
    fetch('/api/financeiro/configuracoes', {
      credentials: 'include',
      headers: getAuthHeader()
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.configuracoes) {
          const cfg = data.configuracoes;
          setDefaultConfigInfo({
            vendaPadraoEmpresa: cfg.vendaPadraoEmpresa || 'Mexicano',
            vendaPadraoCategoria: cfg.vendaPadraoCategoria || 'Venda de Cota',
            taxaAdmPadraoEmpresa: cfg.taxaAdmPadraoEmpresa || 'Vale Administradora',
            taxaAdmPadraoCategoria: cfg.taxaAdmPadraoCategoria || 'Taxa de Administração'
          });
          if (cfg.taxaAdmPadraoValor) {
            setValorTaxaAdm(String(cfg.taxaAdmPadraoValor));
          }
        }
      })
      .catch(() => {});
  }, [open, preselectedClientId, preselectedBoatId]);

  // Opções pesquisáveis para Clientes, Embarcações e Forma de Pagamento
  const clientSelectOptions = useMemo<SearchableOption[]>(() => {
    return [...clients]
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
      .map(c => {
        const parts: string[] = [];
        if (c.cpf) parts.push(`CPF: ${c.cpf}`);
        if (c.telefone) parts.push(c.telefone);
        return {
          value: c.id,
          label: c.nome,
          sublabel: parts.join(' • ') || undefined,
          keywords: `${c.cpf || ''} ${(c.cpf || '').replace(/\D/g, '')} ${c.telefone || ''} ${c.email || ''}`
        };
      });
  }, [clients]);

  const boatSelectOptions = useMemo<SearchableOption[]>(() => {
    return [...boats]
      .sort((a, b) => {
        const codeA = formatBoatMxx(a);
        const codeB = formatBoatMxx(b);
        const numA = parseInt(codeA.replace(/\D/g, ''), 10);
        const numB = parseInt(codeB.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numA - numB;
        }
        return codeA.localeCompare(codeB);
      })
      .map(b => {
        const estoque = getBoatEstoqueResumo(b.id, clients, b);
        const code = formatBoatMxx(b);
        const isSoldOut = estoque.cotasDisponiveis === 0;

        return {
          value: b.id,
          label: code,
          sublabel: [b.fabricante, b.modelo].filter(Boolean).join(' • ') || undefined,
          badge: isSoldOut
            ? `0/${estoque.totalCotas} (Esgotado)`
            : `${estoque.cotasDisponiveis}/${estoque.totalCotas} livres`,
          badgeTone: isSoldOut ? 'amber' : 'emerald',
          keywords: `${code} ${b.nome || ''} ${b.numero || ''} ${b.modelo || ''} ${b.fabricante || ''} ${estoque.cotasDisponiveis} livres`
        };
      });
  }, [boats, clients]);

  const selectedClient = useMemo(() => clients.find(c => c.id === clienteId), [clients, clienteId]);
  const selectedBoat = useMemo(() => boats.find(b => b.id === embarcacaoId), [boats, embarcacaoId]);

  // Mapa de ocupação de cotas na embarcação selecionada
  const cotasOcupadasMap = useMemo(() => {
    return getBoatCotaOccupancyMap(embarcacaoId, clients, selectedBoat);
  }, [embarcacaoId, clients, selectedBoat]);

  // Contagem de cotas ocupadas por cotistas reais (ignora estoque próprio Mexicano)
  const realOccupiedCount = useMemo(() => {
    let count = 0;
    cotasOcupadasMap.forEach(occ => {
      if (!occ.isMexicano) count++;
    });
    return count;
  }, [cotasOcupadasMap]);

  // Lista sequencial padronizada de cotas (C1..CN) conforme a capacidade real configurada
  const boatCotasList = useMemo(() => {
    return getBoatCotasList(selectedBoat, realOccupiedCount);
  }, [selectedBoat, realOccupiedCount]);

  // Cotas que o cliente selecionado já possui nesta embarcação
  const clientExistingCotas = useMemo(() => {
    if (!selectedClient || !embarcacaoId) return [];
    return getClientCotasForBoat(selectedClient, embarcacaoId, clients, selectedBoat);
  }, [selectedClient, embarcacaoId, clients, selectedBoat]);

  // Auto-selecionar a primeira cota livre ao trocar de embarcação
  useEffect(() => {
    if (!embarcacaoId) return;
    const firstFree = getFirstAvailableCota(embarcacaoId, clients, selectedBoat);
    setCota(firstFree);
  }, [embarcacaoId, clients, selectedBoat]);

  const paymentMethodOptions = useMemo<SearchableOption[]>(
    () => [
      { value: 'Boleto / PIX', label: 'Boleto / PIX', sublabel: 'Emissão híbrida com QR Code PIX e código de barras' },
      { value: 'PIX', label: 'PIX', sublabel: 'Transferência instantânea via chave ou QR Code' },
      { value: 'Boleto Bancário', label: 'Boleto Bancário', sublabel: 'Boleto registrado tradicional' },
      { value: 'Transferência Bancária', label: 'Transferência Bancária', sublabel: 'TED / DOC direto na conta da empresa' },
      { value: 'Cartão de Crédito', label: 'Cartão de Crédito', sublabel: 'Cobrança via maquininha ou link de pagamento' }
    ],
    []
  );

  // Atualizar data do 1º vencimento quando o dia de vencimento mudar
  const handleDiaVencimentoChange = (val: string) => {
    setDiaVencimento(val);
    const numDay = parseInt(val, 10);
    if (!isNaN(numDay) && numDay >= 1 && numDay <= 31) {
      setPrimeiroVencimento(getNextMonthDueDate(numDay, dataVenda));
    }
  };

  const handleDiaVencimentoTaxaAdmChange = (val: string) => {
    setDiaVencimentoTaxaAdm(val);
    const numDay = parseInt(val, 10);
    if (!isNaN(numDay) && numDay >= 1 && numDay <= 31) {
      const nextDue = getNextMonthDueDate(numDay, dataVenda);
      setPrimeiroVencimentoTaxaAdm(nextDue);
      setMesesTaxaAdm(String(calculateMonthsUntilDecember(nextDue)));
    }
  };

  const handlePrimeiroVencimentoTaxaAdmChange = (val: string) => {
    setPrimeiroVencimentoTaxaAdm(val);
    if (val) {
      setMesesTaxaAdm(String(calculateMonthsUntilDecember(val)));
    }
  };

  const handleDataVendaChange = (val: string) => {
    setDataVenda(val);
    if (val) {
      const numDayAdm = parseInt(diaVencimentoTaxaAdm, 10) || 10;
      const nextDueAdm = getNextMonthDueDate(numDayAdm, val);
      setPrimeiroVencimentoTaxaAdm(nextDueAdm);
      setMesesTaxaAdm(String(calculateMonthsUntilDecember(nextDueAdm)));

      const numDayCota = parseInt(diaVencimento, 10) || 10;
      setPrimeiroVencimento(getNextMonthDueDate(numDayCota, val));
    }
  };

  // Cálculos financeiros em tempo real
  const valorTotalNum = useMemo(() => Math.max(0, parseFloat(valorTotal.replace(',', '.')) || 0), [valorTotal]);
  const valorEntradaNum = useMemo(() => Math.max(0, parseFloat(valorEntrada.replace(',', '.')) || 0), [valorEntrada]);
  const saldoRemanescente = useMemo(
    () => Math.max(0, Math.round((valorTotalNum - valorEntradaNum) * 100) / 100),
    [valorTotalNum, valorEntradaNum]
  );
  const numParcelasInt = useMemo(() => Math.max(0, parseInt(numParcelas, 10) || 0), [numParcelas]);

  const valorParcelaCalculado = useMemo(() => {
    if (numParcelasInt <= 0 || saldoRemanescente <= 0) return 0;
    return Math.round((saldoRemanescente / numParcelasInt) * 100) / 100;
  }, [saldoRemanescente, numParcelasInt]);

  const valorParcelaFinal = useMemo(() => {
    if (valorParcelaManual.trim() !== '') {
      const manual = parseFloat(valorParcelaManual.replace(',', '.'));
      if (!isNaN(manual) && manual >= 0) return manual;
    }
    return valorParcelaCalculado;
  }, [valorParcelaManual, valorParcelaCalculado]);

  // Prévia das parcelas de cota
  const previewParcelas = useMemo(() => {
    if (numParcelasInt <= 0 || valorParcelaFinal <= 0) return [];
    const list: { numero: number; vencimento: string; valor: number }[] = [];
    const [bYear, bMonth] = (primeiroVencimento || getNextMonthDueDate(10)).split('-').map(Number);
    const dueDay = parseInt(diaVencimento, 10) || 10;

    for (let i = 0; i < Math.min(numParcelasInt, 60); i++) {
      const d = new Date(bYear, bMonth - 1 + i, 1);
      const maxD = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const day = Math.min(dueDay, maxD);
      const venc = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      list.push({
        numero: i + 1,
        vencimento: venc,
        valor: valorParcelaFinal
      });
    }
    return list;
  }, [numParcelasInt, valorParcelaFinal, primeiroVencimento, diaVencimento]);

  // Upload do comprovante da entrada
  const handleUploadComprovante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingComprovante(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('comprovante', file);

      const res = await fetch('/api/upload/comprovante', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeader(),
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.message || 'Falha ao enviar comprovante.');
      }

      setComprovanteEntrada(data.url);
      setComprovanteNome(file.name);
      setEntradaPaga(true);
    } catch (err: any) {
      console.error('Erro no upload de comprovante:', err);
      setErrorMsg(err.message || 'Não foi possível enviar o comprovante.');
    } finally {
      setIsUploadingComprovante(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submissão completa da Venda
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!clienteId) {
      setErrorMsg('Selecione o cliente comprador.');
      setActiveTab('cotista');
      return;
    }
    if (!embarcacaoId) {
      setErrorMsg('Selecione a embarcação adquirida.');
      setActiveTab('cotista');
      return;
    }
    if (valorTotalNum <= 0) {
      setErrorMsg('Informe um valor total de venda válido.');
      setActiveTab('entrada');
      return;
    }

    const normCota = normalizeCotaCode(cota, 1);
    const occupant = cotasOcupadasMap.get(normCota);
    if (occupant && !occupant.isMexicano) {
      setErrorMsg(`A cota ${normCota} já está ocupada por ${occupant.clienteNome} nesta embarcação. Por favor selecione uma cota disponível.`);
      setActiveTab('cotista');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        clienteId,
        embarcacaoId,
        cota: normCota,
        dataVenda,
        valorTotal: valorTotalNum,
        valorEntrada: valorEntradaNum,
        dataEntrada,
        dataVencimentoEntrada: dataEntrada,
        entradaPaga,
        comprovanteEntrada,
        numParcelas: numParcelasInt,
        valorParcela: valorParcelaFinal,
        diaVencimento: parseInt(diaVencimento, 10) || 10,
        primeiroVencimento,
        dataPrimeiraParcela: primeiroVencimento,
        formaPagamento,
        formaPagamentoParcelas: formaPagamento,
        formaPagamentoEntrada: formaPagamento,
        gerarTaxaAdm,
        gerouTaxaAdm: gerarTaxaAdm,
        valorTaxaAdm: parseFloat(valorTaxaAdm.replace(',', '.')) || 0,
        mesesTaxaAdm: parseInt(mesesTaxaAdm, 10) || 12,
        diaVencimentoTaxaAdm: parseInt(diaVencimentoTaxaAdm, 10) || 10,
        primeiroVencimentoTaxaAdm,
        dataPrimeiraTaxaAdm: primeiroVencimentoTaxaAdm,
        observacoes
      };

      const res = await fetch('/api/comercial/vendas', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      }
      if (!res.ok || data.error) {
        throw new Error(data.message || `Falha ao lançar a venda (Status ${res.status}).`);
      }

      await syncWithRemote().catch(() => {});

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('comercial-venda-updated', { detail: data }));
      }

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err: any) {
      console.error('Erro ao lançar venda:', err);
      setErrorMsg(err.message || 'Erro inesperado ao registrar venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const VENDA_TABS: {
    id: VendaTabId;
    label: string;
    icon: React.ElementType;
    desc: string;
    badge?: string;
    badgeTone?: 'neutral' | 'emerald' | 'amber';
  }[] = [
    {
      id: 'cotista',
      label: 'Cliente & Embarcação',
      icon: Ship,
      desc: 'Selecione o comprador, a embarcação e a fração da cota que será vinculada ao cotista.',
      badge: cota,
      badgeTone: 'neutral'
    },
    {
      id: 'entrada',
      label: 'Valor & Entrada',
      icon: DollarSign,
      desc: 'Defina o valor de venda da cota, o sinal de entrada e anexe o comprovante de pagamento.',
      badge: entradaPaga ? 'Paga' : valorEntradaNum > 0 ? 'A receber' : undefined,
      badgeTone: entradaPaga ? 'emerald' : 'amber'
    },
    {
      id: 'parcelamento',
      label: 'Parcelamento',
      icon: Layers,
      desc: 'Configure o número de parcelas mensais, datas de vencimento e forma de pagamento do saldo.',
      badge: numParcelasInt > 0 ? `${numParcelasInt}x` : 'À vista',
      badgeTone: 'neutral'
    },
    {
      id: 'taxa_adm',
      label: 'Taxa de Gestão',
      icon: ShieldCheck,
      desc: 'Agende opcionalmente as mensalidades recorrentes da Taxa de Administração Náutica.',
      badge: gerarTaxaAdm ? 'Ativa' : 'Opcional',
      badgeTone: gerarTaxaAdm ? 'amber' : 'neutral'
    },
    {
      id: 'resumo',
      label: 'Observações & Resumo',
      icon: Sparkles,
      desc: 'Revise todos os lançamentos automáticos que serão integrados ao Financeiro e confirme a venda.'
    }
  ];

  const currentTabIndex = VENDA_TABS.findIndex(t => t.id === activeTab);
  const currentTabMeta = VENDA_TABS[currentTabIndex] || VENDA_TABS[0];
  const isLastStep = currentTabIndex === VENDA_TABS.length - 1;

  const handleNextStep = () => {
    setErrorMsg(null);

    // Validações por etapa antes de avançar
    if (activeTab === 'cotista') {
      if (!clienteId) {
        setErrorMsg('Por favor, selecione o cliente comprador antes de avançar.');
        return;
      }
      if (!embarcacaoId) {
        setErrorMsg('Por favor, selecione a embarcação adquirida antes de avançar.');
        return;
      }
    } else if (activeTab === 'entrada') {
      if (valorTotalNum <= 0) {
        setErrorMsg('Informe um valor total de venda válido para prosseguir.');
        return;
      }
    }

    if (currentTabIndex < VENDA_TABS.length - 1) {
      setActiveTab(VENDA_TABS[currentTabIndex + 1].id);
    }
  };

  const formatBRL = (val: number) =>
    `R$ ${(Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* ─── MODAL CONTAINER (Padrão Split View do Comercial) ─── */}
        <div
          className="bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-stone-200/80 w-full max-w-4xl h-[90vh] max-h-[680px] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Lançar Nova Venda de Cota"
        >
          {/* ================= COLUNA LATERAL ESQUERDA ================= */}
          <aside className="w-full md:w-72 bg-stone-50/70 border-b md:border-b-0 md:border-r border-stone-200/70 p-6 flex flex-col justify-between shrink-0">
            <div className="space-y-6">
              {/* Cabeçalho da Coluna Esquerda */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center justify-center text-stone-800 shrink-0">
                    <DollarSign className="w-4 h-4 text-stone-700" />
                  </div>
                  <h3 className="font-bold text-[14px] text-stone-900 tracking-tight">
                    Nova Venda de Cota
                  </h3>
                </div>

                <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                  {selectedClient ? (
                    <>
                      Negociação em andamento para{' '}
                      <span className="font-semibold text-stone-800">{selectedClient.nome}</span>.
                    </>
                  ) : (
                    'Vincula o cliente à embarcação e gera a entrada e parcelas no Financeiro.'
                  )}
                </p>
              </div>

              {/* Menu Vertical de Navegação por Pílulas */}
              <nav className="space-y-1">
                {VENDA_TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 text-stone-600 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                            tab.badgeTone === 'emerald'
                              ? 'bg-emerald-100/80 text-emerald-800'
                              : tab.badgeTone === 'amber'
                              ? 'bg-amber-100/80 text-amber-800'
                              : 'bg-stone-200/80 text-stone-700'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Rodapé da Coluna Esquerda (Resumo Financeiro em Tempo Real) */}
            <div className="pt-4 border-t border-stone-200/60 space-y-2 mt-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-500 font-medium">Valor da Cota:</span>
                <span className="font-bold text-stone-900 tabular-nums">{valorTotalNum > 0 ? formatBRL(valorTotalNum) : '—'}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-500 font-medium">Sinal / Entrada:</span>
                <span className="font-semibold text-emerald-700 tabular-nums">{valorEntradaNum > 0 ? formatBRL(valorEntradaNum) : '—'}</span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-stone-500 pt-0.5">
                <span className="truncate max-w-[135px] font-medium text-stone-600">
                  {selectedBoat ? formatBoatMxx(selectedBoat) : 'Sem embarcação'}
                </span>
                <span className="font-semibold text-stone-800 tabular-nums">
                  {valorTotalNum > 0 && numParcelasInt > 0 ? `${numParcelasInt}x ${formatBRL(valorParcelaFinal)}` : valorTotalNum > 0 ? 'À vista' : '—'}
                </span>
              </div>
            </div>
          </aside>

          {/* ================= COLUNA PRINCIPAL DE CONTEÚDO ================= */}
          <main className="flex-1 flex flex-col min-w-0 bg-white p-6 md:p-8 overflow-hidden">
            {/* Cabeçalho da Seção Ativa + Botão Fechar */}
            <header className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100 shrink-0">
              <div>
                <h2 className="font-bold text-base text-stone-900 tracking-tight">
                  {currentTabMeta.label}
                </h2>
                <p className="text-xs text-stone-500 font-normal mt-0.5">
                  {currentTabMeta.desc}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                title="Fechar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Mensagem de Erro */}
            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold flex items-center gap-2.5 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Corpo do Formulário com Scroll */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
              {/* ─── ABA 1: CLIENTE, EMBARCAÇÃO E COTA ─── */}
              {activeTab === 'cotista' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-stone-700">
                        Cliente Comprador <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsNewClientModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200/90 hover:bg-stone-100 text-stone-700 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                      >
                        <UserPlus className="w-3 h-3 text-stone-500" />
                        Novo Cliente
                      </button>
                    </div>

                    <ComercialSearchableSelect
                      options={clientSelectOptions}
                      value={clienteId}
                      onChange={setClienteId}
                      placeholder="-- Pesquise ou selecione um cliente cadastrado --"
                      searchPlaceholder="Pesquisar por nome, CPF ou telefone..."
                      icon={<User className="w-3.5 h-3.5" />}
                      emptyMessage="Nenhum cliente encontrado com esse termo."
                      emptyActionLabel="Cadastrar Novo Cliente"
                      onEmptyAction={() => setIsNewClientModalOpen(true)}
                    />

                    {selectedClient && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500 pt-0.5">
                        <span>
                          CPF: <strong className="text-stone-700 tabular-nums">{selectedClient.cpf || 'Não informado'}</strong>
                        </span>
                        <span>
                          Telefone: <strong className="text-stone-700 tabular-nums">{selectedClient.telefone || 'Não informado'}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">
                        Embarcação <span className="text-rose-500">*</span>
                      </label>
                      <ComercialSearchableSelect
                        options={boatSelectOptions}
                        value={embarcacaoId}
                        onChange={setEmbarcacaoId}
                        placeholder="-- Pesquise a Embarcação --"
                        searchPlaceholder="Pesquisar embarcação por nome, código ou modelo..."
                        icon={<Ship className="w-3.5 h-3.5" />}
                        emptyMessage="Nenhuma embarcação encontrada."
                      />
                    </div>

                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">
                        Data da Venda <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={dataVenda}
                        onChange={e => handleDataVendaChange(e.target.value)}
                        required
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold tabular-nums focus:outline-hidden focus:border-stone-400"
                      />
                    </div>
                  </div>

                  {/* Seleção Visual da Cota Padronizada */}
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700">
                        Cota Adquirida <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-stone-500">
                        Selecione a cota disponível na embarcação ({realOccupiedCount}/{boatCotasList.length} ocupadas • {Math.max(0, boatCotasList.length - realOccupiedCount)} {Math.max(0, boatCotasList.length - realOccupiedCount) === 1 ? 'livre' : 'livres'})
                      </span>
                    </div>

                    {clientExistingCotas.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          Este cliente já possui a(s) cota(s) <strong>{clientExistingCotas.join(', ')}</strong> nesta embarcação. Esta venda adicionará mais uma cota à titularidade dele.
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {boatCotasList.map(cItem => {
                        const ocupante = cotasOcupadasMap.get(cItem);
                        const isSelected = normalizeCotaCode(cota, 1) === cItem;
                        const isMex = ocupante ? isInternalMexicano(ocupante.clienteId) || isInternalMexicano(ocupante.clienteNome) : false;
                        const isOccupiedByRealClient = !!ocupante && !isMex;
                        const isEstoqueMexicano = isMex || !ocupante;

                        return (
                          <button
                            key={cItem}
                            type="button"
                            disabled={isOccupiedByRealClient}
                            onClick={() => setCota(cItem)}
                            title={
                              isOccupiedByRealClient
                                ? `Ocupada por: ${ocupante.clienteNome}`
                                : isMex
                                ? `Cota ${cItem} disponível (Estoque El Mexicano)`
                                : `Cota ${cItem} livre`
                            }
                            className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all tabular-nums ${
                              isSelected
                                ? 'bg-mx-ink text-white border-mx-ink shadow-xs cursor-pointer'
                                : isOccupiedByRealClient
                                ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-75'
                                : isMex
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300 cursor-pointer'
                                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:border-stone-300 cursor-pointer'
                            }`}
                          >
                            <span>{cItem}</span>
                            <span
                              className={`text-[9px] font-medium truncate max-w-full ${
                                isSelected
                                  ? 'text-white/80'
                                  : isOccupiedByRealClient
                                  ? 'text-stone-400'
                                  : isMex
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {isOccupiedByRealClient ? 'Vendida' : isMex ? 'Estoque' : 'Livre'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {cotasOcupadasMap.get(normalizeCotaCode(cota, 1)) && (
                      (() => {
                        const o = cotasOcupadasMap.get(normalizeCotaCode(cota, 1));
                        const isMexOccupant = isInternalMexicano(o?.clienteId) || isInternalMexicano(o?.clienteNome);
                        if (isMexOccupant) {
                          return (
                            <p className="text-[11px] text-emerald-800 font-medium pt-0.5 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Cota <strong>{normalizeCotaCode(cota, 1)}</strong> disponível no estoque próprio da <strong>El Mexicano</strong> (pronta para venda).</span>
                            </p>
                          );
                        }
                        return (
                          <p className="text-[11px] text-amber-800 font-medium pt-0.5">
                            Atenção: A cota {normalizeCotaCode(cota, 1)} está ocupada por <strong>{o?.clienteNome}</strong>.
                          </p>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* ─── ABA 2: VALOR DA VENDA & ENTRADA ─── */}
              {activeTab === 'entrada' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">
                        Valor Total da Cota (R$) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={valorTotal}
                        onChange={e => {
                          setValorTotal(e.target.value);
                          setValorParcelaManual('');
                        }}
                        required
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-sm font-bold text-stone-900 tabular-nums focus:outline-hidden focus:border-stone-400 placeholder:text-stone-300"
                      />
                      <span className="text-[10px] text-stone-500 block">
                        Destino: {defaultConfigInfo.vendaPadraoEmpresa}
                      </span>
                    </div>

                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">
                        Valor da Entrada (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={valorEntrada}
                        onChange={e => {
                          setValorEntrada(e.target.value);
                          setValorParcelaManual('');
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-sm font-bold text-emerald-700 tabular-nums focus:outline-hidden focus:border-emerald-600 placeholder:text-stone-300"
                      />
                      <span className="text-[10px] text-stone-500 block tabular-nums">
                        Saldo: {formatBRL(saldoRemanescente)}
                      </span>
                    </div>

                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">
                        Vencimento / Pagamento
                      </label>
                      <input
                        type="date"
                        value={dataEntrada}
                        onChange={e => setDataEntrada(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-900 tabular-nums focus:outline-hidden focus:border-stone-400"
                      />
                      <span className="text-[10px] text-stone-500 block">
                        Data do sinal no Financeiro
                      </span>
                    </div>
                  </div>

                  {/* Box de Status da Entrada + Upload de Comprovante */}
                  {valorEntradaNum > 0 && (
                    <div
                      className={`p-4 rounded-2xl border transition-all ${
                        entradaPaga
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-stone-50/50 border-stone-200/70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={entradaPaga}
                            onChange={e => setEntradaPaga(e.target.checked)}
                            className="mt-0.5 sm:mt-0 w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-stone-900 flex flex-wrap items-center gap-1.5">
                              Entrada já foi paga pelo cliente
                              {entradaPaga && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                  <Check className="w-3 h-3" /> Liquidada no Financeiro
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] text-stone-500 mt-0.5">
                              {entradaPaga
                                ? 'O registro da entrada será lançado como PAGO e somará imediatamente ao caixa.'
                                : 'O registro da entrada será lançado como A RECEBER (pendente) na data informada.'}
                            </span>
                          </div>
                        </label>

                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleUploadComprovante}
                            className="hidden"
                          />
                          {comprovanteEntrada ? (
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                              <a
                                href={comprovanteEntrada}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1.5 max-w-[160px] truncate"
                                title={comprovanteNome || 'Ver comprovante'}
                              >
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                {comprovanteNome || 'Comprovante anexado'}
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  setComprovanteEntrada(null);
                                  setComprovanteNome(null);
                                }}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                title="Remover comprovante"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isUploadingComprovante}
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {isUploadingComprovante ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-600" />
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5 text-stone-600" />
                                  Anexar Comprovante
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── ABA 3: PARCELAMENTO DO SALDO REMANESCENTE ─── */}
              {activeTab === 'parcelamento' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-stone-600">
                      Saldo remanescente a parcelar:{' '}
                      <strong className="text-stone-900 font-bold tabular-nums">
                        {formatBRL(saldoRemanescente)}
                      </strong>
                    </div>
                    {numParcelasInt > 0 && valorParcelaFinal > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-mx-ink-100 text-mx-ink text-xs font-semibold tabular-nums">
                        {numParcelasInt}x de {formatBRL(valorParcelaFinal)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">
                        Nº de Parcelas
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        value={numParcelas}
                        onChange={e => {
                          setNumParcelas(e.target.value);
                          setValorParcelaManual('');
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-sm font-bold text-stone-900 tabular-nums focus:outline-hidden focus:border-stone-400"
                      />
                    </div>

                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">
                        Valor da Parcela (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorParcelaManual !== '' ? valorParcelaManual : valorParcelaCalculado}
                        onChange={e => setValorParcelaManual(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-sm font-bold text-stone-900 tabular-nums focus:outline-hidden focus:border-stone-400"
                      />
                    </div>

                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">
                        Dia de Vencimento
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={diaVencimento}
                        onChange={e => handleDiaVencimentoChange(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-900 tabular-nums focus:outline-hidden focus:border-stone-400"
                      />
                    </div>

                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 block">
                        1º Vencimento
                      </label>
                      <input
                        type="date"
                        value={primeiroVencimento}
                        onChange={e => setPrimeiroVencimento(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-900 tabular-nums focus:outline-hidden focus:border-stone-400"
                      />
                    </div>
                  </div>

                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 block">
                      Forma de Pagamento Padrão
                    </label>
                    <ComercialSearchableSelect
                      options={paymentMethodOptions}
                      value={formaPagamento}
                      onChange={setFormaPagamento}
                      placeholder="Selecione a forma de pagamento..."
                      searchPlaceholder="Pesquisar forma de pagamento..."
                      icon={<CreditCard className="w-3.5 h-3.5" />}
                    />
                  </div>

                  {/* Prévia do cronograma */}
                  {previewParcelas.length > 0 && (
                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowSchedulePreview(prev => !prev)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-stone-700 hover:text-stone-900 cursor-pointer"
                      >
                        <span>
                          Cronograma de vencimentos ({previewParcelas.length} parcelas)
                        </span>
                        {showSchedulePreview ? (
                          <ChevronUp className="w-4 h-4 text-stone-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-500" />
                        )}
                      </button>

                      {showSchedulePreview && (
                        <div className="max-h-48 overflow-y-auto pt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {previewParcelas.map(p => (
                            <div
                              key={p.numero}
                              className="bg-white px-3 py-2 rounded-xl border border-stone-200/80 flex items-center justify-between text-[11px] tabular-nums"
                            >
                              <span className="font-semibold text-stone-700">
                                {p.numero}/{numParcelasInt} • {p.vencimento.split('-').reverse().join('/')}
                              </span>
                              <span className="font-bold text-stone-900">
                                R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── ABA 4: TAXA DE ADMINISTRAÇÃO OPCIONAL ─── */}
              {activeTab === 'taxa_adm' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      gerarTaxaAdm
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-stone-50/50 border-stone-200/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={gerarTaxaAdm}
                          onChange={e => setGerarTaxaAdm(e.target.checked)}
                          className="mt-0.5 sm:mt-0 w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-stone-900 block">
                            Gerar mensalidades de Taxa de Administração
                          </span>
                          <span className="text-[11px] text-stone-500 block mt-0.5">
                            Agenda automaticamente as recorrências mensais de gestão náutica ({defaultConfigInfo.taxaAdmPadraoEmpresa})
                          </span>
                        </div>
                      </label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full shrink-0">
                        {gerarTaxaAdm ? 'Ativado' : 'Opcional'}
                      </span>
                    </div>
                  </div>

                  {gerarTaxaAdm && (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                          <label className="text-xs font-bold text-stone-700 block">
                            Valor Mensal (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorTaxaAdm}
                            onChange={e => setValorTaxaAdm(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-sm font-bold text-amber-800 tabular-nums focus:outline-hidden focus:border-amber-500"
                          />
                        </div>

                        <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-stone-700 block">
                              Meses de Recorrência
                            </label>
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200/80">
                              Até Dez/{getYearFromDate(primeiroVencimentoTaxaAdm)}
                            </span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={mesesTaxaAdm}
                            onChange={e => setMesesTaxaAdm(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-sm font-bold text-stone-900 tabular-nums focus:outline-hidden focus:border-stone-400"
                          />
                          {/* Atalhos inteligentes de seleção */}
                          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setMesesTaxaAdm(String(calculateMonthsUntilDecember(primeiroVencimentoTaxaAdm)))}
                              className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                                parseInt(mesesTaxaAdm, 10) === calculateMonthsUntilDecember(primeiroVencimentoTaxaAdm)
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              Até Dezembro ({calculateMonthsUntilDecember(primeiroVencimentoTaxaAdm)}x)
                            </button>
                            <button
                              type="button"
                              onClick={() => setMesesTaxaAdm('12')}
                              className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                                parseInt(mesesTaxaAdm, 10) === 12
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              12x
                            </button>
                            <button
                              type="button"
                              onClick={() => setMesesTaxaAdm('24')}
                              className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                                parseInt(mesesTaxaAdm, 10) === 24
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              24x
                            </button>
                          </div>
                        </div>

                        <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                          <label className="text-xs font-bold text-stone-700 block">
                            Dia de Vencimento
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={diaVencimentoTaxaAdm}
                            onChange={e => handleDiaVencimentoTaxaAdmChange(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-900 tabular-nums focus:outline-hidden focus:border-stone-400"
                          />
                        </div>

                        <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-1.5">
                          <label className="text-xs font-bold text-stone-700 block">
                            1º Vencimento (Taxa Adm)
                          </label>
                          <input
                            type="date"
                            value={primeiroVencimentoTaxaAdm}
                            onChange={e => handlePrimeiroVencimentoTaxaAdmChange(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-900 tabular-nums focus:outline-hidden focus:border-stone-400"
                          />
                        </div>
                      </div>

                      {/* Card explicativo inteligente */}
                      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-900">
                            Previsão inteligente até Dezembro de {getYearFromDate(primeiroVencimentoTaxaAdm)}:
                          </p>
                          <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                            Serão agendadas <strong>{mesesTaxaAdm || 0} parcelas mensais</strong> de {formatBRL(parseFloat(valorTaxaAdm.replace(',', '.')) || 0)} a partir de <strong>{formatDateBR(primeiroVencimentoTaxaAdm)}</strong> para {defaultConfigInfo.taxaAdmPadraoEmpresa}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── ABA 5: OBSERVAÇÕES & RESUMO DE AUTOMAÇÃO ─── */}
              {activeTab === 'resumo' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                    <label className="text-xs font-bold text-stone-700 block">
                      Observações da Negociação
                    </label>
                    <textarea
                      rows={3}
                      value={observacoes}
                      onChange={e => setObservacoes(e.target.value)}
                      placeholder="Condições especiais negociadas, detalhes sobre a entrada ou observações para o financeiro..."
                      className="w-full p-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-hidden focus:border-stone-400 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Resumo do que será executado automaticamente */}
                  <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                      <Sparkles className="w-4 h-4 text-mx-ink" />
                      <span>Resumo da Automação ao Confirmar Venda</span>
                    </div>
                    <ul className="text-xs text-stone-600 space-y-2 pl-0.5">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Vínculo imediato de{' '}
                          <strong className="text-stone-900">{selectedClient?.nome || 'Cliente não selecionado'}</strong> à embarcação{' '}
                          <strong className="text-stone-900">
                            {selectedBoat ? formatBoatMxx(selectedBoat) : 'Embarcação não selecionada'} ({cota})
                          </strong>
                        </span>
                      </li>
                      {valorEntradaNum > 0 && (
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="tabular-nums">
                            1 Lançamento de <strong>Entrada</strong> de{' '}
                            <strong className="text-emerald-700">{formatBRL(valorEntradaNum)}</strong>{' '}
                            ({entradaPaga ? 'Status: PAGO' : 'Status: A RECEBER'}) em{' '}
                            <strong className="text-stone-900">{defaultConfigInfo.vendaPadraoEmpresa}</strong>
                          </span>
                        </li>
                      )}
                      {numParcelasInt > 0 && valorParcelaFinal > 0 && (
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="tabular-nums">
                            <strong>{numParcelasInt} Parcelas de Cota</strong> de{' '}
                            <strong className="text-stone-900">{formatBRL(valorParcelaFinal)}</strong>{' '}
                            em Parcelas Fixas ({defaultConfigInfo.vendaPadraoEmpresa})
                          </span>
                        </li>
                      )}
                      {gerarTaxaAdm && (
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span className="tabular-nums">
                            <strong>{parseInt(mesesTaxaAdm, 10) || 12} Mensalidades de Taxa de Administração</strong> de{' '}
                            <strong className="text-amber-800">
                              {formatBRL(parseFloat(valorTaxaAdm.replace(',', '.')) || 0)}
                            </strong>{' '}
                            {parseInt(mesesTaxaAdm, 10) === calculateMonthsUntilDecember(primeiroVencimentoTaxaAdm)
                              ? `(lançamentos até Dezembro de ${getYearFromDate(primeiroVencimentoTaxaAdm)} em ${defaultConfigInfo.taxaAdmPadraoEmpresa})`
                              : `(${mesesTaxaAdm} meses em ${defaultConfigInfo.taxaAdmPadraoEmpresa})`}
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </form>

            {/* ================= RODAPÉ PRINCIPAL DO MODAL ================= */}
            <footer className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3 shrink-0">
              {/* Botão Anterior na Esquerda */}
              <div className="flex items-center gap-1.5">
                {currentTabIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setActiveTab(VENDA_TABS[currentTabIndex - 1].id);
                    }}
                    className="h-9 px-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </button>
                )}
              </div>

              {/* Ações Principais na Direita */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  Cancelar
                </button>

                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="h-9 px-5 rounded-xl bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Próximo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting}
                    className="h-9 px-5 rounded-xl bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-semibold shadow-[0_4px_12px_-4px_rgba(43,17,32,0.6)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Registrando Venda…</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirmar Venda</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* Modal Rápido para Cadastrar Novo Cliente sem sair do Lançamento de Venda */}
      <ComercialClientModal
        isOpen={isNewClientModalOpen}
        editingClient={null}
        boats={boats}
        clients={clients}
        onClose={() => setIsNewClientModalOpen(false)}
        onSave={savedClient => {
          const updatedClients = clientDB.getAll();
          setClients([...updatedClients]);
          if (savedClient?.id) {
            setClienteId(savedClient.id);
            if (savedClient.embarcacaoId && !embarcacaoId) {
              setEmbarcacaoId(savedClient.embarcacaoId);
            }
          }
          setIsNewClientModalOpen(false);
        }}
      />
    </>
  );
}
