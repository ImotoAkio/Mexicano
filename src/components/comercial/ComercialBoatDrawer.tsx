import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Ship,
  Save,
  Check,
  AlertCircle,
  Building2,
  Users,
  Anchor,
  Wrench,
  Clock,
  Gauge,
  Camera,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Embarcacao, Cliente } from '../../types';
import { boatDB } from '../../db';

interface ComercialBoatDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (savedBoat: Embarcacao) => void;
  editingBoat?: Embarcacao | null;
  clients: Cliente[];
}

export default function ComercialBoatDrawer({
  open,
  onClose,
  onSave,
  editingBoat = null,
  clients = []
}: ComercialBoatDrawerProps) {
  const isEditing = !!editingBoat;

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados do Formulário - Identificação
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState<'lancha' | 'jet'>('lancha');
  const [fabricante, setFabricante] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState<number>(new Date().getFullYear());

  // Especificações
  const [tamanho, setTamanho] = useState('');
  const [potencia, setPotencia] = useState('');
  const [capacidadePassageiros, setCapacidadePassageiros] = useState<number>(8);
  const [vaga, setVaga] = useState('');

  // Status & Operação
  const [statusOperacional, setStatusOperacional] = useState<'disponivel' | 'em_manutencao' | 'pendencia'>('disponivel');
  const [horasMotor, setHorasMotor] = useState<number>(0);
  const [empresas, setEmpresas] = useState<string[]>(['VALE']);
  const [imagemUrl, setImagemUrl] = useState('');

  // Cotistas Vinculados
  const [selectedDonos, setSelectedDonos] = useState<string[]>([]);
  const [cotistaSearch, setCotistaSearch] = useState('');

  // Acessórios
  const [acessorios, setAcessorios] = useState({
    tenda: false,
    mesa: false,
    churrasqueira: false,
    bancosCadeiras: false,
    extintores: true
  });

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Carregar dados
  useEffect(() => {
    if (!open) return;

    if (editingBoat) {
      setNome(editingBoat.nome || '');
      setNumero(editingBoat.numero || '');
      setTipo(editingBoat.tipo === 'jet' ? 'jet' : 'lancha');
      setFabricante(editingBoat.fabricante || '');
      setModelo(editingBoat.modelo || '');
      setAno(editingBoat.ano || new Date().getFullYear());
      setTamanho(editingBoat.tamanho ? String(editingBoat.tamanho) : '');
      setPotencia(editingBoat.potencia || '');
      setCapacidadePassageiros(editingBoat.capacidadePassageiros || 8);
      setVaga(editingBoat.vaga || '');
      setStatusOperacional(editingBoat.statusOperacional || (editingBoat.emManutencao ? 'em_manutencao' : 'disponivel'));
      setHorasMotor(editingBoat.horasMotor || editingBoat.horimetroActual || 0);
      setEmpresas(editingBoat.empresas && editingBoat.empresas.length > 0 ? editingBoat.empresas : ['VALE']);
      setImagemUrl(editingBoat.imagemUrl || '');
      setSelectedDonos(editingBoat.donos || []);
      setAcessorios({
        tenda: !!editingBoat.acessorios?.tenda,
        mesa: !!editingBoat.acessorios?.mesa,
        churrasqueira: !!editingBoat.acessorios?.churrasqueira,
        bancosCadeiras: !!editingBoat.acessorios?.bancosCadeiras,
        extintores: editingBoat.acessorios?.extintores !== undefined ? !!editingBoat.acessorios.extintores : true
      });
    } else {
      setNome('');
      setNumero('');
      setTipo('lancha');
      setFabricante('');
      setModelo('');
      setAno(new Date().getFullYear());
      setTamanho('');
      setPotencia('');
      setCapacidadePassageiros(8);
      setVaga('');
      setStatusOperacional('disponivel');
      setHorasMotor(0);
      setEmpresas(['VALE']);
      setImagemUrl('');
      setSelectedDonos([]);
      setAcessorios({
        tenda: false,
        mesa: false,
        churrasqueira: false,
        bancosCadeiras: false,
        extintores: true
      });
    }
    setCotistaSearch('');
    setErrorMessage(null);
  }, [open, editingBoat]);

  const toggleEmpresa = (emp: string) => {
    if (empresas.includes(emp)) {
      if (empresas.length > 1) {
        setEmpresas(empresas.filter(e => e !== emp));
      }
    } else {
      setEmpresas([...empresas, emp]);
    }
  };

  const toggleDono = (clienteId: string) => {
    if (selectedDonos.includes(clienteId)) {
      setSelectedDonos(selectedDonos.filter(id => id !== clienteId));
    } else {
      setSelectedDonos([...selectedDonos, clienteId]);
    }
  };

  // Clientes para vincular como cotista
  const filteredClients = useMemo(() => {
    const term = cotistaSearch.toLowerCase().trim();
    const sorted = [...clients].sort((a, b) => a.nome.localeCompare(b.nome));
    if (!term) return sorted;
    return sorted.filter(c => c.nome?.toLowerCase().includes(term) || c.cpf?.includes(term));
  }, [clients, cotistaSearch]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome da embarcação.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload: Partial<Embarcacao> = {
        nome: nome.trim(),
        numero: numero.trim(),
        tipo,
        fabricante: fabricante.trim(),
        modelo: modelo.trim(),
        ano: Number(ano) || new Date().getFullYear(),
        tamanho: tamanho.trim(),
        potencia: potencia.trim(),
        capacidadePassageiros: Number(capacidadePassageiros) || 0,
        vaga: vaga.trim(),
        statusOperacional,
        emManutencao: statusOperacional === 'em_manutencao',
        horasMotor: Number(horasMotor) || 0,
        horimetroActual: Number(horasMotor) || 0,
        empresas,
        imagemUrl: imagemUrl.trim(),
        donos: selectedDonos,
        acessorios
      };

      let savedBoat: Embarcacao;
      if (isEditing && editingBoat) {
        savedBoat = boatDB.update(editingBoat.id, payload);
      } else {
        savedBoat = boatDB.create(payload as any);
      }

      onSave(savedBoat);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar embarcação:', err);
      setErrorMessage(err.message || 'Falha ao salvar embarcação.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-stone-900/25 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-label={isEditing ? 'Editar embarcação' : 'Nova embarcação'}
        className={`absolute top-3 right-3 bottom-3 w-[calc(100%-1.5rem)] sm:w-[500px] lg:w-[540px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        {/* Header no padrão do AddWidgetDrawer */}
        <header className="h-14 px-5 flex items-center justify-between border-b border-stone-100 shrink-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-mx-ink-100 text-mx-ink font-bold text-xs flex items-center justify-center shrink-0">
              <Ship className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-stone-900 truncate">
                {isEditing ? (nome || 'Editar embarcação') : 'Nova embarcação'}
              </h2>
              <p className="text-[11px] text-stone-400 truncate">
                {isEditing ? `ID: ${editingBoat?.id}` : 'Cadastro de frota náutica'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                statusOperacional === 'disponivel'
                  ? 'bg-emerald-50 text-emerald-700'
                  : statusOperacional === 'em_manutencao'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {statusOperacional === 'disponivel'
                ? 'Disponível'
                : statusOperacional === 'em_manutencao'
                ? 'Manutenção'
                : 'Pendência'}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário com Scroll Suave */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-stone-800">
          {/* CARD 1: DADOS PRINCIPAIS */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-100">
              <Ship className="w-4 h-4 text-stone-500" />
              <h3 className="text-[13px] font-semibold">Identificação da Frota</h3>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Nome da Embarcação <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: EL MEXICANO 58, FOCKER 240..."
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Tipo de Embarcação
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTipo('lancha')}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        tipo === 'lancha'
                          ? 'bg-mx-ink text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Lancha
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipo('jet')}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        tipo === 'jet'
                          ? 'bg-mx-ink text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Jet Ski
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Código / Número (Ex: 58)
                  </label>
                  <input
                    type="text"
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    placeholder="Ex: 58, 08..."
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Fabricante
                  </label>
                  <input
                    type="text"
                    value={fabricante}
                    onChange={e => setFabricante(e.target.value)}
                    placeholder="Ex: Fibrafort"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={modelo}
                    onChange={e => setModelo(e.target.value)}
                    placeholder="Ex: 242 GTO"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">Ano</label>
                  <input
                    type="number"
                    value={ano}
                    onChange={e => setAno(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: ESPECIFICAÇÕES TÉCNICAS & OPERAÇÃO */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-100">
              <Gauge className="w-4 h-4 text-stone-500" />
              <h3 className="text-[13px] font-semibold">Especificações & Operação</h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Tamanho (Pés / Metros)
                </label>
                <input
                  type="text"
                  value={tamanho}
                  onChange={e => setTamanho(e.target.value)}
                  placeholder="Ex: 24 pés"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Potência do Motor
                </label>
                <input
                  type="text"
                  value={potencia}
                  onChange={e => setPotencia(e.target.value)}
                  placeholder="Ex: 250 HP"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Passageiros
                </label>
                <input
                  type="number"
                  value={capacidadePassageiros}
                  onChange={e => setCapacidadePassageiros(Number(e.target.value))}
                  placeholder="8"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Vaga na Marina
                </label>
                <input
                  type="text"
                  value={vaga}
                  onChange={e => setVaga(e.target.value)}
                  placeholder="Ex: Vaga A-12"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Horímetro (Horas)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={horasMotor}
                  onChange={e => setHorasMotor(Number(e.target.value))}
                  placeholder="0.0"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
                />
              </div>
            </div>

            {/* Status Operacional */}
            <div className="pt-2 border-t border-stone-100">
              <label className="text-[11px] font-semibold text-stone-600 block mb-1.5">
                Situação Operacional
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'disponivel', label: 'Disponível', desc: 'Pronta p/ uso' },
                  { id: 'em_manutencao', label: 'Manutenção', desc: 'Em serviço' },
                  { id: 'pendencia', label: 'Pendência', desc: 'Ajustes' }
                ].map(st => {
                  const isChecked = statusOperacional === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusOperacional(st.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isChecked
                          ? 'border-mx-ink bg-mx-ink-50 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isChecked ? 'text-mx-ink' : 'text-stone-800'}`}>
                          {st.label}
                        </span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-mx-ink stroke-[3]" />}
                      </div>
                      <span className="text-[10px] text-stone-400 block mt-0.5">{st.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Empresas */}
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1.5">
                Empresas Vinculadas
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'VALE', name: 'Vale Náutica' },
                  { id: 'MARINA', name: 'Marina' },
                  { id: 'MEXICANO', name: 'El Mexicano' }
                ].map(emp => {
                  const isChecked = empresas.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleEmpresa(emp.id)}
                      className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-semibold transition-colors cursor-pointer ${
                        isChecked
                          ? 'border-mx-ink bg-mx-ink-100 text-mx-ink'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {emp.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* CARD 3: COTISTAS VINCULADOS */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900">
                <Users className="w-4 h-4 text-stone-500" />
                <h3 className="text-[13px] font-semibold">Cotistas / Donos ({selectedDonos.length})</h3>
              </div>
              <span className="text-[10px] text-stone-400">Vincular cotistas</span>
            </div>

            <input
              type="text"
              placeholder="Buscar cliente por nome para vincular..."
              value={cotistaSearch}
              onChange={e => setCotistaSearch(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-stone-200 text-xs bg-stone-50 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white"
            />

            <div className="border border-stone-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-stone-100 bg-stone-50/50 p-1">
              {filteredClients.slice(0, 15).map(c => {
                const isSelected = selectedDonos.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleDono(c.id)}
                    className={`w-full px-2.5 py-1.5 rounded text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-mx-ink-100 text-mx-ink font-semibold'
                        : 'hover:bg-white text-stone-700'
                    }`}
                  >
                    <span className="truncate">{c.nome}</span>
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-mx-ink border-mx-ink text-white' : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* CARD 4: ACESSÓRIOS & IMAGEM */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-100">
              <Camera className="w-4 h-4 text-stone-500" />
              <h3 className="text-[13px] font-semibold">Mídia & Acessórios</h3>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                URL da Foto da Embarcação
              </label>
              <input
                type="url"
                value={imagemUrl}
                onChange={e => setImagemUrl(e.target.value)}
                placeholder="https://exemplo.com/foto-lancha.jpg"
                className="w-full h-8 px-2.5 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1.5">
                Acessórios Embarcados
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'tenda', label: 'Tenda' },
                  { key: 'mesa', label: 'Mesa' },
                  { key: 'churrasqueira', label: 'Churrasqueira' },
                  { key: 'bancosCadeiras', label: 'Bancos / Cadeiras' },
                  { key: 'extintores', label: 'Extintores Válidos' }
                ].map(acc => {
                  const isChecked = !!(acessorios as any)[acc.key];
                  return (
                    <button
                      key={acc.key}
                      type="button"
                      onClick={() =>
                        setAcessorios(prev => ({
                          ...prev,
                          [acc.key]: !isChecked
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-mx-ink-100 border-mx-ink text-mx-ink font-semibold'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {acc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </form>

        {/* Rodapé fixo do Drawer */}
        <footer className="h-16 px-5 border-t border-stone-100 flex items-center justify-between bg-stone-50/70 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-8 px-3.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Salvar embarcação'}</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
