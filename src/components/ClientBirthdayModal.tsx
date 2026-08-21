import React, { useState, useMemo } from 'react';
import { 
  Cake, Calendar, Sparkles, Search, Phone, Mail, 
  X, Download, Eye, Edit2, ChevronLeft, ChevronRight, Copy, Check, 
  Ship, MessageCircle
} from 'lucide-react';
import { Cliente, Embarcacao } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClientBirthdayModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Cliente[];
  boats: Embarcacao[];
  onViewProfile?: (clientId: string) => void;
  onEditClient?: (client: Cliente) => void;
}

export interface ParsedBirthday {
  client: Cliente;
  day: number;
  month: number;
  year?: number;
  age?: number;
  turningAge?: number;
  formattedDate: string;
  isToday: boolean;
  daysUntil: number;
}

export const MONTHS = [
  { id: 1, name: 'Janeiro', short: 'Jan' },
  { id: 2, name: 'Fevereiro', short: 'Fev' },
  { id: 3, name: 'Março', short: 'Mar' },
  { id: 4, name: 'Abril', short: 'Abr' },
  { id: 5, name: 'Maio', short: 'Mai' },
  { id: 6, name: 'Junho', short: 'Jun' },
  { id: 7, name: 'Julho', short: 'Jul' },
  { id: 8, name: 'Agosto', short: 'Ago' },
  { id: 9, name: 'Setembro', short: 'Set' },
  { id: 10, name: 'Outubro', short: 'Out' },
  { id: 11, name: 'Novembro', short: 'Nov' },
  { id: 12, name: 'Dezembro', short: 'Dez' }
];

export function parseClientBirthday(client: Cliente): ParsedBirthday | null {
  if (!client.dataNascimento) return null;

  const raw = client.dataNascimento.trim();
  if (!raw) return null;

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  // Handle ISO string / YYYY-MM-DD
  if (raw.includes('-')) {
    const cleanDate = raw.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      }
    }
  } else if (raw.includes('/')) {
    // DD/MM/YYYY
    const parts = raw.split('/');
    if (parts.length >= 2) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      if (parts.length >= 3) {
        year = parseInt(parts[2], 10);
      }
    }
  }

  if (!day || !month || isNaN(day) || isNaN(month) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const isToday = day === currentDay && month === currentMonth;

  // Calculate age if year is provided and reasonable
  let age: number | undefined;
  let turningAge: number | undefined;
  if (year && year > 1900 && year <= currentYear) {
    turningAge = currentYear - year;
    const hasCelebratedThisYear = (month < currentMonth) || (month === currentMonth && day <= currentDay);
    age = hasCelebratedThisYear ? (currentYear - year) : (currentYear - year - 1);
  }

  // Calculate days until next birthday
  const nextBirthdayDate = new Date(currentYear, month - 1, day);
  if (nextBirthdayDate < new Date(currentYear, currentMonth - 1, currentDay)) {
    nextBirthdayDate.setFullYear(currentYear + 1);
  }
  const diffTime = nextBirthdayDate.getTime() - new Date(currentYear, currentMonth - 1, currentDay).getTime();
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const monthObj = MONTHS.find(m => m.id === month);
  const formattedDate = `${day.toString().padStart(2, '0')} de ${monthObj ? monthObj.name : month}${year ? ` de ${year}` : ''}`;

  return {
    client,
    day,
    month,
    year: year || undefined,
    age,
    turningAge,
    formattedDate,
    isToday,
    daysUntil
  };
}

