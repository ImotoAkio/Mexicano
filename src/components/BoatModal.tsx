import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { 
  Anchor, X, Ship, User, Zap, ChevronDown, RefreshCw, 
  ImageIcon, Edit2, Upload, Check 
} from 'lucide-react';
import { boatDB, clientDB } from '../db';
import { Embarcacao, Cliente } from '../types';

interface BoatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (boat: Embarcacao) => void;
  editingBoat?: Embarcacao | null;
  clients?: Cliente[];
  showWhatsAppMapping?: boolean;
}

export default function BoatModal({
  isOpen,
  onClose,
  onSave,
  editingBoat = null,
  clients: propClients,
  showWhatsAppMapping = true
}: BoatModalProps) {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [tipo, setTipo] = useState<'jet' | 'lancha'>('lancha');
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [modelo, setModelo] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [chassi, setChassi] = useState('');
  const [inscricao, setInscricao] = useState('');
  const [tipoPropulsao, setTipoPropulsao] = useState('MOTOR');
  const [potencia, setPotencia] = useState('');
  const [selectedDonos, setSelectedDonos] = useState<string[]>([]);
  const [googleCalendarId, setGoogleCalendarId] = useState('');
  const [whatsappGroupId, setWhatsappGroupId] = useState('');
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [emManutencao, setEmManutencao] = useState(false);
  const [temSom, setTemSom] = useState(false);
  const [imagemUrl, setImagemUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [isUploadingDocumento, setIsUploadingDocumento] = useState(false);
  const [seguroUrl, setSeguroUrl] = useState('');
  const [isUploadingSeguro, setIsUploadingSeguro] = useState(false);
  const [empresas, setEmpresas] = useState<string[]>(['VALE']);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (propClients && propClients.length > 0) {
      setClients(propClients);
    } else {
      setClients(clientDB.getAll());
    }
  }, [propClients, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (editingBoat) {
        setTipo(editingBoat.tipo || 'lancha');
        setNome(editingBoat.nome || '');
        setNumero(editingBoat.numero || '');
        setModelo(editingBoat.modelo || '');
        setFabricante(editingBoat.fabricante || '');
        setAno(editingBoat.ano || new Date().getFullYear());
        setChassi(editingBoat.chassi || '');
        setInscricao(editingBoat.inscricao || '');
        setTipoPropulsao(editingBoat.tipo_propulsao || 'MOTOR');
        setPotencia(editingBoat.potencia || '');
        setSelectedDonos(editingBoat.donos || []);
        
        let mappedId = editingBoat.googleCalendarId || '';
        if (!mappedId) {
          try {
            const mappingsStr = localStorage.getItem('nautical_calendar_mappings');
            if (mappingsStr) {
              const mappings = JSON.parse(mappingsStr);
              mappedId = mappings[editingBoat.nome] || mappings[editingBoat.id] || '';
            }
          } catch (e) {}
        }
        setGoogleCalendarId(mappedId);
        setWhatsappGroupId(editingBoat.whatsappGroupId || '');
        setEmManutencao(editingBoat.emManutencao || false);
        setTemSom(editingBoat.temSom || false);
        setImagemUrl(editingBoat.imagemUrl || '');
        setDocumentoUrl(editingBoat.documentoUrl || '');
        setSeguroUrl(editingBoat.seguroUrl || '');
        setEmpresas(editingBoat.empresas && editingBoat.empresas.length > 0 ? editingBoat.empresas : ['VALE']);
        setIsAdvancedOpen(Boolean(mappedId || editingBoat.whatsappGroupId));
      } else {
        setTipo('lancha');
        setNome('');
        setNumero('');
        setModelo('');
        setFabricante('');
        setAno(new Date().getFullYear());
        setChassi('');
        setInscricao('');
        setTipoPropulsao('MOTOR');
        setPotencia('');
        setSelectedDonos([]);
        setGoogleCalendarId('');
        setWhatsappGroupId('');
        setEmManutencao(false);
        setTemSom(false);
        setImagemUrl('');
        setDocumentoUrl('');
        setSeguroUrl('');
        setEmpresas(['VALE']);
        setIsAdvancedOpen(false);
      }
    }
  }, [isOpen, editingBoat]);

  const handleFetchGroups = async () => {
    setIsFetchingGroups(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/whatsapp/groups', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        const unique = Array.from(new Map(data.groups.map((g: any) => [g.id || g.jid, g])).values());
        setAvailableGroups(unique);
        showToast(`Foram carregados ${unique.length} grupos do WhatsApp!`);
      } else {
        showToast(data.message || 'Falha ao buscar grupos', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao conectar à API de grupos', 'error');
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('A imagem não pode ter mais que 5MB.', 'error');
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/upload/boat-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImagemUrl(data.imageUrl);
        showToast('Imagem carregada com sucesso!');
      } else {
        showToast(data.message || 'Erro ao fazer upload da imagem', 'error');
      }
    } catch (err: any) {
      showToast('Falha na comunicação com o servidor para envio de imagem', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'documento' | 'seguro') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'documento') setIsUploadingDocumento(true);
    else setIsUploadingSeguro(true);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/upload/boat-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (type === 'documento') setDocumentoUrl(data.documentUrl);
        else setSeguroUrl(data.documentUrl);
        showToast('Arquivo carregado com sucesso!');
      } else {
        showToast(data.message || 'Erro ao fazer upload do arquivo', 'error');
      }
    } catch (err: any) {
      showToast('Falha na comunicação com o servidor', 'error');
    } finally {
      if (type === 'documento') setIsUploadingDocumento(false);
      else setIsUploadingSeguro(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !numero.trim()) {
      showToast('Nome e número do veículo são campos obrigatórios.', 'error');
      return;
    }

    const cleanNum = numero.trim().toUpperCase().replace(/M/g, '').replace(/\D/g, '');
    if (!cleanNum) {
      showToast('Por favor, informe uma numeração válida para o veículo.', 'error');
      return;
    }

    try {
      let savedBoat: Embarcacao;
      const boatPayload: any = {
        tipo,
        nome: nome.trim(),
        numero: cleanNum,
        modelo: modelo.trim(),
        fabricante: fabricante.trim(),
        ano,
        chassi: chassi.trim() || undefined,
        inscricao: inscricao.trim() || undefined,
        tipo_propulsao: tipoPropulsao.trim() || undefined,
        potencia: potencia.trim() || undefined,
        donos: selectedDonos,
        googleCalendarId: googleCalendarId.trim() || undefined,
        whatsappGroupId: whatsappGroupId.trim() || undefined,
        emManutencao,
        temSom,
        imagemUrl: imagemUrl || undefined,
        documentoUrl: documentoUrl || undefined,
        seguroUrl: seguroUrl || undefined,
        empresas
      };

      if (editingBoat) {
        boatPayload.id = editingBoat.id;
        savedBoat = boatDB.update(editingBoat.id, boatPayload) as Embarcacao;
      } else {
        const newId = `boat_${Date.now()}`;
        boatPayload.id = newId;
        savedBoat = boatDB.create(boatPayload) as Embarcacao;
      }

      try {
        await fetch('/api/db/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ type: 'boats', action: 'upsert', data: savedBoat })
        });
      } catch (err) {
        console.warn("Aviso ao sincronizar embarcação no servidor:", err);
      }

      showToast(editingBoat ? 'Embarcação atualizada com sucesso!' : 'Embarcação cadastrada com sucesso!');
      onSave(savedBoat);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar embarcação.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div id="boat-modal" className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-200">
      {toast && (
        <div className={`fixed top-5 right-5 z-[60] px-4 py-3 rounded-xl shadow-xl border text-xs font-bold animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] lg:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {editingBoat ? 'Editar Embarcação' : 'Nova Embarcação'}
              </h3>
              <p className="text-xs text-slate-500">Preencha as informações do veículo náutico (navegação fluida por TAB)</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col justify-between space-y-6 subtle-scrollbar">
          
          {/* 3-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Coluna 1: Dados de Identificação & Ficha Técnica (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center space-x-2 pb-1 border-b border-slate-100">
                <Ship className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Identificação Principal</h4>
              </div>

              {/* Nome da Embarcação */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nome da Embarcação *</label>
                <input
                  id="input-boat-name"
                  type="text"
                  required
                  tabIndex={1}
                  placeholder="Ex: Poseidon"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-medium"
                  autoFocus
                />
              </div>

              {/* Numeração e Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código / N° *</label>
                  <input
                    id="input-boat-number"
                    type="text"
                    required
                    tabIndex={2}
                    placeholder="Ex: 03 ou 12"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Google Cal: M{numero || '00'}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Veículo *</label>
                  <select
                    id="select-boat-type"
                    tabIndex={3}
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as 'jet' | 'lancha')}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white cursor-pointer"
                  >
                    <option value="lancha">Lancha</option>
                    <option value="jet">Jet Ski</option>
                  </select>
                </div>
              </div>

              {/* Fabricante, Modelo, Ano */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fabricante</label>
                  <input
                    id="input-boat-builder"
                    type="text"
                    tabIndex={4}
                    placeholder="Ex: Yamaha"
                    value={fabricante}
                    onChange={(e) => setFabricante(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Modelo</label>
                  <input
                    id="input-boat-model"
                    type="text"
                    tabIndex={5}
                    placeholder="Ex: Focker 255"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ano</label>
                  <input
                    id="input-boat-year"
                    type="number"
                    tabIndex={6}
                    placeholder="Ex: 2023"
                    value={ano || ''}
                    onChange={(e) => setAno(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Especificações Técnicas para Contrato */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
                <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Especificações Técnicas (Contratos)</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">N° do Chassi</label>
                    <input
                      id="input-boat-chassi"
                      type="text"
                      tabIndex={7}
                      placeholder="Ex: BR-MEX12345"
                      value={chassi}
                      onChange={(e) => setChassi(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">N° Inscrição Marinha</label>
                    <input
                      id="input-boat-inscricao"
                      type="text"
                      tabIndex={8}
                      placeholder="Ex: 401-123456-7"
                      value={inscricao}
                      onChange={(e) => setInscricao(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Propulsão</label>
                    <input
                      id="input-boat-propulsao"
                      type="text"
                      tabIndex={9}
                      placeholder="Ex: MOTOR"
                      value={tipoPropulsao}
                      onChange={(e) => setTipoPropulsao(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Potência (HP/CV)</label>
                    <input
                      id="input-boat-potencia"
                      type="text"
                      tabIndex={10}
                      placeholder="Ex: 250 HP"
                      value={potencia}
                      onChange={(e) => setPotencia(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 2: Coproprietários, Integrações & Status (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center space-x-2 pb-1 border-b border-slate-100">
                <User className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Coproprietários & Sistema</h4>
              </div>

              {/* Proprietários Multi-select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coproprietários (Clientes)</label>
                {clients.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                    Nenhum cliente cadastrado no sistema.
                  </p>
                ) : (
                  <Select
                    tabIndex={11}
                    isMulti
                    options={clients.map(c => ({ value: c.id, label: c.nome }))}
                    value={clients.filter(c => selectedDonos.includes(c.id)).map(c => ({ value: c.id, label: c.nome }))}
                    onChange={(selected: any) => {
                      setSelectedDonos(selected ? selected.map((s: any) => s.value) : []);
                    }}
                    placeholder="Buscar e adicionar cotistas..."
                    className="react-select-container text-xs"
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "Nenhum cliente encontrado"}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        backgroundColor: '#f8fafc',
                        borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                        borderRadius: '0.75rem',
                        minHeight: '38px',
                      }),
                      valueContainer: (base) => ({
                        ...base,
                        maxHeight: '80px',
                        overflowY: 'auto'
                      })
                    }}
                  />
                )}
              </div>

              {/* Configurações Avançadas */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-700 bg-slate-100/70 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    Campos Avançados (Google & WhatsApp)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(googleCalendarId || whatsappGroupId) && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Ativo</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isAdvancedOpen && (
                  <div className="p-3 space-y-3 bg-white border-t border-slate-200 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">ID Agenda Google Calendar (Opcional)</label>
                      <input
                        id="input-boat-calendar-id"
                        type="text"
                        tabIndex={12}
                        placeholder="Ex: xxx@group.calendar.google.com"
                        value={googleCalendarId}
                        onChange={(e) => setGoogleCalendarId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                      />
                    </div>

                    {showWhatsAppMapping && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-semibold text-slate-700">Grupo WhatsApp (Evolution API)</label>
                          <button 
                            type="button" 
                            onClick={handleFetchGroups}
                            disabled={isFetchingGroups}
                            className="text-[10px] text-teal-600 font-semibold hover:text-teal-700 flex items-center cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isFetchingGroups ? 'animate-spin' : ''}`} />
                            {isFetchingGroups ? 'Buscando...' : 'Buscar Grupos'}
                          </button>
                        </div>

                        {availableGroups.length > 0 ? (
                          <select
                            id="input-boat-whatsapp-id-select"
                            tabIndex={13}
                            value={whatsappGroupId}
                            onChange={(e) => setWhatsappGroupId(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-mono"
                          >
                            <option value="">-- Selecione o Grupo do Barco --</option>
                            {availableGroups.map((g: any, idx: number) => (
                              <option key={g.id ? `grp-${g.id}-${idx}` : `grp-${idx}`} value={g.id}>{g.subject || g.name || g.id}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id="input-boat-whatsapp-id"
                            type="text"
                            tabIndex={13}
                            placeholder="Ex: 120363123456789012@g.us"
                            value={whatsappGroupId}
                            onChange={(e) => setWhatsappGroupId(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-mono"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1">
                <div className="border border-rose-200/80 bg-rose-50/40 p-2.5 rounded-xl flex items-center space-x-2.5">
                  <input
                    id="boat-maintenance-checkbox"
                    type="checkbox"
                    tabIndex={14}
                    checked={emManutencao}
                    onChange={(e) => setEmManutencao(e.target.checked)}
                    className="w-4 h-4 text-rose-600 bg-white border-rose-300 rounded focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="boat-maintenance-checkbox" className="text-xs font-semibold text-rose-900 cursor-pointer select-none">
                    Embarcação em Manutenção
                  </label>
                </div>

                <div className="border border-indigo-200/80 bg-indigo-50/40 p-2.5 rounded-xl flex items-center space-x-2.5">
                  <input
                    id="boat-sound-checkbox"
                    type="checkbox"
                    tabIndex={15}
                    checked={temSom}
                    onChange={(e) => setTemSom(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-white border-indigo-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="boat-sound-checkbox" className="text-xs font-semibold text-indigo-900 cursor-pointer select-none">
                    Possui Sistema de Som Obrigatório
                  </label>
                </div>
              </div>
            </div>

            {/* Coluna 3: Mídia & Vínculo de Empresa (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center space-x-2 pb-1 border-b border-slate-100">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">3. Fotos & Vínculos</h4>
              </div>

              {/* Vínculo com Empresa(s) */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Empresas Vinculadas</label>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'VALE', label: 'Vale Administradora', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', tabIdx: 16 },
                    { id: 'MARINA', label: 'Marina Club', color: 'text-teal-700 bg-teal-50 border-teal-200', tabIdx: 17 },
                    { id: 'MEXICANO', label: 'Mexicano Lanchas', color: 'text-amber-700 bg-amber-50 border-amber-200', tabIdx: 18 },
                  ].map(item => (
                    <label key={item.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      empresas.includes(item.id) ? item.color : 'bg-white text-slate-500 border-slate-200 opacity-70'
                    }`}>
                      <input
                        type="checkbox"
                        tabIndex={item.tabIdx}
                        checked={empresas.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEmpresas([...empresas, item.id]);
                          } else {
                            if (empresas.length > 1) {
                              setEmpresas(empresas.filter(x => x !== item.id));
                            } else {
                              showToast('Selecione pelo menos uma empresa.', 'error');
                            }
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Foto da Embarcação */}
              <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 relative group hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg, image/webp" 
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Clique para enviar uma foto"
                />
                {isUploadingImage ? (
                  <div className="flex flex-col items-center py-2">
                    <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mb-1" />
                    <span className="text-[10px] font-semibold text-slate-600">Enviando foto...</span>
                  </div>
                ) : imagemUrl ? (
                  <div className="flex flex-col items-center space-y-1.5">
                    <div className="w-20 h-16 rounded-lg overflow-hidden shadow-xs border border-slate-200">
                      <img src={imagemUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 flex items-center"><Edit2 className="w-3 h-3 mr-1" /> Trocar foto</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-2 text-slate-500 group-hover:text-indigo-500 transition-colors">
                    <ImageIcon className="w-5 h-5 mb-1 text-slate-400" />
                    <span className="text-xs font-semibold">Foto da Embarcação</span>
                    <span className="text-[9px] text-slate-400">PNG/JPG (Max 5MB)</span>
                  </div>
                )}
              </div>

              {/* Anexos de Documento & Seguro */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 relative group hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                  <input 
                    type="file" 
                    accept="application/pdf, image/png, image/jpeg" 
                    onChange={(e) => handleDocumentUpload(e, 'documento')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Anexar Documento"
                  />
                  {documentoUrl ? (
                    <div className="flex flex-col items-center">
                      <Check className="w-4 h-4 text-emerald-600 mb-0.5" />
                      <span className="text-[9px] font-bold text-emerald-700">Doc Anexado</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500">
                      <Upload className="w-4 h-4 mb-0.5" />
                      <span className="text-[9px] font-bold uppercase">Documento</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 relative group hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                  <input 
                    type="file" 
                    accept="application/pdf, image/png, image/jpeg" 
                    onChange={(e) => handleDocumentUpload(e, 'seguro')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Anexar Seguro"
                  />
                  {seguroUrl ? (
                    <div className="flex flex-col items-center">
                      <Check className="w-4 h-4 text-emerald-600 mb-0.5" />
                      <span className="text-[9px] font-bold text-emerald-700">Seguro Anexado</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500">
                      <Upload className="w-4 h-4 mb-0.5" />
                      <span className="text-[9px] font-bold uppercase">Apólice Seguro</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons (Footer) */}
          <div className="flex space-x-3 pt-3 border-t border-slate-100 shrink-0">
            <button
              id="cancel-save-boat"
              type="button"
              tabIndex={19}
              onClick={onClose}
              className="flex-1 sm:flex-initial sm:w-36 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              id="submit-save-boat"
              type="submit"
              tabIndex={20}
              className="flex-1 sm:flex-initial sm:w-48 inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Salvar Embarcação
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
