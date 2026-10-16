import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  Sparkles,
  Info,
  Building2,
  HelpCircle,
  FileCheck2
} from 'lucide-react';
import {
  ContractModelTemplate,
  ContractClauseItem,
  CONTRATO_TAGS,
  getContractModelTemplate,
  saveContractModelTemplate,
  resetContractModelTemplate
} from '../../utils/contratoTemplates';

interface ComercialContratoModeloModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'aquisicao' | 'adm';
  onSaved?: (type: 'aquisicao' | 'adm') => void;
}

export default function ComercialContratoModeloModal({
  isOpen,
  onClose,
  initialType = 'aquisicao',
  onSaved
}: ComercialContratoModeloModalProps) {
  const [selectedType, setSelectedType] = useState<'aquisicao' | 'adm'>(initialType);
  const [template, setTemplate] = useState<ContractModelTemplate | null>(null);
  const [activeFocusedInput, setActiveFocusedInput] = useState<{
    field: 'intro' | 'clause';
    clauseIdx?: number;
  } | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sincronizar ao abrir e ao trocar de modelo
  useEffect(() => {
    if (isOpen) {
      setSelectedType(initialType);
      const tpl = getContractModelTemplate(initialType);
      setTemplate(JSON.parse(JSON.stringify(tpl)));
      setSavedSuccess(false);
    }
  }, [isOpen, initialType]);

  const handleSwitchType = (type: 'aquisicao' | 'adm') => {
    setSelectedType(type);
    const tpl = getContractModelTemplate(type);
    setTemplate(JSON.parse(JSON.stringify(tpl)));
    setSavedSuccess(false);
  };

  if (!isOpen || !template) return null;

  // Atualizar campo simples do template
  const handleUpdateField = (field: keyof ContractModelTemplate, value: any) => {
    setTemplate(prev => prev ? { ...prev, [field]: value } : null);
    setSavedSuccess(false);
  };

  // Atualizar cláusula específica
  const handleUpdateClause = (idx: number, patch: Partial<ContractClauseItem>) => {
    if (!template) return;
    const updated = [...template.clausulas];
    updated[idx] = { ...updated[idx], ...patch };
    setTemplate({ ...template, clausulas: updated });
    setSavedSuccess(false);
  };

  // Mover cláusula para cima / baixo
  const handleMoveClause = (idx: number, direction: 'up' | 'down') => {
    if (!template) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= template.clausulas.length) return;

    const updated = [...template.clausulas];
    const item = updated.splice(idx, 1)[0];
    updated.splice(targetIdx, 0, item);
    setTemplate({ ...template, clausulas: updated });
    setSavedSuccess(false);
  };

  // Remover cláusula
  const handleRemoveClause = (idx: number) => {
    if (!template) return;
    const item = template.clausulas[idx];
    if (!window.confirm(`Tem certeza que deseja remover a cláusula "${item.numero || ''} ${item.titulo}" do modelo?`)) return;

    const updated = template.clausulas.filter((_, i) => i !== idx);
    setTemplate({ ...template, clausulas: updated });
    setSavedSuccess(false);
  };

  // Adicionar nova cláusula
  const handleAddClause = () => {
    if (!template) return;
    const nextNum = template.clausulas.length + 1;
    const newClause: ContractClauseItem = {
      id: `cl-${Date.now()}`,
      numero: `${nextNum}`,
      titulo: 'NOVA CLÁUSULA',
      texto: `${nextNum}.1. Descreva os termos e condições desta cláusula...`
    };
    setTemplate({
      ...template,
      clausulas: [...template.clausulas, newClause]
    });
    setSavedSuccess(false);
  };

  // Inserir tag de variável no campo focado
  const handleInsertTag = (tag: string) => {
    if (!template || !activeFocusedInput) return;

    if (activeFocusedInput.field === 'intro') {
      setTemplate({
        ...template,
        intro: template.intro ? `${template.intro} ${tag}` : tag
      });
    } else if (activeFocusedInput.field === 'clause' && activeFocusedInput.clauseIdx !== undefined) {
      const idx = activeFocusedInput.clauseIdx;
      const currentClause = template.clausulas[idx];
      if (currentClause) {
        handleUpdateClause(idx, {
          texto: currentClause.texto ? `${currentClause.texto} ${tag}` : tag
        });
      }
    }
  };

  // Salvar Template
  const handleSave = () => {
    if (!template) return;
    saveContractModelTemplate(template);
    setSavedSuccess(true);
    if (onSaved) onSaved(selectedType);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  // Restaurar Padrão Oficial
  const handleResetToDefault = () => {
    const label = selectedType === 'aquisicao' ? 'Aquisição' : 'Administração';
    if (!window.confirm(`Deseja realmente restaurar o modelo de ${label} para o texto oficial original? Todas as personalizações deste modelo serão descartadas.`)) {
      return;
    }
    const def = resetContractModelTemplate(selectedType);
    setTemplate(JSON.parse(JSON.stringify(def)));
    setSavedSuccess(true);
    if (onSaved) onSaved(selectedType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-stone-50 rounded-2xl shadow-2xl flex flex-col border border-stone-200/80 w-full max-w-4xl h-[92vh] max-h-[960px] overflow-hidden">
        
        {/* ================= CABEÇALHO DO MODAL ================= */}
        <header className="bg-white px-6 py-4 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-mx-ink-100 text-mx-ink flex items-center justify-center shrink-0 border border-mx-ink/10">
              <FileText className="w-5 h-5 text-mx-ink" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">
                  Editor de Modelos de Contrato
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  Base Institucional
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Defina o padrão de cláusulas e textos que servirão de base para todos os contratos gerados.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ================= SUB-TOOLBAR: SELETOR DE MODELO + TAGS ================= */}
        <div className="bg-white px-6 py-2.5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Seletor Segmentado de Modelo */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80">
            <button
              type="button"
              onClick={() => handleSwitchType('aquisicao')}
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                selectedType === 'aquisicao'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              <span>Modelo Aquisição (Cota)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchType('adm')}
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                selectedType === 'adm'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
              <span>Modelo Administração</span>
            </button>
          </div>

          {/* Atalho Restaurar Oficial */}
          <button
            type="button"
            onClick={handleResetToDefault}
            className="h-8 px-3 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-stone-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restaura as cláusulas oficiais originais de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>Restaurar Modelo Padrão</span>
          </button>
        </div>

        {/* Barra de Variáveis Dinâmicas */}
        <div className="bg-stone-100/90 px-6 py-2 border-b border-stone-200/80 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Inserir Variável:
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {CONTRATO_TAGS.map(t => (
              <button
                key={t.tag}
                type="button"
                onClick={() => handleInsertTag(t.tag)}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-mono text-[11px] font-medium transition-colors hover:border-amber-400 cursor-pointer whitespace-nowrap shadow-2xs"
                title={`Clique para inserir ${t.label} no campo ativo`}
              >
                {t.tag}
              </button>
            ))}
          </div>
        </div>

        {/* ================= CORPO DO FORMULÁRIO COM SCROLL ================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* SEÇÃO 1: CABEÇALHO DO MODELO */}
          <section className="bg-white rounded-xl border border-stone-200/80 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
                <Building2 className="w-4 h-4 text-stone-500" />
                <span>Identificação do Modelo & Empresa</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Título Oficial do Contrato
                </label>
                <input
                  type="text"
                  value={template.titulo}
                  onChange={e => handleUpdateField('titulo', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Razão Social / Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={template.empresaNome}
                    onChange={e => handleUpdateField('empresaNome', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={template.empresaCnpj}
                    onChange={e => handleUpdateField('empresaCnpj', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Endereço Completo da Sede
                  </label>
                  <input
                    type="text"
                    value={template.empresaEndereco}
                    onChange={e => handleUpdateField('empresaEndereco', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    value={template.empresaTelefone}
                    onChange={e => handleUpdateField('empresaTelefone', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: INTRODUÇÃO / PREÂMBULO / CONSIDERANDOS */}
          <section className="bg-white rounded-xl border border-stone-200/80 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
                <Info className="w-4 h-4 text-stone-500" />
                <span>Preâmbulo / Considerandos do Contrato</span>
              </div>
              <span className="text-[11px] text-stone-400">
                Suporta marcações como &lt;b&gt;texto&lt;/b&gt; e &lt;u&gt;sublinhado&lt;/u&gt;
              </span>
            </div>

            <div>
              <textarea
                rows={4}
                value={template.intro}
                onFocus={() => setActiveFocusedInput({ field: 'intro' })}
                onChange={e => handleUpdateField('intro', e.target.value)}
                placeholder="Introdução / Considerandos do contrato..."
                className="w-full p-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-white"
              />
            </div>
          </section>

          {/* SEÇÃO 3: CLÁUSULAS DO MODELO */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Cláusulas Contratuais ({template.clausulas.length})
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Organize, edite ou crie novas cláusulas para compor o corpo do contrato.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddClause}
                className="h-8 px-3.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Cláusula</span>
              </button>
            </div>

            <div className="space-y-4">
              {template.clausulas.map((clause, idx) => (
                <div
                  key={clause.id || idx}
                  className="bg-white rounded-xl border border-stone-200/80 p-4 space-y-3 shadow-2xs hover:border-stone-300 transition-colors"
                >
                  {/* Cabeçalho da Cláusula */}
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0 border border-stone-200">
                        {clause.numero || idx + 1}
                      </div>
                      <input
                        type="text"
                        value={clause.titulo}
                        onChange={e => handleUpdateClause(idx, { titulo: e.target.value.toUpperCase() })}
                        placeholder="TÍTULO DA CLÁUSULA"
                        className="font-bold text-xs text-stone-900 px-2 py-1 rounded bg-stone-50 hover:bg-stone-100/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-mx-ink flex-1 uppercase"
                      />
                    </div>

                    {/* Ações de Reordenação e Exclusão */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveClause(idx, 'up')}
                        className="w-7 h-7 rounded flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={idx === template.clausulas.length - 1}
                        onClick={() => handleMoveClause(idx, 'down')}
                        className="w-7 h-7 rounded flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveClause(idx)}
                        className="w-7 h-7 rounded flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors ml-1"
                        title="Excluir cláusula do modelo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Texto da Cláusula */}
                  <div>
                    <textarea
                      rows={Math.min(10, Math.max(3, (clause.texto.split('\n').length || 1) + 1))}
                      value={clause.texto}
                      onFocus={() => setActiveFocusedInput({ field: 'clause', clauseIdx: idx })}
                      onChange={e => handleUpdateClause(idx, { texto: e.target.value })}
                      placeholder="Texto integral e itens desta cláusula..."
                      className="w-full p-3 rounded-lg border border-stone-200 text-xs text-stone-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink bg-stone-50/40 hover:bg-white focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Botão Inferior de Adição */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleAddClause}
                className="px-4 py-2 rounded-xl border border-dashed border-stone-300 hover:border-stone-400 text-stone-600 hover:text-stone-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer bg-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Nova Cláusula no Final</span>
              </button>
            </div>
          </section>

        </div>

        {/* ================= RODAPÉ FIXO ================= */}
        <footer className="h-16 px-6 border-t border-stone-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {savedSuccess && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Modelo salvo com sucesso!</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="h-9 px-5 rounded-xl bg-mx-ink hover:bg-mx-ink-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Alterações no Modelo</span>
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
