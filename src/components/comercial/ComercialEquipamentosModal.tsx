import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sliders,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Flame,
  Music,
  Sun,
  Droplets,
  Coffee,
  Armchair,
  Anchor,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PublicBoat } from './CatalogoPublicoPage';
import { boatDB } from '../../db';

export interface ComercialEquipamentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  boat: any;
  onSaveSuccess?: (updatedBoat: any) => void;
}

const PADRAO_ACESSORIOS = [
  {
    id: 'churrasqueira',
    nome: 'Churrasqueira Gourmet',
    descricao: 'Churrasqueira em inox na popa com tábua e suporte náutico homologado',
    icon: Flame,
    corBadge: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  },
  {
    id: 'som',
    nome: 'Som Náutico Bluetooth',
    descricao: 'Sistema de áudio marinizado com Bluetooth e alto-falantes de alta fidelidade',
    icon: Music,
    corBadge: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  },
  {
    id: 'tenda',
    nome: 'Toldo Retrátil',
    descricao: 'Toldo retrátil com estrutura em inox e tecido marítimo com proteção UV',
    icon: Sun,
    corBadge: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  },
  {
    id: 'ducha',
    nome: 'Ducha de Popa Pressurizada',
    descricao: 'Ducha pressurizada de popa conectada ao reservatório de água doce',
    icon: Droplets,
    corBadge: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
  },
  {
    id: 'mesa',
    nome: 'Mesa de Centro Rebatível',
    descricao: 'Mesa removível/rebatível de alta densidade para cockpit e confraternização',
    icon: Coffee,
    corBadge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  },
  {
    id: 'bancosCadeiras',
    nome: 'Cadeiras / Assentos Confort',
    descricao: 'Bancos e cadeiras náuticas ergonômicas com acabamento anti-mofo e UV',
    icon: Armchair,
    corBadge: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
  }
];

const PRESETS_DIFERENCIAIS = [
  'Solário de Proa',
  'Teka EVA Premium Completa',
  'GPS / Sonar Garmin',
  'Guincho Elétrico de Âncora',
  'Cristaleira Náutica Iluminada',
  'Farol de Busca 360° com Controle',
  'Inversor de Corrente 110V/220V',
  'Salvatagem Homologada Marinha',
  'Cooler / Geleira Térmica Embutida',
  'Carreta Rodoviária / Encalhe',
  'Escada de Reembarque em Inox',
  'Rádio VHF Marítimo',
  'Flaps Hidráulicos com Mostrador',
  'Iluminação Subaquática em LED'
];

