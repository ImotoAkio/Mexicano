import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Ship, Anchor, Gauge, Trash2, Upload, User, Phone, 
  Image as ImageIcon, Lock, Calendar, FileText, Check, Shield, 
  UserPlus, Users, Clock, ShieldAlert, AlertCircle, AlertTriangle, MapPin, Flame,
  Search, Building2
} from 'lucide-react';
import { Embarcacao, Cliente } from '../types';
import { boatDB } from '../db';
import { isInternalMexicano } from '../utils/constants';
import { getBoatCode } from '../utils/boatUtils';
import defaultJetImg from '../assets/images/jet.webp';
import defaultLanchaImg from '../assets/images/lancha.webp';

interface MarinaBoatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (savedBoat: Embarcacao) => void;
  onDelete?: (id: string, name: string) => void;
  editingBoat?: Embarcacao | null;
  clients?: Cliente[];
  isReadOnly?: boolean;
}

export default function MarinaBoatModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingBoat = null,
  clients = [],
  isReadOnly = false
}: MarinaBoatModalProps) {
  // Identificação principal
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState<'lancha' | 'jet'>('lancha');
  const [modelo, setModelo] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [ano, setAno] = useState<number>(new Date().getFullYear());

  // Documentação Náutica & Marinha
  const [inscricao, setInscricao] = useState('');
  const [validadeDocumento, setValidadeDocumento] = useState('');
  const [validadeSeguro, setValidadeSeguro] = useState('');
  const [validadeExtintor, setValidadeExtintor] = useState('');

  // Proprietários / Clientes Vinculados (Múltiplos)
  const [selectedDonoIds, setSelectedDonoIds] = useState<string[]>([]);
  const [clientToAddId, setClientToAddId] = useState<string>('');
  const [clientSourceFilter, setClientSourceFilter] = useState<'marina' | 'vale' | 'todos'>('marina');
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');

  // Foto & Mídia
  const [imagemUrl, setImagemUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Especificações Técnicas & Localização
  const [horasMotor, setHorasMotor] = useState<number | ''>('');
  const [potencia, setPotencia] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [capacidadePassageiros, setCapacidadePassageiros] = useState<number | ''>('');
  const [vaga, setVaga] = useState('');
  const [chassi, setChassi] = useState('');

  // Observações
  const [observacoes, setObservacoes] = useState('');
  
  // Feedback e Loading
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determina se a embarcação é da Vale Administradora (somente leitura para o Gerente da Marina)
  const isValeOnly = isReadOnly || (editingBoat?.empresas && editingBoat.empresas.includes('VALE') && !editingBoat.empresas.includes('MARINA'));

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setClientToAddId('');
    setClientSourceFilter('marina');
    setClientSearchTerm('');

    if (editingBoat) {
      setNome(editingBoat.nome || '');
      setNumero(editingBoat.numero || '');
      setTipo(editingBoat.tipo || 'lancha');
      setModelo(editingBoat.modelo || '');
      setFabricante(editingBoat.fabricante || '');
      setAno(editingBoat.ano || new Date().getFullYear());

      // Documentação
      setInscricao(editingBoat.inscricao || '');
      setValidadeDocumento(editingBoat.validadeDocumento || editingBoat.validadeTie || (editingBoat.acessorios as any)?.validadeDocumento || (editingBoat.acessorios as any)?.validadeTie || '');
      setValidadeSeguro(editingBoat.validadeSeguro || (editingBoat.acessorios as any)?.validadeSeguro || '');
      setValidadeExtintor(editingBoat.validadeExtintor || (editingBoat.acessorios as any)?.validadeExtintor || '');

      // Especificações
      setHorasMotor(editingBoat.horasMotor !== undefined ? editingBoat.horasMotor : (editingBoat.horimetroActual || ''));
      setPotencia(editingBoat.potencia || '');
      setTamanho(editingBoat.tamanho ? String(editingBoat.tamanho) : (editingBoat.comprimento ? String(editingBoat.comprimento) : ''));
      setCapacidadePassageiros(editingBoat.capacidadePassageiros || '');
      setVaga(editingBoat.vaga || '');
      setChassi(editingBoat.chassi || '');

      // Imagem & Observações
      setImagemUrl(editingBoat.imagemUrl || '');
      setObservacoes(editingBoat.observacoes || '');

      // Identificar todos os proprietários vinculados (desconsiderando a entidade interna El Mexicano)
      const initialDonos: string[] = [];
      if (Array.isArray(editingBoat.donos) && editingBoat.donos.length > 0) {
        editingBoat.donos.forEach(id => {
          if (!initialDonos.includes(id) && !isInternalMexicano(id)) initialDonos.push(id);
        });
      }

      // Também buscar clientes vinculados diretamente
      clients.forEach(c => {
        if (isInternalMexicano(c.id) || isInternalMexicano(c.nome)) return;
        const isLinked = 
          c.embarcacaoId === editingBoat.id ||
          (Array.isArray(c.embarcacoes) && c.embarcacoes.some(eb => eb.embarcacaoId === editingBoat.id));
        if (isLinked && !initialDonos.includes(c.id)) {
          initialDonos.push(c.id);
        }
      });

      setSelectedDonoIds(initialDonos);
    } else {
      // Criar nova embarcação da Marina
      setNome('');
      setNumero('');
      setTipo('lancha');
      setModelo('');
      setFabricante('');
      setAno(new Date().getFullYear());
      setInscricao('');
      setValidadeDocumento('');
      setValidadeSeguro('');
      setValidadeExtintor('');
      setHorasMotor(0);
      setPotencia('');
      setTamanho('');
      setCapacidadePassageiros('');
      setVaga('');
      setChassi('');
      setSelectedDonoIds([]);
      setImagemUrl('');
      setObservacoes('');
    }
  }, [isOpen, editingBoat, clients]);

  if (!isOpen) return null;

  // Upload Real de Imagem
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(`O arquivo "${file.name}" ultrapassa o limite de 10MB.`);
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/upload/boat-image', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success && data.imageUrl) {
        setImagemUrl(data.imageUrl);
      } else {
        setErrorMessage(data.message || 'Falha ao enviar imagem da embarcação.');
      }
    } catch (err: any) {
      setErrorMessage('Erro de conexão ao enviar imagem.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddClient = (clientId: string) => {
    if (!clientId) return;
    if (!selectedDonoIds.includes(clientId)) {
      setSelectedDonoIds(prev => [...prev, clientId]);
    }
    setClientToAddId('');
  };

  const handleRemoveClient = (clientId: string) => {
    setSelectedDonoIds(prev => prev.filter(id => id !== clientId));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValeOnly) return;

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome da embarcação.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Se o usuário selecionou um cliente no dropdown mas não clicou no botão "Vincular", incluir automaticamente
      let finalDonos = [...selectedDonoIds];
      if (clientToAddId && !finalDonos.includes(clientToAddId)) {
        finalDonos.push(clientToAddId);
      }

      const payload: Partial<Embarcacao> = {
        ...(editingBoat || {}),
        nome: nome.trim(),
        numero: numero.trim() || undefined,
        tipo,
        modelo: modelo.trim(),
        fabricante: fabricante.trim(),
        ano: Number(ano) || new Date().getFullYear(),
        inscricao: inscricao.trim(),
        validadeDocumento: validadeDocumento || undefined,
        validadeSeguro: validadeSeguro || undefined,
        validadeExtintor: validadeExtintor || undefined,
        validadeTie: validadeDocumento || undefined,
        horasMotor: horasMotor === '' ? 0 : Number(horasMotor),
        potencia: potencia.trim(),
        tamanho: tamanho.trim(),
        capacidadePassageiros: capacidadePassageiros === '' ? undefined : Number(capacidadePassageiros),
        vaga: vaga.trim(),
        chassi: chassi.trim(),
        imagemUrl: imagemUrl.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        empresas: ['MARINA'], // Garantido: pertence à frota da Marina Club
        donos: finalDonos
      };

      let saved: Embarcacao;
      if (editingBoat?.id) {
        payload.id = editingBoat.id;
        saved = boatDB.update(editingBoat.id, payload) as Embarcacao;
      } else {
        saved = boatDB.create(payload as any);
      }

      if (onSave) onSave(saved);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar embarcação.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingBoat?.id) return;
    if (isValeOnly) {
      alert('Embarcações da Vale Administradora não podem ser excluídas pelo Gerente da Marina.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir "${editingBoat.nome}" da frota da Marina Club?`)) {
      try {
        boatDB.delete(editingBoat.id);
        if (onDelete) onDelete(editingBoat.id, editingBoat.nome);
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao excluir embarcação.');
      }
    }
  };

  const previewImage = imagemUrl.trim() || (tipo === 'jet' ? defaultJetImg : defaultLanchaImg);

  // Classificação dos clientes entre Marina e Vale
  const isClientMarina = (c: Cliente): boolean => {
    if (Array.isArray(c.empresas) && c.empresas.length > 0) {
      return c.empresas.includes('MARINA');
    }
    return false;
  };

  const isClientVale = (c: Cliente): boolean => {
    if (Array.isArray(c.empresas) && c.empresas.length > 0) {
      return c.empresas.includes('VALE');
    }
    return true; // Padrão histórico
  };

  // Clientes disponíveis desconsiderando clientes já vinculados e a entidade El Mexicano
  const allEligibleClients = (clients || []).filter(c => 
    !selectedDonoIds.includes(c.id) &&
    !isInternalMexicano(c.id) &&
    !isInternalMexicano(c.nome)
  );

  const marinaEligibleClients = allEligibleClients.filter(c => isClientMarina(c));
  const valeEligibleClients = allEligibleClients.filter(c => isClientVale(c));

  // Clientes filtrados de acordo com a opção escolhida pelo usuário (Marina vs Vale vs Todos)
  const displayedClientsToAdd = (() => {
    let list: Cliente[] = [];
    if (clientSourceFilter === 'marina') {
      list = marinaEligibleClients;
    } else if (clientSourceFilter === 'vale') {
      list = valeEligibleClients;
    } else {
      list = allEligibleClients;
    }

    if (clientSearchTerm.trim()) {
      const term = clientSearchTerm.toLowerCase().trim();
      list = list.filter(c => 
        (c.nome || '').toLowerCase().includes(term) ||
        (c.telefone || '').includes(term) ||
        (c.cpf || '').includes(term)
      );
    }

    return list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  })();

  // Badge visual de status da validade
  const getValidityBadge = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
          <AlertCircle className="w-3 h-3" /> VENCIDO
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          <Clock className="w-3 h-3" /> VENCE EM {diffDays}d
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
        <Check className="w-3 h-3" /> EM DIA
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* ─── HEADER EXECUTIVO EM AZUL NÁUTICO ─── */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/40 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
              isValeOnly 
                ? 'bg-amber-50 text-amber-700 border border-amber-200/80' 
                : 'bg-blue-600 text-white shadow-blue-600/20'
            }`}>
              {tipo === 'jet' ? <Gauge className="w-5 h-5" /> : <Ship className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {editingBoat 
                    ? (isValeOnly ? `Ficha Técnica: ${editingBoat.nome}` : `Editar Embarcação: ${editingBoat.nome}`)
                    : 'Cadastrar Nova Embarcação na Marina'
                  }
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shadow-2xs ${
                  isValeOnly 
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {isValeOnly ? 'Vale Administradora (Consulta)' : 'Frota Marina Club'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {isValeOnly 
                  ? 'Embarcação da frota compartilhada Vale Administradora com apoio operacional na Marina.'
                  : 'Cadastro e gestão de dados cadastrais, documentação e clientes vinculados.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Fechar formulário"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerta de Modo Consulta para Vale Administradora */}
        {isValeOnly && (
          <div className="px-6 py-3 bg-amber-50/90 border-b border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Modo de Consulta Operacional:</strong> Os dados técnicos e cotas societárias desta embarcação pertencem à Vale Administradora e estão disponíveis apenas para consulta.
            </span>
          </div>
        )}

        {/* ─── CORPO DO FORMULÁRIO (HIERARQUIA NATURAL E CORRETA) ─── */}
        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 subtle-scrollbar flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-2xs animate-in slide-in-from-top-1">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* ─── 1. IDENTIFICAÇÃO PRINCIPAL DA EMBARCAÇÃO ─── */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Ship className="w-4 h-4 text-blue-600" />
              Identificação da Embarcação
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Tipo (Lancha / Jet) */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tipo de Veículo</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={isValeOnly}
                    onClick={() => setTipo('lancha')}
                    className={`h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      tipo === 'lancha'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-60'
                    }`}
                  >
                    <Ship className="w-4 h-4" />
                    <span>Lancha</span>
                  </button>

                  <button
                    type="button"
                    disabled={isValeOnly}
                    onClick={() => setTipo('jet')}
                    className={`h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      tipo === 'jet'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-60'
                    }`}
                  >
                    <Gauge className="w-4 h-4" />
                    <span>Jet Ski</span>
                  </button>
                </div>
              </div>

              {/* Nome da Embarcação */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nome da Embarcação <span className="text-blue-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  disabled={isValeOnly}
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Lancha Blue Marlin, El Mexicano 99"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>

              {/* Código / Número */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Código / N°</label>
                <input
                  type="text"
                  disabled={isValeOnly}
                  value={numero}
                  onChange={e => setNumero(e.target.value)}
                  placeholder="Ex: M99, 05"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              {/* Modelo */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Modelo</label>
                <input
                  type="text"
                  disabled={isValeOnly}
                  value={modelo}
                  onChange={e => setModelo(e.target.value)}
                  placeholder="Ex: Focker 290 Gran Turismo, Sea Doo Wake 170"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>

              {/* Fabricante / Estaleiro */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Fabricante / Estaleiro</label>
                <input
                  type="text"
                  disabled={isValeOnly}
                  value={fabricante}
                  onChange={e => setFabricante(e.target.value)}
                  placeholder="Ex: Fibrafort, BRP, Real"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>

              {/* Ano */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ano Fabricação</label>
                <input
                  type="number"
                  disabled={isValeOnly}
                  value={ano}
                  onChange={e => setAno(Number(e.target.value))}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* ─── 2. FOTO DA EMBARCAÇÃO COM UPLOAD REAL ─── */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Foto da Embarcação
              </span>
              <span className="text-[11px] font-medium text-slate-400">Upload de imagem JPG, PNG ou WEBP</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Prévia da Foto */}
              <div className="w-36 h-28 rounded-2xl border-2 border-slate-200 overflow-hidden bg-slate-100 shrink-0 relative group shadow-xs">
                <img
                  src={previewImage}
                  alt="Prévia da Embarcação"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = tipo === 'jet' ? defaultJetImg : defaultLanchaImg;
                  }}
                />

                {imagemUrl && !isValeOnly && (
                  <button
                    type="button"
                    onClick={() => setImagemUrl('')}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                    title="Remover foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Botão de Upload e URL */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={isValeOnly || isUploadingImage}
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  {!isValeOnly && (
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Upload className={`w-4 h-4 ${isUploadingImage ? 'animate-bounce' : ''}`} />
                      <span>{isUploadingImage ? 'Enviando imagem...' : 'Escolher Foto do Computador'}</span>
                    </button>
                  )}

                  <span className="text-xs text-slate-400 font-medium">ou informe uma URL externa:</span>
                </div>

                <div className="relative">
                  <input
                    type="url"
                    disabled={isValeOnly}
                    value={imagemUrl}
                    onChange={e => setImagemUrl(e.target.value)}
                    placeholder="https://exemplo.com/foto-embarcacao.jpg"
                    className="w-full h-9 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── 3. DOCUMENTAÇÃO NÁUTICA & MARINHA DO BRASIL ─── */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/40 via-slate-50 to-white border border-blue-100 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                Regularidade & Documentação Náutica (Marinha do Brasil)
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Capitania dos Portos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* N° de Inscrição na Marinha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  N° Inscrição na Marinha (TIE / TIEP)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    disabled={isValeOnly}
                    value={inscricao}
                    onChange={e => setInscricao(e.target.value)}
                    placeholder="Ex: 401M2023001234, 381-123456"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block font-medium">Registro oficial da Capitania dos Portos.</span>
              </div>

              {/* Validade do Documento */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Validade do Documento (TIE)
                  </label>
                  {getValidityBadge(validadeDocumento)}
                </div>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    disabled={isValeOnly}
                    value={validadeDocumento}
                    onChange={e => setValidadeDocumento(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block font-medium">Data de expiração do documento TIE.</span>
              </div>

              {/* Validade do Seguro Náutico */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Validade do Seguro Náutico / DPEM
                  </label>
                  {getValidityBadge(validadeSeguro)}
                </div>
                <div className="relative">
                  <ShieldAlert className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    disabled={isValeOnly}
                    value={validadeSeguro}
                    onChange={e => setValidadeSeguro(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block font-medium">Vencimento da apólice de seguro contra terceiros.</span>
              </div>

              {/* Validade do Extintor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Validade do Extintor
                  </label>
                  {getValidityBadge(validadeExtintor)}
                </div>
                <div className="relative">
                  <Flame className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                  <input
                    type="date"
                    disabled={isValeOnly}
                    value={validadeExtintor}
                    onChange={e => setValidadeExtintor(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block font-medium">Vencimento da recarga do extintor.</span>
              </div>
            </div>
          </div>

          {/* ─── 4. PROPRIETÁRIOS & CLIENTES VINCULADOS ─── */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Proprietários & Clientes Responsáveis
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                {selectedDonoIds.length} {selectedDonoIds.length === 1 ? 'vinculado' : 'vinculados'}
              </span>
            </div>

            {/* Lista dos clientes vinculados */}
            {selectedDonoIds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedDonoIds.map(donoId => {
                  const clientObj = clients.find(c => c.id === donoId);
                  const nomeCliente = clientObj ? clientObj.nome : `Cliente ID ${donoId}`;
                  const telCliente = clientObj?.telefone;
                  const isMarina = clientObj ? isClientMarina(clientObj) : false;
                  const isVale = clientObj ? isClientVale(clientObj) : false;

                  return (
                    <div 
                      key={donoId}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isMarina ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isMarina ? <Anchor className="w-4 h-4" /> : <Ship className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 truncate">{nomeCliente}</span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                              isMarina 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {isMarina && isVale ? 'Marina & Vale' : isMarina ? 'Marina Club' : 'Vale Náutica'}
                            </span>
                          </div>
                          {telCliente && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-600" /> {telCliente}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isValeOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveClient(donoId)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remover vínculo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                Nenhum proprietário ou cliente vinculado a esta embarcação ainda.
              </div>
            )}

            {/* Adicionar novo cliente à embarcação com 2 opções de origem */}
            {!isValeOnly && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    Opções para vincular cliente:
                  </span>

                  {/* ─── 2 OPÇÕES CLARAS DE SELEÇÃO: CLIENTE DA MARINA vs CLIENTE DA VALE ─── */}
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => { setClientSourceFilter('marina'); setClientToAddId(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        clientSourceFilter === 'marina'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Anchor className="w-3.5 h-3.5" />
                      <span>Clientes da Marina ({marinaEligibleClients.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setClientSourceFilter('vale'); setClientToAddId(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        clientSourceFilter === 'vale'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Clientes da Vale ({valeEligibleClients.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setClientSourceFilter('todos'); setClientToAddId(''); }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        clientSourceFilter === 'todos'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>Todos ({allEligibleClients.length})</span>
                    </button>
                  </div>
                </div>

                {/* Mensagem explicativa */}
                <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 flex items-center gap-2">
                  {clientSourceFilter === 'marina' && (
                    <>
                      <Anchor className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span><strong>Clientes da Marina Club:</strong> Clientes cadastrados diretamente na Marina para guarda ou uso de vaga.</span>
                    </>
                  )}
                  {clientSourceFilter === 'vale' && (
                    <>
                      <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span><strong>Clientes da Vale Administradora:</strong> Cotistas da Vale que possuem embarcação própria guardada na Marina.</span>
                    </>
                  )}
                  {clientSourceFilter === 'todos' && (
                    <>
                      <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Exibindo todos os clientes disponíveis na base (Marina Club e Vale Administradora).</span>
                    </>
                  )}
                </div>

                {/* Filtro de busca + Dropdown + Botão Vincular */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    {/* Busca Rápida por nome */}
                    <div className="relative sm:w-48 shrink-0">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={clientSearchTerm}
                        onChange={e => setClientSearchTerm(e.target.value)}
                        placeholder="Filtrar por nome..."
                        className="w-full h-10 pl-8 pr-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600"
                      />
                    </div>

                    {/* Dropdown de Clientes com min-w-0 para nunca estourar a tela */}
                    <div className="flex-1 min-w-0">
                      <select
                        value={clientToAddId}
                        onChange={e => setClientToAddId(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 truncate"
                      >
                        <option value="">
                          {displayedClientsToAdd.length === 0
                            ? 'Nenhum cliente disponível nesta categoria'
                            : clientSourceFilter === 'marina'
                            ? 'Selecione um cliente da Marina...'
                            : clientSourceFilter === 'vale'
                            ? 'Selecione um cliente vinculado à Vale Administradora...'
                            : 'Selecione um cliente para vincular...'}
                        </option>

                        {clientSourceFilter === 'todos' ? (
                          <>
                            {marinaEligibleClients.length > 0 && (
                              <optgroup label="── Clientes da Marina Club ──">
                                {displayedClientsToAdd.filter(c => isClientMarina(c)).map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome} {c.telefone ? `(${c.telefone})` : ''}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {valeEligibleClients.length > 0 && (
                              <optgroup label="── Clientes da Vale Administradora ──">
                                {displayedClientsToAdd.filter(c => isClientVale(c) && !isClientMarina(c)).map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome} {c.telefone ? `(${c.telefone})` : ''}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        ) : (
                          displayedClientsToAdd.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nome} {c.telefone ? `(${c.telefone})` : ''} {isClientVale(c) && !isClientMarina(c) ? '• Vale Administradora' : '• Marina Club'}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Botão Vincular garantido sempre visível */}
                    <button
                      type="button"
                      disabled={!clientToAddId}
                      onClick={() => handleAddClient(clientToAddId)}
                      className="h-10 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Vincular</span>
                    </button>
                  </div>

                  {clientToAddId && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/80 rounded-lg border border-blue-200 text-xs text-blue-900 animate-in fade-in">
                      <span className="font-semibold">
                        Cliente selecionado: {clients.find(c => c.id === clientToAddId)?.nome}
                      </span>
                      <span className="text-[11px] text-blue-700">
                        Clique em <strong>Vincular</strong> ou salve a embarcação diretamente.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── 5. ESPECIFICAÇÕES TÉCNICAS & OPERAÇÃO ─── */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-600" />
              Especificações Técnicas & Operação
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {/* Horímetro */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Horímetro Atual</label>
                <div className="relative">
                  <Gauge className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    disabled={isValeOnly}
                    value={horasMotor}
                    onChange={e => setHorasMotor(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  />
                </div>
              </div>

              {/* Potência */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Potência do Motor</label>
                <input
                  type="text"
                  disabled={isValeOnly}
                  value={potencia}
                  onChange={e => setPotencia(e.target.value)}
                  placeholder="Ex: 300 HP, 170 HP"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>

              {/* Comprimento / Pés */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Comprimento / Pés</label>
                <input
                  type="text"
                  disabled={isValeOnly}
                  value={tamanho}
                  onChange={e => setTamanho(e.target.value)}
                  placeholder="Ex: 29 pés, 24ft"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>

              {/* Lotação */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Lotação (Passageiros)</label>
                <input
                  type="number"
                  disabled={isValeOnly}
                  value={capacidadePassageiros}
                  onChange={e => setCapacidadePassageiros(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 10"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>

              {/* Vaga no Pátio (Discreta, sem destaque exagerado) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Vaga no Pátio / Cais</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    disabled={isValeOnly}
                    value={vaga}
                    onChange={e => setVaga(e.target.value)}
                    placeholder="Ex: Seca A-12, Box 04"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                  />
                </div>
              </div>

              {/* N° do Chassi / Casco */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">N° Chassi / Casco (HIN)</label>
                <input
                  type="text"
                  disabled={isValeOnly}
                  value={chassi}
                  onChange={e => setChassi(e.target.value)}
                  placeholder="Ex: BR-FKB12345J323"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* ─── 6. OBSERVAÇÕES INTERNAS ─── */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-2 shadow-xs">
            <label className="block text-xs font-bold text-slate-700">Observações Operacionais da Marina</label>
            <textarea
              rows={2}
              disabled={isValeOnly}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Instruções de manobra, marinheiro particular autorizado, particularidades do motor..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 resize-none font-medium"
            />
          </div>
        </form>

        {/* ─── FOOTER DO MODAL ─── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div>
            {!isValeOnly && editingBoat && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Embarcação</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              {isValeOnly ? 'Fechar Consulta' : 'Cancelar'}
            </button>

            {!isValeOnly && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Embarcação'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