export default function ClientBirthdayModal({
  isOpen,
  onClose,
  clients,
  boats,
  onViewProfile,
  onEditClient
}: ClientBirthdayModalProps) {
  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(currentMonth);
  const [search, setSearch] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'day-asc' | 'name-asc' | 'closest'>('day-asc');
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);

  // Parse all clients with valid birth dates
  const allParsedBirthdays = useMemo(() => {
    return clients
      .map(client => parseClientBirthday(client))
      .filter((item): item is ParsedBirthday => item !== null);
  }, [clients]);

  // Count birthdays per month
  const birthdaysPerMonth = useMemo(() => {
    const counts: Record<number, number> = {};
    MONTHS.forEach(m => { counts[m.id] = 0; });
    allParsedBirthdays.forEach(b => {
      if (counts[b.month] !== undefined) {
        counts[b.month]++;
      }
    });
    return counts;
  }, [allParsedBirthdays]);

  // Today's birthdays
  const todaysBirthdays = useMemo(() => {
    return allParsedBirthdays.filter(b => b.isToday);
  }, [allParsedBirthdays]);

  // Filtered and sorted birthdays
  const filteredBirthdays = useMemo(() => {
    return allParsedBirthdays
      .filter(item => {
        // Month filter
        if (selectedMonth !== 'all' && item.month !== selectedMonth) {
          return false;
        }

        // Empresa filter
        if (filterEmpresa !== 'all') {
          const clientEmpresas = item.client.empresas || ['VALE'];
          if (!clientEmpresas.includes(filterEmpresa)) {
            return false;
          }
        }

        // Search text
        if (search.trim()) {
          const q = search.toLowerCase();
          const nameMatch = (item.client.nome || '').toLowerCase().includes(q);
          const phoneMatch = (item.client.telefone || '').includes(q);
          const emailMatch = (item.client.email || '').toLowerCase().includes(q);
          const dayMatch = item.day.toString() === q.trim();
          
          // Boat match
          const linkedBoatIds = item.client.embarcacoes?.map(e => e.embarcacaoId) || [item.client.embarcacaoId];
          const boatMatch = boats.some(b => linkedBoatIds.includes(b.id) && b.nome.toLowerCase().includes(q));

          if (!nameMatch && !phoneMatch && !emailMatch && !dayMatch && !boatMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'day-asc') {
          if (a.month !== b.month) return a.month - b.month;
          return a.day - b.day;
        }
        if (sortBy === 'name-asc') {
          return (a.client.nome || '').localeCompare(b.client.nome || '');
        }
        if (sortBy === 'closest') {
          return a.daysUntil - b.daysUntil;
        }
        return 0;
      });
  }, [allParsedBirthdays, selectedMonth, filterEmpresa, search, sortBy, boats]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(12);
    } else if (selectedMonth === 1) {
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(1);
    } else if (selectedMonth === 12) {
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const getBirthdayGreeting = (b: ParsedBirthday) => {
    const firstName = (b.client.nome || 'Cliente').split(' ')[0];
    return `Olá *${firstName}*! 🎂🎉\n\nA equipe da Vila Náutica deseja a você um Feliz Aniversário! Muita saúde, sucesso, realizações e excelentes momentos navegando conosco! 🚤⚓🍾`;
  };

  const handleOpenWhatsApp = (b: ParsedBirthday) => {
    if (!b.client.telefone) return;
    const cleanPhone = b.client.telefone.replace(/\D/g, '');
    const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(getBirthdayGreeting(b));
    window.open(`https://wa.me/${phoneWithDDI}?text=${text}`, '_blank');
  };

  const handleCopyGreeting = (b: ParsedBirthday) => {
    const text = getBirthdayGreeting(b);
    navigator.clipboard.writeText(text);
    setCopiedClientId(b.client.id);
    setTimeout(() => setCopiedClientId(null), 2500);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 14;

    // Header Banner
    doc.setFillColor(236, 72, 153); // Pink-500
    doc.rect(14, y, pageWidth - 28, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('VILA NÁUTICA - RELATÓRIO DE ANIVERSARIANTES', 20, y + 9);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const monthTitle = selectedMonth === 'all' 
      ? 'Todos os Meses' 
      : `${MONTHS.find(m => m.id === selectedMonth)?.name} (${filteredBirthdays.length} aniversariantes)`;
    doc.text(`Mês Selecionado: ${monthTitle}`, 20, y + 16);

    const nowStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Gerado em: ${nowStr}`, pageWidth - 20, y + 16, { align: 'right' });

    y += 28;

    const tableColumn = ["Dia", "Nome do Cliente", "Idade / Nasc.", "Telefone", "Embarcações (Cota)", "Status"];
    const tableRows = filteredBirthdays.map(b => {
      const monthShort = MONTHS.find(m => m.id === b.month)?.short || '';
      const dayStr = `${b.day.toString().padStart(2, '0')} / ${monthShort}`;
      const nome = b.client.nome || '-';
      const idadeStr = b.turningAge ? `${b.turningAge} anos (${b.year || '-'})` : '-';
      const telefone = b.client.telefone || '-';
      
      const linkedBoatsList = b.client.embarcacoes && b.client.embarcacoes.length > 0
        ? b.client.embarcacoes
        : [{ embarcacaoId: b.client.embarcacaoId || '', cota: b.client.cota || '' }];
        
      const embarcacoesStr = linkedBoatsList.map(eb => {
        const boatName = boats.find(boat => boat.id === eb.embarcacaoId)?.nome || "Embarcação";
        return `${boatName} (${eb.cota || 'Cota'})`;
      }).join("\n");

      const status = b.client.statusFinanceiro === 'inadimplente' ? 'Inadimplente' : 'Em Dia';

      return [dayStr, nome, idadeStr, telefone, embarcacoesStr, status];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: y,
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [219, 39, 119], textColor: [255, 255, 255], fontStyle: 'bold' }, // Pink-600
      alternateRowStyles: { fillColor: [253, 242, 248] }, // Pink-50
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { cellWidth: 26 },
        3: { cellWidth: 32 },
        4: { cellWidth: 40 },
        5: { cellWidth: 20, halign: 'center' }
      }
    });

    const monthFileName = selectedMonth === 'all' ? 'todos_meses' : (MONTHS.find(m => m.id === selectedMonth)?.name.toLowerCase() || 'mes');
    doc.save(`aniversariantes_${monthFileName}_${new Date().getFullYear()}.pdf`);
  };

  const selectedMonthName = selectedMonth === 'all' 
    ? 'Todos os Meses' 
    : MONTHS.find(m => m.id === selectedMonth)?.name || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header Superior */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pink-100 bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-md shadow-pink-200 shrink-0">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Aniversariantes</h3>
                {todaysBirthdays.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    {todaysBirthdays.length} {todaysBirthdays.length === 1 ? 'Aniversariante Hoje!' : 'Aniversariantes Hoje!'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Acompanhe as datas comemorativas dos clientes e envie felicitações personalizadas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
              title="Exportar lista de aniversariantes em PDF"
            >
              <Download className="w-4 h-4 text-pink-600" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200/70 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Month Selector Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-800 px-2 min-w-[130px] text-center">
                {selectedMonthName}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
                <Cake className="w-3.5 h-3.5 text-pink-500" />
                <span>{filteredBirthdays.length} no filtro</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{allParsedBirthdays.length} de {clients.length} cadastrados</span>
              </div>
            </div>
          </div>

          {/* Month Pills Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Todos ({allParsedBirthdays.length})
            </button>

            {MONTHS.map(m => {
              const isSelected = selectedMonth === m.id;
              const isCurrent = currentMonth === m.id;
              const count = birthdaysPerMonth[m.id] || 0;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMonth(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer relative ${
                    isSelected
                      ? 'bg-pink-600 text-white shadow-xs shadow-pink-200'
                      : isCurrent
                      ? 'bg-pink-50 border border-pink-300 text-pink-700 hover:bg-pink-100'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{m.short}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : count > 0
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {count}
                  </span>
                  {isCurrent && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 absolute -top-0.5 -right-0.5 ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, embarcação ou dia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white text-slate-800"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Empresa Filter */}
            <select
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 font-semibold text-slate-700 cursor-pointer"
            >
              <option value="all">Todas as Empresas</option>
              <option value="VALE">VALE NÁUTICA</option>
              <option value="MARINA">MARINA</option>
              <option value="MEXICANO">MEXICANO</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 font-semibold text-slate-700 cursor-pointer"
            >
              <option value="day-asc">Ordenar por Dia (1 → 31)</option>
              <option value="name-asc">Nome (A → Z)</option>
              <option value="closest">Mais Próximos de Hoje</option>
            </select>
          </div>
        </div>

        {/* Content List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-3">
          {filteredBirthdays.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredBirthdays.map((b) => {
                const monthObj = MONTHS.find(m => m.id === b.month);
                const hasPhone = Boolean(b.client.telefone);
                const linkedBoatsList = b.client.embarcacoes && b.client.embarcacoes.length > 0
                  ? b.client.embarcacoes
                  : [{ embarcacaoId: b.client.embarcacaoId || '', cota: b.client.cota || '' }];

                return (
                  <div
                    key={b.client.id}
                    className={`bg-white rounded-2xl p-4 border transition-all shadow-xs hover:shadow-md flex flex-col justify-between ${
                      b.isToday 
                        ? 'border-amber-300 ring-2 ring-amber-400/40 bg-gradient-to-br from-amber-50/30 via-white to-pink-50/30' 
                        : 'border-slate-200 hover:border-pink-200'
                    }`}
                  >
                    <div>
                      {/* Top Row: Date Badge & Client Info */}
                      <div className="flex items-start gap-3.5">
                        {/* Big Date Badge */}
                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${
                          b.isToday
                            ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-200'
                            : 'bg-pink-50 text-pink-700 border-pink-200'
                        }`}>
                          <span className="text-lg font-black leading-none">{b.day.toString().padStart(2, '0')}</span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider mt-0.5">
                            {monthObj?.short || ''}
                          </span>
                        </div>

                        {/* Name & Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 
                              onClick={() => onViewProfile && onViewProfile(b.client.id)}
                              className="font-bold text-slate-900 text-sm truncate hover:text-pink-600 cursor-pointer transition-colors"
                              title="Ver ficha do cliente"
                            >
                              {b.client.nome}
                            </h4>
                            {b.isToday && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
                                Hoje! 🎉
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                            {b.turningAge ? (
                              <span className="inline-flex items-center gap-1 text-pink-700 font-bold bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                                <Cake className="w-3 h-3 text-pink-600" />
                                Completa {b.turningAge} anos {b.year && `(${b.year})`}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">
                                {b.formattedDate}
                              </span>
                            )}

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              b.client.statusFinanceiro === 'inadimplente'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {b.client.statusFinanceiro === 'inadimplente' ? 'Inadimplente' : 'Em Dia'}
                            </span>
                          </div>

                          {/* Linked Boats */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {linkedBoatsList.map((eb, idx) => {
                              const boat = boats.find(boatItem => boatItem.id === eb.embarcacaoId);
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors"
                                >
                                  <Ship className="w-3 h-3 text-slate-500" />
                                  <span>{boat ? boat.nome : 'Embarcação'}</span>
                                  {eb.cota && <span className="font-bold text-slate-900">({eb.cota})</span>}
                                </span>
                              );
                            })}
                          </div>

                          {/* Contact Info */}
                          <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                            {b.client.telefone && (
                              <p className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="font-medium font-mono">{b.client.telefone}</span>
                              </p>
                            )}
                            {b.client.email && (
                              <p className="flex items-center gap-1.5 truncate">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{b.client.email}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {onViewProfile && (
                          <button
                            type="button"
                            onClick={() => onViewProfile(b.client.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar Perfil Completo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {onEditClient && (
                          <button
                            type="button"
                            onClick={() => onEditClient(b.client)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar Dados do Cliente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyGreeting(b)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Copiar mensagem de parabéns"
                        >
                          {copiedClientId === b.client.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {hasPhone ? (
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(b)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                          title="Enviar felicitações no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Dar Parabéns</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Sem telefone
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto">
                <Cake className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Nenhum aniversariante encontrado
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {selectedMonth === 'all' 
                  ? 'Não há clientes cadastrados com data de nascimento correspondente aos filtros.' 
                  : `Nenhum cliente cadastrado faz aniversário em ${selectedMonthName}.`}
              </p>
              {selectedMonth !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth('all')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Ver todos os meses
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 font-medium">
            Exibindo <strong className="text-slate-800">{filteredBirthdays.length}</strong> aniversariante(s) em <strong className="text-slate-800">{selectedMonthName}</strong>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
