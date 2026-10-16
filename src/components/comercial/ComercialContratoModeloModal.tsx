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
  FileCheck2,
  Copy
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
  initialType?: 'aquisicao' | 'adm' | 'aditivo';
  onSaved?: (type: 'aquisicao' | 'adm' | 'aditivo') => void;
}

export default function ComercialContratoModeloModal({
  isOpen,
  onClose,
  initialType = 'aquisicao',
  onSaved
}: ComercialContratoModeloModalProps) {
  const [activeTab, setActiveTab] = useState<'aquisicao' | 'adm' | 'aditivo' | 'tags'>(initialType);
  const [template, setTemplate] = useState<ContractModelTemplate | null>(null);
  const [activeFocusedInput, setActiveFocusedInput] = useState<{
    field: 'intro' | 'clause';
    clauseIdx?: number;
  } | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Sincronizar ao abrir e ao trocar de modelo
  useEffect(() => {
    if (isOpen) {
      const typeToLoad = initialType === 'aditivo' ? 'aditivo' : initialType === 'adm' ? 'adm' : 'aquisicao';
      setActiveTab(typeToLoad);
      const tpl = getContractModelTemplate(typeToLoad);
      setTemplate(JSON.parse(JSON.stringify(tpl)));
      setSavedSuccess(false);
    }
  }, [isOpen, initialType]);

  const handleSwitchTab = (tab: 'aquisicao' | 'adm' | 'aditivo' | 'tags') => {
    setActiveTab(tab);
    if (tab !== 'tags') {
      const tpl = getContractModelTemplate(tab);
      setTemplate(JSON.parse(JSON.stringify(tpl)));
    }
    setSavedSuccess(false);
  };

  if (!isOpen) return null;

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
      id: `cl_custom_${Date.now()}`,
      numero: `CLÁUSULA ${nextNum}ª`,
      titulo: 'NOVA CLÁUSULA PERSONALIZADA',
      texto: `${nextNum}.1. Descreva aqui as condições, direitos ou obrigações aplicáveis a este contrato...`
    };
    setTemplate({
      ...template,
      clausulas: [...template.clausulas, newClause]
    });
    setSavedSuccess(false);
  };

  // Inserir tag de variável no campo focado
  const handleInsertTag = (tag: string) => {
    if (!template) return;
    if (!activeFocusedInput) {
      handleUpdateField('intro', (template.intro || '') + ` ${tag}`);
      return;
    }

    if (activeFocusedInput.field === 'intro') {
      handleUpdateField('intro', (template.intro || '') + ` ${tag}`);
    } else if (activeFocusedInput.field === 'clause' && typeof activeFocusedInput.clauseIdx === 'number') {
      const idx = activeFocusedInput.clauseIdx;
      const current = template.clausulas[idx]?.texto || '';
      handleUpdateClause(idx, { texto: current + ` ${tag}` });
    }
  };

  // Copiar tag para área de transferência
  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  // Salvar no Storage / Estado
  const handleSave = () => {
    if (!template) return;
    if (activeTab === 'tags') return;

    saveContractModelTemplate(template);
    setSavedSuccess(true);
    if (onSaved) onSaved(activeTab);

    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  // Restaurar Padrão Oficial
  const handleResetToDefault = () => {
    if (activeTab === 'tags') return;
    const label = activeTab === 'aquisicao' ? 'Aquisição' : activeTab === 'aditivo' ? 'Aditivo' : 'Administração';
    if (!window.confirm(`Deseja realmente restaurar o modelo de ${label} para o texto oficial original? Todas as personalizações deste modelo serão descartadas.`)) {
      return;
    }
    const def = resetContractModelTemplate(activeTab);
    setTemplate(JSON.parse(JSON.stringify(def)));
    setSavedSuccess(true);
    if (onSaved) onSaved(activeTab);
  };

  const MODEL_TABS = [
    { id: 'aquisicao', label: 'Modelo Aquisição (Cota)', icon: FileText, desc: 'Padrão jurídico de aquisição de cota de lancha e jet ski' },
    { id: 'adm', label: 'Modelo Gestão Náutica (Adm)', icon: ShieldCheck, desc: 'Padrão para prestação de serviços de marina e gestão' },
    { id: 'aditivo', label: 'Modelo Termo Aditivo', icon: Sparkles, desc: 'Termo aditivo formal para 2ª ou 3ª cota do mesmo cotista' },
    { id: 'tags', label: 'Dicionário de Variáveis', icon: HelpCircle, desc: 'Tags dinâmicas para preenchimento automático de dados' },
  ] as const;

  const currentTabMeta = MODEL_TABS.find(t => t.id === activeTab) || MODEL_TABS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ─── MODAL CONTAINER (Padrão Split View da Referência) ─── */}
      <div
        className="bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-stone-200/80 w-full max-w-4xl h-[90vh] max-h-[680px] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ================= COLUNA LATERAL ESQUERDA ================= */}
        <aside className="w-full md:w-72 bg-stone-50/70 border-b md:border-b-0 md:border-r border-stone-200/70 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            
            {/* Cabeçalho da Coluna Esquerda */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center justify-center text-stone-800 shrink-0">
                  <FileText className="w-4 h-4 text-stone-700" />
                </div>
                <h3 className="font-bold text-[14px] text-stone-900 tracking-tight">
                  Modelos de Contrato
                </h3>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                Defina o padrão de cláusulas e textos que servirão de base para todos os contratos gerados.
              </p>
            </div>

            {/* Menu Vertical de Navegação por Pílulas */}
            <nav className="space-y-1">
              {MODEL_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSwitchTab(tab.id as any)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-stone-600" />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Rodapé da Coluna Esquerda */}
          <div className="pt-4 border-t border-stone-200/60 space-y-2 mt-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-500 font-medium">Base Institucional:</span>
              <span className="font-semibold text-stone-800 bg-stone-200/80 px-2 py-0.5 rounded-full text-[10px]">
                3 Modelos Ativos
              </span>
            </div>

            {activeTab !== 'tags' && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="w-full text-left text-[11px] font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1.5 transition-colors cursor-pointer pt-1"
                title="Restaura as cláusulas padrão de fábrica deste modelo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar padrão oficial</span>
              </button>
            )}
          </div>
        </aside>

        {/* ================= COLUNA PRINCIPAL DE CONTEÚDO ================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-white p-6 md:p-8 overflow-hidden">
          
          {/* Cabeçalho da Seção Ativa + Botão Fechar */}
          <header className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-stone-900 tracking-tight">
                  {currentTabMeta.label}
                </h2>
                {activeTab !== 'tags' && template && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                    {template.clausulas.length} Cláusulas
                  </span>
                )}
              </div>
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

          {/* Barra rápida de variáveis caso esteja editando um modelo */}
          {activeTab !== 'tags' && (
            <div className="pt-3 pb-1 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none text-[11px]">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Inserir Tag:
              </span>
              {CONTRATO_TAGS.slice(0, 8).map(t => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => handleInsertTag(t.tag)}
                  className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-mono text-[10px] font-semibold transition-colors cursor-pointer shrink-0"
                  title={`Inserir ${t.label}`}
                >
                  {t.tag}
                </button>
              ))}
            </div>
          )}

          {/* Área de Conteúdo Scrollável */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            
            {/* TABS DE MODELO (Aquisição, Adm, Aditivo) */}
            {activeTab !== 'tags' && template && (
              <div className="space-y-4">
                {/* Identificação e Razão Social */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-3">
                  <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-200/60">
                    <Building2 className="w-4 h-4 text-stone-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Identificação do Modelo & Empresa
                    </h3>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider mb-1">
                      Título Oficial do Contrato
                    </label>
                    <input
                      type="text"
                      value={template.titulo}
                      onChange={e => handleUpdateField('titulo', e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-bold uppercase focus:outline-hidden focus:border-stone-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider mb-1">
                        Razão Social / Nome da Empresa
                      </label>
                      <input
                        type="text"
                        value={template.empresaNome}
                        onChange={e => handleUpdateField('empresaNome', e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider mb-1">
                        CNPJ
                      </label>
                      <input
                        type="text"
                        value={template.empresaCnpj}
                        onChange={e => handleUpdateField('empresaCnpj', e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-mono font-semibold focus:outline-hidden focus:border-stone-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider mb-1">
                      Endereço da Sede
                    </label>
                    <input
                      type="text"
                      value={template.empresaEndereco}
                      onChange={e => handleUpdateField('empresaEndereco', e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 font-semibold focus:outline-hidden focus:border-stone-400"
                    />
                  </div>
                </div>

                {/* Introdução / Preâmbulo */}
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                  <label className="text-[11px] font-bold text-stone-700 block uppercase tracking-wider">
                    Introdução / Qualificação Jurídica
                  </label>
                  <textarea
                    rows={4}
                    value={template.intro}
                    onFocus={() => setActiveFocusedInput({ field: 'intro' })}
                    onChange={e => handleUpdateField('intro', e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 leading-relaxed focus:outline-hidden focus:border-stone-400 resize-none"
                  />
                </div>

                {/* Lista de Cláusulas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                      Cláusulas Contratuais ({template.clausulas.length})
                    </span>

                    <button
                      type="button"
                      onClick={handleAddClause}
                      className="h-8 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Cláusula</span>
                    </button>
                  </div>

                  {template.clausulas.map((clause, idx) => (
                    <div
                      key={idx}
                      className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            value={clause.numero}
                            onChange={e => handleUpdateClause(idx, { numero: e.target.value })}
                            className="w-28 h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-xs font-bold text-stone-800 focus:outline-hidden focus:border-stone-400"
                            placeholder="CLÁUSULA 1ª"
                          />
                          <input
                            type="text"
                            value={clause.titulo}
                            onChange={e => handleUpdateClause(idx, { titulo: e.target.value })}
                            className="flex-1 h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-xs font-bold text-stone-900 uppercase focus:outline-hidden focus:border-stone-400"
                            placeholder="TÍTULO DA CLÁUSULA"
                          />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveClause(idx, 'up')}
                            disabled={idx === 0}
                            className="w-7 h-7 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
                            title="Mover para cima"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveClause(idx, 'down')}
                            disabled={idx === template.clausulas.length - 1}
                            className="w-7 h-7 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
                            title="Mover para baixo"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveClause(idx)}
                            className="w-7 h-7 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Remover cláusula"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={Math.min(8, Math.max(3, (clause.texto.split('\n').length || 1) + 1))}
                        value={clause.texto}
                        onFocus={() => setActiveFocusedInput({ field: 'clause', clauseIdx: idx })}
                        onChange={e => handleUpdateClause(idx, { texto: e.target.value })}
                        className="w-full p-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 leading-relaxed focus:outline-hidden focus:border-stone-400 resize-none font-sans"
                        placeholder="Texto integral e itens desta cláusula..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: DICIONÁRIO DE TAGS */}
            {activeTab === 'tags' && (
              <div className="space-y-3">
                <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200/70">
                  <p className="text-xs font-bold text-stone-900">Como funcionam as variáveis?</p>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                    Ao redigir o modelo, utilize as tags abaixo no texto. No momento da emissão do contrato para um cotista, o sistema substituirá automaticamente a tag pelo dado real cadastrado.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CONTRATO_TAGS.map(t => (
                    <div
                      key={t.tag}
                      className="p-3 rounded-2xl border border-stone-200/70 bg-stone-50/50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <code className="text-xs font-mono font-bold text-stone-900 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                          {t.tag}
                        </code>
                        <p className="text-[11px] text-stone-500 mt-1 truncate">{t.label}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyTag(t.tag)}
                        className="h-7 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedTag === t.tag ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ================= RODAPÉ PRINCIPAL DO MODAL ================= */}
          <footer className="pt-4 border-t border-stone-100 flex items-center justify-between shrink-0">
            {/* Status / Mensagem na Esquerda */}
            <div className="flex items-center gap-2">
              {savedSuccess && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Modelo salvo com sucesso!</span>
                </div>
              )}
            </div>

            {/* Botões de Ação na Direita */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Fechar
              </button>

              {activeTab !== 'tags' && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="h-9 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Modelo</span>
                </button>
              )}
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}
