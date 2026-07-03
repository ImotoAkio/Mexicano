import React, { useState } from 'react';
import { boatDB, clientDB } from '../db';
import { Embarcacao, Cliente } from '../types';
import { Ship, Plus, Search, Trash2, Edit2, User, Key, Check, X, ShieldAlert, Anchor, Wrench, RefreshCw, Zap, Upload, Image as ImageIcon, Volume2 } from 'lucide-react';
import Select from 'react-select';

export default function BoatPage() {
  const [boats, setBoats] = useState<Embarcacao[]>(() => boatDB.getAll());
  const [clients, setClients] = useState<Cliente[]>(() => clientDB.getAll());
  const [search, setSearch] = useState('');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<'jet' | 'lancha'>('lancha');
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [modelo, setModelo] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [selectedDonos, setSelectedDonos] = useState<string[]>([]); // client IDs (unlimited)
  const [ownerSearch, setOwnerSearch] = useState('');
  const [googleCalendarId, setGoogleCalendarId] = useState(''); // Google Calendar ID directly linked to the boat
  const [whatsappGroupId, setWhatsappGroupId] = useState(''); // Evolution API WhatsApp Group ID
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [mappingState, setMappingState] = useState<Record<string, string>>({}); // boat.id -> group.id
  const [emManutencao, setEmManutencao] = useState(false);
  const [temSom, setTemSom] = useState(false);
  const [imagemUrl, setImagemUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Custom Confirm State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3550);
  };

  const handleRefresh = () => {
    setBoats(boatDB.getAll());
    setClients(clientDB.getAll());
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setTipo('lancha');
    setNome('');
    setNumero('');
    setModelo('');
    setFabricante('');
    setAno(new Date().getFullYear());
    setSelectedDonos([]);
    setOwnerSearch('');
    setGoogleCalendarId('');
    setWhatsappGroupId('');
    setEmManutencao(false);
    setTemSom(false);
    setImagemUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (boat: Embarcacao) => {
    setEditingId(boat.id);
    setTipo(boat.tipo);
    setNome(boat.nome);
    setNumero(boat.numero);
    setModelo(boat.modelo);
    setFabricante(boat.fabricante);
    setAno(boat.ano);
    setSelectedDonos(boat.donos);
    setOwnerSearch('');
    
    // Attempt to read from global calendar mapping if local one is empty
    let mappedId = boat.googleCalendarId || '';
    if (!mappedId) {
      try {
        const mappingsStr = localStorage.getItem('nautical_calendar_mappings');
        if (mappingsStr) {
          const mappings = JSON.parse(mappingsStr);
          mappedId = mappings[boat.nome] || mappings[boat.id] || '';
        }
      } catch (e) {}
    }
    setGoogleCalendarId(mappedId);
    
    setWhatsappGroupId(boat.whatsappGroupId || '');
    setAvailableGroups([]);
    setEmManutencao(boat.emManutencao || false);
    setTemSom(boat.temSom || false);
    setImagemUrl(boat.imagemUrl || '');
    setIsModalOpen(true);
  };

  const handleFetchGroups = async () => {
    setIsFetchingGroups(true);
    try {
      const res = await fetch('/api/whatsapp/groups');
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setAvailableGroups(data.groups);
        showToast(`Foram carregados ${data.groups.length} grupos do WhatsApp com sucesso!`);
      } else {
        showToast(data.message || 'Falha ao buscar grupos', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao conectar à API de grupos', 'error');
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleOpenMappingModal = async () => {
    setIsMappingModalOpen(true);
    setIsFetchingGroups(true);
    try {
      const res = await fetch('/api/whatsapp/groups');
      const data = await res.json();
      if (!data.success || !Array.isArray(data.groups)) {
        showToast(data.message || 'Falha ao baixar lista de grupos da API', 'error');
        setAvailableGroups([]);
        setIsFetchingGroups(false);
        return;
      }

      setAvailableGroups(data.groups);

      // Auto suggest
      const newMapping: Record<string, string> = {};
      const currentBoats = boatDB.getAll();
      let suggestionsCount = 0;

      for (const b of currentBoats) {
        if (b.whatsappGroupId) {
          newMapping[b.id] = b.whatsappGroupId;
          continue;
        }

        const paddedNum = b.numero ? b.numero.padStart(2, '0') : '';
        const standardName = `EL MEXICANO ${paddedNum}`;
        const group = data.groups.find((g: any) => {
          const subject = (g.subject || g.name || '').toUpperCase();
          if (paddedNum && subject.includes(standardName.toUpperCase())) return true;
          if (b.nome && subject.includes(b.nome.toUpperCase())) return true;
          return false;
        });

        if (group) {
          newMapping[b.id] = group.id;
          suggestionsCount++;
        }
      }

      setMappingState(newMapping);
      showToast(`Carregados ${data.groups.length} grupos. ${suggestionsCount} associações sugeridas.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao mapear grupos da API', 'error');
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleSaveMapping = () => {
    try {
      const currentBoats = boatDB.getAll();
      let count = 0;
      for (const b of currentBoats) {
        const newGroupId = mappingState[b.id] || '';
        if (newGroupId !== (b.whatsappGroupId || '')) {
          boatDB.update(b.id, { whatsappGroupId: newGroupId || undefined });
          count++;
        }
      }
      handleRefresh();
      setIsMappingModalOpen(false);
      showToast(`Mapeamento salvo! ${count} embarcações atualizadas.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar mapeamento', 'error');
    }
  };

  const handleMappingChange = (boatId: string, groupId: string) => {
    setMappingState(prev => ({ ...prev, [boatId]: groupId }));
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

  const handleToggleOwner = (clientId: string) => {
    if (selectedDonos.includes(clientId)) {
      setSelectedDonos(selectedDonos.filter(id => id !== clientId));
    } else {
      setSelectedDonos([...selectedDonos, clientId]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !numero.trim()) {
      showToast('Nome e número do veículo são campos obrigatórios.', 'error');
      return;
    }

    // Double check numeric pad
    const cleanNum = numero.trim().toUpperCase().replace(/M/g, '').replace(/\D/g, '');
    if (!cleanNum) {
      showToast('Por favor, informe uma numeração válida para o veículo.', 'error');
      return;
    }

    if (selectedDonos.length === 0) {
      showToast('Por favor, selecione pelo menos 1 proprietário.', 'error');
      return;
    }

    try {
      if (editingId) {
        boatDB.update(editingId, {
          tipo,
          nome,
          numero: cleanNum,
          modelo,
          fabricante,
          ano,
          donos: selectedDonos,
          googleCalendarId: googleCalendarId.trim() || undefined,
          whatsappGroupId: whatsappGroupId.trim() || undefined,
          emManutencao,
          temSom,
          imagemUrl: imagemUrl || undefined
        });
        showToast('Embarcação atualizada com sucesso!');
      } else {
        boatDB.create({
          tipo,
          nome,
          numero: cleanNum,
          modelo,
          fabricante,
          ano,
          donos: selectedDonos,
          googleCalendarId: googleCalendarId.trim() || undefined,
          whatsappGroupId: whatsappGroupId.trim() || undefined,
          emManutencao,
          temSom,
          imagemUrl: imagemUrl || undefined
        });
        showToast('Embarcação cadastrada com sucesso!');
      }
      
      // Save calendar mappings to global config
      try {
        if (googleCalendarId.trim()) {
          const mappingsStr = localStorage.getItem('nautical_calendar_mappings');
          const mappings = mappingsStr ? JSON.parse(mappingsStr) : {};
          mappings[nome] = googleCalendarId.trim();
          localStorage.setItem('nautical_calendar_mappings', JSON.stringify(mappings));
          
          const token = localStorage.getItem('admin_token');
          if (token) {
            fetch('/api/calendar/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ calendar_mappings: mappings })
            }).catch(console.error);
          }
        }
      } catch (e) {}

      setIsModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar embarcação', 'error');
    }
  };

  const initiateDelete = (id: string, name: string) => {
    setDeleteConfirmation({ id, name });
  };

  const executeDelete = () => {
    if (!deleteConfirmation) return;
    try {
      boatDB.delete(deleteConfirmation.id);
      showToast('Embarcação excluída com sucesso.');
      setDeleteConfirmation(null);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover embarcação', 'error');
    }
  };

  const filteredBoats = boats.filter(b => 
    b.nome.toLowerCase().includes(search.toLowerCase()) ||
    b.numero.includes(search) ||
    b.modelo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id="boats-list-section" className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 border transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Cadastro de Embarcações</h2>
          <p className="text-sm text-slate-500">Registre os veículos náuticos (Lanchas e Jets) e relacione seus proprietários compartilhados (coproprietários).</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleOpenMappingModal}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
            title="Mapear grupos do WhatsApp usando Evolution API"
          >
            <Zap className="w-4 h-4 mr-2 text-teal-500" />
            Mapear WhatsApp
          </button>
          <button
            id="btn-new-boat"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Embarcação
          </button>
        </div>
      </div>

      {/* Quick guide on code constraints */}
      <div className="flex items-start space-x-3 p-4 bg-slate-50 border border-slate-100 rounded-lg">
        <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Regras de Negócio Náutico:</span>
          <p className="mt-0.5">Cada embarcação suporta cotistas/proprietários sem limite de quantidade e possui uma numeração única que formará o título sincronizado do Google Calendar (por exemplo, embarcação número <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-800">03</code> criará títulos formatados como <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-800">M03 - Nome do Cliente</code>).</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          id="search-boats"
          type="text"
          placeholder="Buscar veículo por nome, modelo ou número código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        />
      </div>

      {/* Ships Grid */}
      {filteredBoats.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
          <Ship className="w-12 h-12 text-slate-400 mb-3 stroke-1" />
          <p className="text-sm font-medium text-slate-900">Nenhuma embarcação encontrada</p>
          <p className="text-xs text-slate-500 mt-1">Busque por outra palavra-chave ou crie uma nova embarcação acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBoats.map(boat => {
            // Find clients associated to this boat
            const ownerNames = boat.donos
              .map(id => clientDB.getById(id))
              .filter((c): c is Cliente => !!c);

            return (
              <div id={`boat-card-${boat.id}`} key={boat.id} className="bg-white border border-slate-100 rounded-xl shadow-xs hover:shadow-md hover:border-slate-200 p-5 flex flex-col justify-between transition-all duration-200">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      {boat.imagemUrl ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                          <img src={boat.imagemUrl} alt={boat.nome} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${
                          boat.tipo === 'jet' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-sky-50 text-sky-600 border border-sky-100'
                        }`}>
                          <Anchor className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-slate-900 text-lg leading-tight">{boat.nome}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                            boat.tipo === 'jet' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {boat.tipo === 'jet' ? 'Jet' : 'Lancha'}
                          </span>
                          {boat.emManutencao && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-100 text-rose-800 flex items-center shadow-xs">
                              <Wrench className="w-3 h-3 mr-1" />
                              Manutenção
                            </span>
                          )}
                          {boat.temSom && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-100 text-indigo-800 flex items-center shadow-xs">
                              <Volume2 className="w-3 h-3 mr-1" />
                              Som
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-sm mt-1 inline-block">
                          Código Google Calendar: M{boat.numero.padStart(2, '0')}
                        </span>
                        {boat.googleCalendarId && (
                          <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1 truncate max-w-[210px] border border-emerald-100/50" title={boat.googleCalendarId}>
                            Google ID: {boat.googleCalendarId}
                          </div>
                        )}
                        {boat.whatsappGroupId && (
                          <div className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md mt-1 truncate max-w-[210px] border border-teal-100/50" title={boat.whatsappGroupId}>
                            WhatsApp: {boat.whatsappGroupId}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        id={`edit-boat-${boat.id}`}
                        onClick={() => handleOpenEditModal(boat)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        id={`delete-boat-${boat.id}`}
                        onClick={() => initiateDelete(boat.id, boat.nome)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Vessel Specs */}
                  <div className="mt-5 grid grid-cols-2 gap-4 text-xs bg-slate-50/50 p-3 rounded-lg border border-slate-50">
                    <div>
                      <span className="text-slate-400 block font-light">Fabricante</span>
                      <span className="font-medium text-slate-800">{boat.fabricante || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-light">Modelo</span>
                      <span className="font-medium text-slate-800">{boat.modelo || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-light">Ano de Fabricação</span>
                      <span className="font-medium text-slate-800 font-mono">{boat.ano}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-light">Numeração Original</span>
                      <span className="font-medium text-slate-800 font-mono">#{boat.numero}</span>
                    </div>
                  </div>
                </div>

                {/* Owners section */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Coproprietários ({ownerNames.length})
                    </span>
                  </div>

                  {ownerNames.length === 0 ? (
                    <p className="text-xs text-rose-500 italic">Nenhum proprietário associado! Adicione pelo menos 1.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ownerNames.map(owner => (
                        <div key={owner.id} className="flex items-center space-x-2 p-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-medium text-[10px] text-slate-600 uppercase shrink-0">
                            {owner.nome.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-800 truncate leading-none">{owner.nome}</p>
                            <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{owner.telefone}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Create/Edit Vessel */}
      {isModalOpen && (
        <div id="boat-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-medium text-slate-900">
                {editingId ? 'Editar Embarcação' : 'Cadastrar Nova Embarcação'}
              </h3>
              <button
                id="close-boat-modal"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Image Upload Area */}
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 relative group hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg, image/webp" 
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Clique para enviar uma foto"
                />
                {isUploadingImage ? (
                  <div className="flex flex-col items-center py-4">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                    <span className="text-xs font-semibold text-slate-600">Enviando foto...</span>
                  </div>
                ) : imagemUrl ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                      <img src={imagemUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                      <Edit2 className="w-3 h-3 mr-1" /> Trocar foto
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4 text-slate-500 group-hover:text-indigo-500 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-3">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold">Adicionar Foto da Embarcação</span>
                    <span className="text-[10px] mt-1 text-slate-400 font-medium">JPG, PNG ou WEBP (Max 5MB)</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Veículo *</label>
                  <select
                    id="select-boat-type"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as 'jet' | 'lancha')}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white"
                  >
                    <option value="lancha">Lancha</option>
                    <option value="jet">Jet Ski</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cód. Identificação / Numeração *</label>
                  <input
                    id="input-boat-number"
                    type="text"
                    required
                    placeholder="Ex: 03 ou 12"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                    title="Utilizado para montar o título M00 no Google Calendar"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Gera prefixo Google Calendar: M{numero || '00'}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome da Embarcação *</label>
                <input
                  id="input-boat-name"
                  type="text"
                  required
                  placeholder="Ex: Poseidon"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fabricante</label>
                  <input
                    id="input-boat-builder"
                    type="text"
                    placeholder="Ex: Yamaha"
                    value={fabricante}
                    onChange={(e) => setFabricante(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Modelo</label>
                  <input
                    id="input-boat-model"
                    type="text"
                    placeholder="Ex: Focker 255"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ano</label>
                  <input
                    id="input-boat-year"
                    type="number"
                    placeholder="Ex: 2023"
                    value={ano}
                    onChange={(e) => setAno(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Google Calendar ID Field */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ID da Agenda Google (Opcional)</label>
                <input
                  id="input-boat-calendar-id"
                  type="text"
                  placeholder="Ex: abcdefg...@group.calendar.google.com"
                  value={googleCalendarId}
                  onChange={(e) => setGoogleCalendarId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white focus:border-transparent font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Insira o ID se quiser associar este barco a uma agenda específica do Google Calendar.</p>
              </div>

              {/* WhatsApp Group ID Field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700">ID do Grupo do WhatsApp - Evolution API (Opcional)</label>
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
                    value={whatsappGroupId}
                    onChange={(e) => setWhatsappGroupId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:border-transparent font-mono"
                  >
                    <option value="">-- Selecione o Grupo do Barco --</option>
                    {availableGroups.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.subject || g.name || g.id}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="input-boat-whatsapp-id"
                    type="text"
                    placeholder="Ex: 120363123456789012@g.us"
                    value={whatsappGroupId}
                    onChange={(e) => setWhatsappGroupId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:border-transparent font-mono"
                  />
                )}
                <p className="text-[10px] text-slate-400">Insira o JID do grupo manualmente ou busque da Evolution API para receber calendários automáticos.</p>
              </div>

              {/* Maintenance Toggle */}
              <div className="border border-rose-100 bg-rose-50/50 p-3 rounded-lg flex items-start space-x-3 mt-2">
                <div className="flex items-center h-5">
                  <input
                    id="boat-maintenance-checkbox"
                    type="checkbox"
                    checked={emManutencao}
                    onChange={(e) => setEmManutencao(e.target.checked)}
                    className="w-4 h-4 text-rose-600 bg-white border-rose-300 rounded focus:ring-rose-500 focus:ring-2"
                  />
                </div>
                <div className="flex-1 text-sm">
                  <label htmlFor="boat-maintenance-checkbox" className="font-semibold text-rose-900 cursor-pointer">
                    Embarcação em Manutenção
                  </label>
                  <p className="text-xs text-rose-700/80 mt-0.5">
                    Marca a embarcação com uma tag de manutenção no sistema para fácil visualização.
                  </p>
                </div>
              </div>

              {/* Sound System Toggle */}
              <div className="border border-indigo-100 bg-indigo-50/50 p-3 rounded-lg flex items-start space-x-3 mt-2">
                <div className="flex items-center h-5">
                  <input
                    id="boat-sound-checkbox"
                    type="checkbox"
                    checked={temSom}
                    onChange={(e) => setTemSom(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-white border-indigo-300 rounded focus:ring-indigo-500 focus:ring-2"
                  />
                </div>
                <div className="flex-1 text-sm">
                  <label htmlFor="boat-sound-checkbox" className="font-semibold text-indigo-900 cursor-pointer">
                    Possui Sistema de Som Obrigatório
                  </label>
                  <p className="text-xs text-indigo-700/80 mt-0.5">
                    Habilita a checagem obrigatória do checklist de som durante a confirmação de saída.
                  </p>
                </div>
              </div>

              {/* Owner Multi-select */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Selecione os Proprietários
                  </label>
                </div>
                {clients.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 mb-2">
                    Atenção: É necessário registrar pelo menos um cliente para associá-lo como proprietário.
                  </p>
                ) : (
                  <Select
                    isMulti
                    options={clients.map(c => ({ value: c.id, label: c.nome }))}
                    value={clients.filter(c => selectedDonos.includes(c.id)).map(c => ({ value: c.id, label: c.nome }))}
                    onChange={(selected: any) => {
                      setSelectedDonos(selected ? selected.map((s: any) => s.value) : []);
                    }}
                    placeholder="Busque e selecione proprietários..."
                    className="react-select-container text-sm"
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "Nenhum cliente encontrado"}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        backgroundColor: '#f8fafc',
                        borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                        boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : 'none',
                        '&:hover': {
                          borderColor: state.isFocused ? '#6366f1' : '#cbd5e1',
                        },
                        borderRadius: '0.5rem',
                        padding: '0.125rem',
                      }),
                      menu: (base) => ({
                        ...base,
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected ? '#e0e7ff' : state.isFocused ? '#f1f5f9' : 'white',
                        color: state.isSelected ? '#3730a3' : '#334155',
                        cursor: 'pointer',
                        '&:active': {
                          backgroundColor: '#e0e7ff',
                        },
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: '#e0e7ff',
                        borderRadius: '0.375rem',
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: '#3730a3',
                        fontWeight: '500',
                      }),
                      multiValueRemove: (base) => ({
                        ...base,
                        color: '#3730a3',
                        ':hover': {
                          backgroundColor: '#c7d2fe',
                          color: '#312e81',
                        },
                      }),
                      valueContainer: (base) => ({
                        ...base,
                        maxHeight: '120px',
                        overflowY: 'auto'
                      })
                    }}
                  />
                )}
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  id="cancel-save-boat"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="submit-save-boat"
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {deleteConfirmation && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-rose-100 animate-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4 border border-rose-100">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Remover Embarcação</h3>
              <p className="mt-2 text-sm text-slate-500">
                Gostaria de excluir permanentemente a embarcação <span className="font-semibold text-slate-800">"{deleteConfirmation.name}"</span>?
              </p>
              <div className="mt-3 p-3 bg-rose-50/50 rounded-lg text-rose-700 text-xs text-left font-medium leading-relaxed">
                ⚠️ Todas as reservas associadas a esta embarcação serão permanentemente removidas, e os links de proprietários serão desfeitos!
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex gap-3">
              <button
                id="cancel-delete-boat"
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors pointer cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-boat"
                onClick={executeDelete}
                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition-colors pointer cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Mapping Modal */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-medium text-slate-900">Mapeamento de Grupos do WhatsApp</h3>
                <p className="text-xs text-slate-500">Relacione as embarcações aos grupos encontrados na Evolution API.</p>
              </div>
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isFetchingGroups ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mb-4" />
                  <p className="text-sm font-medium text-slate-700">Carregando grupos do WhatsApp...</p>
                </div>
              ) : availableGroups.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-800">Nenhum grupo encontrado</p>
                  <p className="text-xs text-slate-500 mt-1">Verifique a conexão com a Evolution API.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {boats.map(boat => (
                    <div key={boat.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="mb-2 sm:mb-0">
                        <p className="text-sm font-semibold text-slate-800">{boat.nome}</p>
                        <p className="text-xs text-slate-500">Nº {boat.numero} • {boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha'}</p>
                      </div>
                      <div className="w-full sm:w-1/2">
                        <select
                          value={mappingState[boat.id] || ''}
                          onChange={(e) => handleMappingChange(boat.id, e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                        >
                          <option value="">-- Sem Grupo Associado --</option>
                          {availableGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.subject || g.name || g.id}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-slate-100">
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors pointer cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMapping}
                disabled={isFetchingGroups}
                className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors pointer cursor-pointer disabled:opacity-50"
              >
                Salvar Mapeamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