export default function ComercialEquipamentosModal({
  isOpen,
  onClose,
  boat,
  onSaveSuccess
}: ComercialEquipamentosModalProps) {
  // Acessórios principais
  const [som, setSom] = useState(true);
  const [tenda, setTenda] = useState(true);
  const [mesa, setMesa] = useState(true);
  const [bancosCadeiras, setBancosCadeiras] = useState(false);
  const [churrasqueira, setChurrasqueira] = useState(true);
  const [ducha, setDucha] = useState(true);

  // Diferenciais personalizados
  const [diferenciais, setDiferenciais] = useState<string[]>([]);
  const [newDiferencialInput, setNewDiferencialInput] = useState('');

  // Estados de operação
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  // Carregar dados quando a modal abrir
  useEffect(() => {
    if (!isOpen || !boat) return;

    setErrorMessage(null);
    setSuccessToast(false);
    setNewDiferencialInput('');

    const acess: any = boat.acessorios;
    const currentList = Array.isArray(boat.itensConforto) ? boat.itensConforto : [];

    if (acess && typeof acess === 'object') {
      setSom(acess.som !== undefined ? Boolean(acess.som) : currentList.some(i => i.toLowerCase().includes('som')));
      setTenda(acess.tenda !== undefined ? Boolean(acess.tenda) : currentList.some(i => i.toLowerCase().includes('toldo') || i.toLowerCase().includes('tenda')));
      setMesa(acess.mesa !== undefined ? Boolean(acess.mesa) : currentList.some(i => i.toLowerCase().includes('mesa')));
      setBancosCadeiras(
        acess.bancosCadeiras !== undefined
          ? Boolean(acess.bancosCadeiras)
          : currentList.some(i => i.toLowerCase().includes('cadeira') || i.toLowerCase().includes('assento'))
      );
      setChurrasqueira(
        acess.churrasqueira !== undefined
          ? Boolean(acess.churrasqueira)
          : currentList.some(i => i.toLowerCase().includes('churrasqueira'))
      );
      setDucha(acess.ducha !== undefined ? Boolean(acess.ducha) : currentList.some(i => i.toLowerCase().includes('ducha')));

      if (Array.isArray(acess.diferenciais) && acess.diferenciais.length > 0) {
        setDiferenciais([...acess.diferenciais]);
      } else {
        // Filtrar itens que não são os 6 padrões para serem diferenciais
        const diffs = currentList.filter(item => {
          const l = item.toLowerCase();
          return (
            !l.includes('churrasqueira') &&
            !l.includes('som') &&
            !l.includes('toldo') &&
            !l.includes('tenda') &&
            !l.includes('ducha') &&
            !l.includes('mesa') &&
            !l.includes('cadeira') &&
            !l.includes('assento')
          );
        });
        setDiferenciais(diffs);
      }
    } else {
      // Sem objeto acessorios salvo, inferir da lista de itensConforto
      setChurrasqueira(currentList.some(i => i.toLowerCase().includes('churrasqueira')));
      setSom(currentList.some(i => i.toLowerCase().includes('som')));
      setTenda(currentList.some(i => i.toLowerCase().includes('toldo') || i.toLowerCase().includes('tenda')));
      setDucha(currentList.some(i => i.toLowerCase().includes('ducha')));
      setMesa(currentList.some(i => i.toLowerCase().includes('mesa')));
      setBancosCadeiras(currentList.some(i => i.toLowerCase().includes('cadeira') || i.toLowerCase().includes('assento')));

      const diffs = currentList.filter(item => {
        const l = item.toLowerCase();
        return (
          !l.includes('churrasqueira') &&
          !l.includes('som') &&
          !l.includes('toldo') &&
          !l.includes('tenda') &&
          !l.includes('ducha') &&
          !l.includes('mesa') &&
          !l.includes('cadeira') &&
          !l.includes('assento')
        );
      });
      setDiferenciais(diffs.length > 0 ? diffs : ['Solário de Proa']);
    }
  }, [isOpen, boat]);

  // Lista calculada em tempo real para pré-visualização
  const previewItensConforto = useMemo(() => {
    const list: string[] = [];
    if (churrasqueira) list.push('Churrasqueira Gourmet');
    if (som) list.push('Som Náutico Bluetooth');
    if (tenda) list.push('Toldo Retrátil');
    if (ducha) list.push('Ducha de Popa Pressurizada');
    if (mesa) list.push('Mesa de Centro Rebatível');
    if (bancosCadeiras) list.push('Cadeiras / Assentos Confort');
    diferenciais.forEach(d => {
      if (d && !list.includes(d)) list.push(d);
    });
    return list;
  }, [churrasqueira, som, tenda, ducha, mesa, bancosCadeiras, diferenciais]);

  // Adicionar diferencial personalizado
  const handleAddDiferencial = () => {
    const trimmed = newDiferencialInput.trim();
    if (!trimmed) return;
    if (diferenciais.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      setNewDiferencialInput('');
      return;
    }
    setDiferenciais(prev => [...prev, trimmed]);
    setNewDiferencialInput('');
  };

  // Alternar preset de diferencial
  const handleTogglePreset = (preset: string) => {
    if (diferenciais.includes(preset)) {
      setDiferenciais(prev => prev.filter(d => d !== preset));
    } else {
      setDiferenciais(prev => [...prev, preset]);
    }
  };

  // Remover diferencial
  const handleRemoveDiferencial = (item: string) => {
    setDiferenciais(prev => prev.filter(d => d !== item));
  };

  // Restaurar padrão de fábrica
  const handleRestaurarPadrao = () => {
    setChurrasqueira(true);
    setSom(true);
    setTenda(true);
    setDucha(true);
    setMesa(true);
    setBancosCadeiras(false);
    setDiferenciais(['Solário de Proa']);
  };

  // Salvar no servidor e atualizar localmente
  const handleSave = async () => {
    if (!boat) return;
    setIsSaving(true);
    setErrorMessage(null);

    const payload = {
      som,
      tenda,
      mesa,
      bancosCadeiras,
      churrasqueira,
      ducha,
      diferenciais,
      itensConforto: previewItensConforto
    };

    try {
      const res = await fetch(`/api/comercial/catalogo/barco/${boat.id}/acessorios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('admin_token')
            ? { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
            : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Falha ao salvar acessórios da embarcação.');
      }

      const resData = await res.json();
      const updatedBoat: PublicBoat = {
        ...boat,
        itensConforto: resData.itensConforto || previewItensConforto,
        acessorios: resData.acessorios || {
          ...payload,
          configurado: true
        }
      };

      // Atualizar boatDB local se disponível no navegador
      try {
        const existing = boatDB.getById(boat.id);
        if (existing) {
          boatDB.update(boat.id, {
            acessorios: {
              ...(existing.acessorios || {}),
              ...payload,
              configurado: true
            }
          });
        }
      } catch (e) {
        console.warn('Atualização local boatDB ignorada:', e);
      }

      setSuccessToast(true);
      if (onSaveSuccess) onSaveSuccess(updatedBoat);

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Erro ao salvar acessórios:', err);
      setErrorMessage(err.message || 'Erro ao conectar ao servidor para salvar acessórios.');
      setIsSaving(false);
    }
  };

  if (!isOpen || !boat) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop com blur escuro elegante */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-black/10 overflow-hidden z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-black/[0.06] flex items-start justify-between gap-4 bg-[#FBFBFC]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#111113]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-400 font-semibold">
                Painel Comercial · Memorial Descritivo
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111113]">
              Configurar Equipamentos & Diferenciais
            </h3>
            <p className="text-xs text-neutral-500">
              Personalize os acessórios inclusos no ativo{' '}
              <strong className="text-neutral-800 font-semibold">{boat.nome}</strong>{' '}
              ({boat.modelo || 'Embarcação Náutica'}).
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensagens de feedback */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successToast && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Equipamentos e diferenciais atualizados com sucesso no catálogo!</span>
          </div>
        )}

        {/* Corpo com scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#111113]">
          {/* SEÇÃO 1: ACESSÓRIOS PRINCIPAIS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-neutral-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  1. Acessórios de Série Principais
                </h4>
              </div>
              <span className="font-mono text-[11px] text-neutral-400">
                Marque os itens inclusos na venda
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PADRAO_ACESSORIOS.map(item => {
                const isChecked =
                  item.id === 'som'
                    ? som
                    : item.id === 'tenda'
                    ? tenda
                    : item.id === 'mesa'
                    ? mesa
                    : item.id === 'bancosCadeiras'
                    ? bancosCadeiras
                    : item.id === 'churrasqueira'
                    ? churrasqueira
                    : ducha;

                const toggle = () => {
                  if (item.id === 'som') setSom(!som);
                  else if (item.id === 'tenda') setTenda(!tenda);
                  else if (item.id === 'mesa') setMesa(!mesa);
                  else if (item.id === 'bancosCadeiras') setBancosCadeiras(!bancosCadeiras);
                  else if (item.id === 'churrasqueira') setChurrasqueira(!churrasqueira);
                  else if (item.id === 'ducha') setDucha(!ducha);
                };

                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    onClick={toggle}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                      isChecked
                        ? 'bg-[#F9F9FA] border-[#111113] shadow-xs'
                        : 'bg-white border-neutral-200 hover:border-neutral-300 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                        isChecked
                          ? 'bg-[#111113] border-[#111113] text-white'
                          : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                        <span className="text-xs font-semibold text-[#111113] block truncate">
                          {item.nome}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                        {item.descricao}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 2: DIFERENCIAIS E ITENS EXCLUSIVOS */}
          <div className="space-y-3 pt-4 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  2. Diferenciais & Opcionais Exclusivos ({diferenciais.length})
                </h4>
              </div>
              <span className="font-mono text-[11px] text-neutral-400">
                Itens que agregam valor comercial
              </span>
            </div>

            {/* Chips de Diferenciais Ativos */}
            <div className="min-h-[44px] p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] flex flex-wrap items-center gap-2">
              {diferenciais.length === 0 ? (
                <span className="text-xs text-neutral-400 italic">
                  Nenhum diferencial extra adicionado ainda. Escolha nas sugestões abaixo ou digite um novo.
                </span>
              ) : (
                diferenciais.map(d => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-medium text-neutral-800 shadow-2xs group"
                  >
                    <span>{d}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveDiferencial(d);
                      }}
                      className="text-neutral-400 hover:text-red-600 cursor-pointer transition-colors"
                      title="Remover este diferencial"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Input para adicionar diferencial customizado */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDiferencialInput}
                onChange={e => setNewDiferencialInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDiferencial();
                  }
                }}
                placeholder="Digitar diferencial personalizado (ex: Teka Premium, Som Subwoofer, Cristaleira...)"
                className="flex-1 h-10 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all bg-white"
              />
              <button
                type="button"
                onClick={handleAddDiferencial}
                disabled={!newDiferencialInput.trim()}
                className="h-10 px-4 rounded-xl bg-[#111113] hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-[#111113] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Sugestões Rápidas (1 clique para adicionar) */}
            <div className="space-y-1.5 pt-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                Sugestões Rápidas de Mercado (clique para incluir/remover):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS_DIFERENCIAIS.map(preset => {
                  const isSelected = diferenciais.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleTogglePreset(preset)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                          : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Plus className="w-3 h-3 text-neutral-400" />
                      )}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: PRÉ-VISUALIZAÇÃO EM TEMPO REAL NO CATÁLOGO */}
          <div className="space-y-3 pt-4 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
                Pré-visualização do Ativo no Catálogo
              </span>
              <span className="font-mono text-xs text-neutral-500 font-medium">
                {previewItensConforto.length} itens configurados
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F5F7]/80 border border-black/[0.04]">
              {previewItensConforto.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-400 italic">
                  Nenhum item configurado no momento. Marque os acessórios ou diferenciais acima.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {previewItensConforto.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-black/[0.05] flex items-center gap-2.5 shadow-2xs"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#111113] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-[#111113] block truncate">
                          {item}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          Instalado e homologado
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé da Modal com Ações */}
        <div className="px-6 py-4 border-t border-black/[0.06] bg-[#FBFBFC] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRestaurarPadrao}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão Náutico</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando no Ativo...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Memorial no Catálogo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
