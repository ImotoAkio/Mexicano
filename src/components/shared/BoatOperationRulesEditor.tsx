import React, { useState } from 'react';
import { Sliders, ShieldAlert, Check, Clock, Calendar, Lock, Unlock, ChevronDown } from 'lucide-react';
import { RegrasOperacaoEmbarcacao } from '../../types';
import {
  DEFAULT_FLEET_RULES,
  M62_DEFAULT_RULES,
  formatBoatRulesSummaryBadges,
} from '../../utils/boatRules';

interface BoatOperationRulesEditorProps {
  value: RegrasOperacaoEmbarcacao;
  onChange: (next: RegrasOperacaoEmbarcacao) => void;
  boatCode?: string;
  disabled?: boolean;
  compact?: boolean;
}

const WEEKDAY_LABELS: Array<{ idx: number; short: string }> = [
  { idx: 0, short: 'Dom' },
  { idx: 1, short: 'Seg' },
  { idx: 2, short: 'Ter' },
  { idx: 3, short: 'Qua' },
  { idx: 4, short: 'Qui' },
  { idx: 5, short: 'Sex' },
  { idx: 6, short: 'Sáb' },
];

export default function BoatOperationRulesEditor({
  value,
  onChange,
  boatCode,
  disabled = false,
  compact = false,
}: BoatOperationRulesEditorProps) {
  const [showAdvancedExtras, setShowAdvancedExtras] = useState(() =>
    Boolean(
      value.antecedenciaMaximaDias ||
        (value.diasSemanaBloqueados && value.diasSemanaBloqueados.length > 0) ||
        (value.taxaDescidaAvulsaPersonalizada !== null &&
          value.taxaDescidaAvulsaPersonalizada !== undefined)
    )
  );

  const isDefaultMode = value.usarPadraoFrota === true;
  const badges = formatBoatRulesSummaryBadges({ regrasOperacao: value });

  const updateCustom = (patch: Partial<RegrasOperacaoEmbarcacao>) => {
    if (disabled) return;
    onChange({
      ...value,
      ...patch,
      usarPadraoFrota: false,
    });
  };

  const toggleBlockedWeekday = (dayIdx: number) => {
    if (disabled) return;
    const current = Array.isArray(value.diasSemanaBloqueados) ? value.diasSemanaBloqueados : [];
    const next = current.includes(dayIdx)
      ? current.filter((d) => d !== dayIdx)
      : [...current, dayIdx].sort((a, b) => a - b);
    updateCustom({ diasSemanaBloqueados: next });
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50/70 overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-slate-100/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 leading-tight">
              Regras de Operação & Reserva {boatCode ? `(${boatCode})` : ''}
            </h4>
            <p className="text-[10px] text-slate-500">
              Controle automático aplicado no aplicativo do sócio
            </p>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            isDefaultMode
              ? 'bg-slate-200/70 text-slate-700 border-slate-300'
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}
        >
          {isDefaultMode ? 'Padrão da Frota' : 'Regra Personalizada'}
        </span>
      </div>

      <div className={compact ? 'p-3 space-y-3' : 'p-4 space-y-4'}>
        {/* Switch Padrão vs Personalizado */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ ...DEFAULT_FLEET_RULES })}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-60 ${
              isDefaultMode
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div>
              <span className="block">Padrão da Frota</span>
              <span className={`text-[10px] font-normal ${isDefaultMode ? 'text-slate-300' : 'text-slate-400'}`}>
                2 ativas · 1 Sáb + 1 Dom/mês
              </span>
            </div>
            {isDefaultMode && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => updateCustom({ usarPadraoFrota: false })}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-60 ${
              !isDefaultMode
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div>
              <span className="block">Personalizar Regras</span>
              <span className={`text-[10px] font-normal ${!isDefaultMode ? 'text-amber-100' : 'text-slate-400'}`}>
                Ex: Modelo M62 ou exclusivo
              </span>
            </div>
            {!isDefaultMode && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>
        </div>

        {/* Presets rápidos quando não está bloqueado */}
        {!disabled && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Predefinições:
            </span>
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_FLEET_RULES })}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Padrão (2 ativas · 1 Sáb + 1 Dom)
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...M62_DEFAULT_RULES })}
              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10px] font-bold text-amber-900 transition-colors cursor-pointer"
            >
              Regra M62 (1 ativa · 1 Sáb OU Dom bloqueado)
            </button>
          </div>
        )}

        {/* Controles Personalizados */}
        {!isDefaultMode && (
          <div className="space-y-3.5 pt-1 border-t border-slate-200/70">
            {/* 1. Limite de Reservas Ativas */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Máx. Reservas Ativas Simultâneas por Sócio
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateCustom({ maxReservasAtivas: qty })}
                      className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                        value.maxReservasAtivas === qty
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={30}
                    disabled={disabled}
                    value={value.maxReservasAtivas}
                    onChange={(e) =>
                      updateCustom({
                        maxReservasAtivas: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    className="w-14 h-7 px-2 text-center text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    title="Valor customizado"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                {value.maxReservasAtivas === 1
                  ? 'O sócio só pode agendar uma nova data após concluir ou cancelar a reserva ativa atual.'
                  : `O sócio pode manter até ${value.maxReservasAtivas} agendamentos futuros simultâneos nesta embarcação.`}
              </p>
            </div>

            {/* 2. Regra de Fim de Semana */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Regra de Fim de Semana por Mês (por Sócio)
              </label>

              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    id: 'sabado_e_domingo' as const,
                    title: '1 Sábado e 1 Domingo por mês (Padrão)',
                    desc: 'O sócio tem direito a 1 sábado e 1 domingo no mesmo mês.',
                  },
                  {
                    id: 'sabado_ou_domingo' as const,
                    title: 'Apenas 1 Sábado OU 1 Domingo por mês (Ex: M62)',
                    desc: 'Ao agendar um sábado ou domingo, a cota de fim de semana do mês é consumida.',
                  },
                  {
                    id: 'personalizado' as const,
                    title: 'Quantidade personalizada de dias de FDS no mês',
                    desc: 'Define um número específico de dias entre sábados e domingos no mês.',
                  },
                ].map((opt) => {
                  const selected = value.regraFimDeSemana === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        updateCustom({
                          regraFimDeSemana: opt.id,
                          maxFdsGarantidosMes:
                            opt.id === 'sabado_ou_domingo'
                              ? 1
                              : opt.id === 'sabado_e_domingo'
                                ? 2
                                : value.maxFdsGarantidosMes || 1,
                        })
                      }
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer disabled:opacity-60 ${
                        selected
                          ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{opt.title}</span>
                        {selected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </div>
                      <span className="block text-[10px] text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>

              {value.regraFimDeSemana === 'personalizado' && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold text-slate-700">
                    Total de dias de FDS garantidos no mês:
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    disabled={disabled}
                    value={value.maxFdsGarantidosMes ?? 1}
                    onChange={(e) =>
                      updateCustom({
                        maxFdsGarantidosMes: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    className="w-16 h-7 px-2 text-center text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* 3. Comportamento ao atingir limite de FDS */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Ao atingir a cota de Fim de Semana no mês
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateCustom({ permitirReservaExtraFds: false })}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer disabled:opacity-60 ${
                    !value.permitirReservaExtraFds
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Bloquear no App</span>
                  </div>
                  <span className="block text-[10px] text-slate-500 mt-0.5 leading-tight">
                    Sócio não consegue agendar outro FDS no mês (apenas Admin abre exceção).
                  </span>
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateCustom({ permitirReservaExtraFds: true })}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer disabled:opacity-60 ${
                    value.permitirReservaExtraFds
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Unlock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Permitir Extra (Suplência)</span>
                  </div>
                  <span className="block text-[10px] text-slate-500 mt-0.5 leading-tight">
                    Libera como Reserva Extra sujeita a contestação por outro sócio.
                  </span>
                </button>
              </div>

              {value.permitirReservaExtraFds && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Prazo limite de contestação (horas antes):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={360}
                      disabled={disabled}
                      value={value.prazoContestacaoHoras}
                      onChange={(e) =>
                        updateCustom({
                          prazoContestacaoHoras: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-16 h-7 px-2 text-center text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">h</span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Configurações Adicionais (Antecedência, Dias Bloqueados, Taxa Seg/Ter) */}
            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedExtras(!showAdvancedExtras)}
                className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>Restrições Adicionais (Antecedência, Dias Bloqueados, Taxa Seg/Ter)</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    showAdvancedExtras ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showAdvancedExtras && (
                <div className="p-3 pt-2 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Antecedência Máxima (Dias)
                      </label>
                      <input
                        type="number"
                        min={1}
                        disabled={disabled}
                        placeholder="Sem limite"
                        value={value.antecedenciaMaximaDias ?? ''}
                        onChange={(e) =>
                          updateCustom({
                            antecedenciaMaximaDias:
                              e.target.value === ''
                                ? null
                                : Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">
                        Ex: 30 para liberar até 30 dias à frente
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Taxa Seg/Ter Plano Normal (R$)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        disabled={disabled}
                        placeholder="Padrão (150 / 100)"
                        value={
                          value.taxaDescidaAvulsaPersonalizada !== null &&
                          value.taxaDescidaAvulsaPersonalizada !== undefined
                            ? value.taxaDescidaAvulsaPersonalizada
                            : ''
                        }
                        onChange={(e) =>
                          updateCustom({
                            taxaDescidaAvulsaPersonalizada:
                              e.target.value === ''
                                ? null
                                : Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                      />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">
                        Vazio = padrão (R$ 150 Lancha / R$ 100 Jet)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">
                      Dias da Semana Bloqueados no App do Sócio
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAY_LABELS.map((d) => {
                        const isBlocked = (value.diasSemanaBloqueados || []).includes(d.idx);
                        return (
                          <button
                            key={d.idx}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleBlockedWeekday(d.idx)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                              isBlocked
                                ? 'bg-rose-600 text-white border-rose-700'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {d.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumo efetivo */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-start gap-2 text-[11px] text-slate-600">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <span className="font-bold text-slate-800">Resumo ativo no Portal do Cliente: </span>
            <span>{badges.activeLimitLabel}</span>
            <span> · </span>
            <span>{badges.weekendRuleLabel}</span>
            <span> · </span>
            <span>{badges.extraAllowedLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
