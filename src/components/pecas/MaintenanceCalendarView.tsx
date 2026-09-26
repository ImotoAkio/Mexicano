import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Wrench, 
  Ship, 
  Clock, 
  MapPin, 
  CheckCircle,
  Plus
} from 'lucide-react';
import { Manutencao, Embarcacao } from '../../types';
import { getBoatCode } from '../../utils/boatUtils';

interface MaintenanceCalendarViewProps {
  manutencoes: Manutencao[];
  embarcacoes: Embarcacao[];
  onOpenOS: (item: Manutencao) => void;
}

export default function MaintenanceCalendarView({
  manutencoes,
  embarcacoes,
  onOpenOS
}: MaintenanceCalendarViewProps) {
  
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 7, 1)); // Default August 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Generate days grid for month
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Empty lead-in slots from previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Find OSs associated with this date (by prazoEntrega, dataChamado or dataSaida)
      const dayEvents = manutencoes.filter(m => {
        return m.prazoEntrega === dateStr || m.dataChamado === dateStr || m.dataSaida === dateStr;
      });

      days.push({
        day,
        dateStr,
        events: dayEvents
      });
    }

    return days;
  }, [year, month, manutencoes]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="p-6 overflow-y-auto h-full font-sans bg-[#f3f7f5]/80 custom-scrollbar space-y-5">
      
      {/* Calendar Header & Controls */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center text-[#186b77] border border-teal-200/60">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 capitalize tracking-tight">{monthName}</h2>
            <p className="text-xs text-slate-400 font-medium">Cronograma de entradas, SLAs de entrega e prazos de oficinas</p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Hoje
          </button>
          
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Grid Container */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
        
        {/* Week Days Header */}
        <div className="grid grid-cols-7 gap-2 text-center pb-2 border-b border-slate-100">
          {weekDays.map((d, i) => (
            <div key={i} className="text-xs font-black uppercase text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2 auto-rows-fr">
          {calendarGrid.map((item, idx) => {
            if (!item) {
              return <div key={idx} className="min-h-[100px] bg-slate-50/50 rounded-2xl border border-slate-100/50" />;
            }

            const isToday = item.dateStr === new Date().toISOString().split('T')[0];

            return (
              <div 
                key={idx}
                className={`min-h-[110px] p-2 rounded-2xl border flex flex-col justify-between transition-all ${
                  isToday 
                    ? 'bg-teal-50/40 border-[#186b77] shadow-2xs' 
                    : 'bg-white border-slate-200/70 hover:border-slate-300'
                }`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${isToday ? 'bg-[#186b77] text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
                    {item.day}
                  </span>
                  {item.events.length > 0 && (
                    <span className="text-[10px] font-extrabold text-[#186b77] bg-teal-50 px-1.5 py-0.5 rounded">
                      {item.events.length} OS
                    </span>
                  )}
                </div>

                {/* Day Events Stack */}
                <div className="space-y-1.5 my-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                  {item.events.map(ev => {
                    const boat = embarcacoes.find(b => b.id === ev.embarcacaoId);
                    const osCode = ev.codigoOS || ('OS-' + ev.id.substring(0, 5).toUpperCase());

                    return (
                      <div
                        key={ev.id}
                        onClick={() => onOpenOS(ev)}
                        className={`p-1.5 rounded-xl border text-[10px] font-extrabold cursor-pointer hover:shadow-2xs transition-all ${
                          ev.status === 'concluido' ? 'bg-purple-50 text-purple-900 border-purple-200' :
                          ev.status === 'orcamento_pendente' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                          ev.status === 'fila_espera' ? 'bg-pink-50 text-pink-900 border-pink-200' :
                          'bg-blue-50 text-blue-900 border-blue-200'
                        }`}
                        title={`${osCode} - ${getBoatCode(boat)}: ${ev.tituloChamado}`}
                      >
                        <div className="truncate font-black">{osCode} • {getBoatCode(boat)}</div>
                        <div className="text-[9px] font-semibold text-slate-500 truncate">{ev.tituloChamado}</div>
                      </div>
                    );
                  })}
                </div>

                {item.events.length === 0 && (
                  <div className="text-[10px] text-slate-300 font-medium italic text-center py-2">
                    Livre
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
