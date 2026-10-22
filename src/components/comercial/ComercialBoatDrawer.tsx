import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FileText,
  Search,
  UserCheck,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Edit2,
  Lock
} from 'lucide-react';
import { Embarcacao, Cliente } from '../../types';
import { boatDB, getAdminToken } from '../../db';
import { DEFAULT_TOTAL_COTAS, getClientCotasForBoat } from '../../utils/cotaUtils';

interface ComercialBoatDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (savedBoat: Embarcacao) => void;
  onDelete?: (id: string, name: string) => void;
  editingBoat?: Embarcacao | null;
  clients: Cliente[];
  isReadOnly?: boolean;
  userRole?: string;
}

export default function ComercialBoatDrawer({
  open,
  onClose,
  onSave,
  onDelete,
  editingBoat = null,
  clients = [],
  isReadOnly = false,
  userRole
}: ComercialBoatDrawerProps) {
  const isEditing = !!editingBoat;

  const effectiveRole = (userRole || localStorage.getItem('admin_role') || 'comercial').toLowerCase().trim();
  const isMarinaGerente = effectiveRole === 'marina_gerente' || effectiveRole === 'marina';
  const isComercial = effectiveRole === 'comercial';

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
  const [totalCotas, setTotalCotas] = useState<number>(DEFAULT_TOTAL_COTAS);
  const [vaga, setVaga] = useState('');

  // Status & Operação
  const [statusOperacional, setStatusOperacional] = useState<'disponivel' | 'em_manutencao' | 'pendencia'>('disponivel');
  const [horasMotor, setHorasMotor] = useState<number>(0);
  const [empresas, setEmpresas] = useState<string[]>(['VALE']);
  const [imagemUrl, setImagemUrl] = useState('');

  // Upload de Imagem
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cotistas Vinculados
  const [selectedDonos, setSelectedDonos] = useState<string[]>([]);
  const [cotistaSearch, setCotistaSearch] = useState('');
  const [cotistaFilterTab, setCotistaFilterTab] = useState<'todos' | 'vinculados' | 'disponiveis'>('todos');

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
      setTotalCotas(
        editingBoat.totalCotas && Number(editingBoat.totalCotas) > 0
          ? Number(editingBoat.totalCotas)
          : DEFAULT_TOTAL_COTAS
      );
      setVaga(editingBoat.vaga || '');
      setStatusOperacional(editingBoat.statusOperacional || (editingBoat.emManutencao ? 'em_manutencao' : 'disponivel'));
      setHorasMotor(editingBoat.horasMotor || editingBoat.horimetroActual || 0);
      setEmpresas(editingBoat.empresas && editingBoat.empresas.length > 0 ? editingBoat.empresas : ['VALE']);
      setImagemUrl(editingBoat.imagemUrl || '');
      
      // A lista oficial de cotistas da embarcação é editingBoat.donos
      let initialDonos: string[] = [];
      if (Array.isArray(editingBoat.donos)) {
        initialDonos = [...editingBoat.donos];
      } else {
        // Fallback apenas para embarcações antigas sem a propriedade donos
        clients.forEach(c => {
          const isLinked =
            c.embarcacaoId === editingBoat.id ||
            (c.embarcacoes && c.embarcacoes.some(eb => eb.embarcacaoId === editingBoat.id));
          if (isLinked) {
            initialDonos.push(c.id);
          }
        });
      }
      setSelectedDonos(initialDonos);

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
      setTotalCotas(DEFAULT_TOTAL_COTAS);
      setVaga('');
      setStatusOperacional('disponivel');
      setHorasMotor(0);
      setEmpresas(isMarinaGerente ? ['MARINA'] : ['VALE']);
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
    setCotistaFilterTab('todos');
    setErrorMessage(null);
    setUploadError(null);
    setIsUploadingImage(false);
    setIsDragging(false);
    setShowUrlInput(false);
  }, [open, editingBoat, isMarinaGerente]);

  // Handler de Upload de Imagem
  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('A imagem não pode ultrapassar 8MB.');
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = getAdminToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/upload/boat-image', {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success && data.imageUrl) {
        setImagemUrl(data.imageUrl);
        setUploadError(null);
      } else {
        setUploadError(data.message || 'Erro ao realizar upload da imagem.');
      }
    } catch (err: any) {
      console.error('Falha no upload da foto da embarcação:', err);
      setUploadError('Não foi possível se comunicar com o servidor para enviar a imagem.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadImageFile(file);
    }
  };

  const toggleEmpresa = (emp: string) => {
    if (isReadOnly) return;
    if (isMarinaGerente && emp === 'VALE') {
      setErrorMessage('Gerente da Marina não pode vincular embarcações à Vale Náutica.');
      return;
    }
    if (isComercial && emp === 'MARINA') {
      setErrorMessage('Usuários do Comercial não podem vincular embarcações exclusivas da Marina.');
      return;
    }
    if (empresas.includes(emp)) {
      if (empresas.length > 1) {
        setEmpresas(empresas.filter(e => e !== emp));
      }
    } else {
      setEmpresas([...empresas, emp]);
    }
  };

  const toggleDono = (clienteId: string) => {
    if (isReadOnly) return;
    if (selectedDonos.includes(clienteId)) {
      setSelectedDonos(selectedDonos.filter(id => id !== clienteId));
    } else {
      setSelectedDonos([...selectedDonos, clienteId]);
    }
  };

  const handleRemoveAllDonos = () => {
    if (isReadOnly) return;
    setSelectedDonos([]);
  };

  // Mapa de Clientes por ID
  const clientsMap = useMemo(() => {
    const map = new Map<string, Cliente>();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  // Lista dos cotistas que já estão vinculados
  const vinculadosList = useMemo(() => {
    return selectedDonos
      .map(id => {
        const client = clientsMap.get(id);
        const cotas = editingBoat?.id
          ? getClientCotasForBoat(client, editingBoat.id, clients, editingBoat)
          : [];
        const cota = cotas.length > 0 ? cotas.join(', ') : client?.cota;
        return {
          id,
          nome: client?.nome || `Cliente ID: ${id}`,
          cpf: client?.cpf,
          telefone: client?.telefone,
          cota,
          cotasCount: Math.max(1, cotas.length),
          client
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [selectedDonos, clientsMap, editingBoat, clients]);

  // Clientes para vincular como cotista (busca e filtro sem corte artificial de 15)
  const filteredClients = useMemo(() => {
    const term = cotistaSearch.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const termDigits = term.replace(/\D/g, '');

    // Ordenar alfabeticamente
    const sorted = [...clients].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    return sorted.filter(c => {
      const isSelected = selectedDonos.includes(c.id);
      if (cotistaFilterTab === 'vinculados' && !isSelected) return false;
      if (cotistaFilterTab === 'disponiveis' && isSelected) return false;

      if (!term) return true;

      const nomeNorm = (c.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cpfDigits = (c.cpf || '').replace(/\D/g, '');
      const telDigits = (c.telefone || '').replace(/\D/g, '');

      const matchNome = nomeNorm.includes(term);
      const matchCpf = termDigits ? cpfDigits.includes(termDigits) : (c.cpf || '').toLowerCase().includes(term);
      const matchTel = termDigits ? telDigits.includes(termDigits) : (c.telefone || '').toLowerCase().includes(term);

      return matchNome || matchCpf || matchTel;
    });
  }, [clients, selectedDonos, cotistaSearch, cotistaFilterTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome da embarcação.');
      return;
    }

    // Validação e higienização de empresas conforme o perfil
    let finalEmpresas = [...empresas];
    if (isMarinaGerente) {
      finalEmpresas = finalEmpresas.filter(e => e !== 'VALE');
      if (finalEmpresas.length === 0) finalEmpresas.push('MARINA');
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
        totalCotas: Math.max(1, Number(totalCotas) || DEFAULT_TOTAL_COTAS),
        vaga: vaga.trim(),
        statusOperacional,
        emManutencao: statusOperacional === 'em_manutencao',
        horasMotor: Number(horasMotor) || 0,
        horimetroActual: Number(horasMotor) || 0,
        empresas: finalEmpresas,
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
        aria-label={isReadOnly ? 'Consultar embarcação' : isEditing ? 'Editar embarcação' : 'Nova embarcação'}
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
                {isReadOnly ? (nome || 'Consultar embarcação') : isEditing ? (nome || 'Editar embarcação') : 'Nova embarcação'}
              </h2>
              <p className="text-[11px] text-stone-400 truncate">
                {isReadOnly ? `ID: ${editingBoat?.id} • Somente Leitura` : isEditing ? `ID: ${editingBoat?.id}` : 'Cadastro de frota náutica'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isReadOnly ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Lock className="w-3 h-3" />
                Consulta
              </span>
            ) : (
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
            )}
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
          {/* Alerta de Modo Somente Consulta */}
          {isReadOnly && (
            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <p className="font-bold text-amber-950">Visualização em modo somente consulta</p>
                <p className="text-[11px] text-amber-800">
                  {isMarinaGerente
                    ? 'Esta embarcação pertence à frota da Vale Náutica. O Gerente da Marina possui permissão exclusivamente para consulta cadastral, sem autorização para editar, vincular ou excluir.'
                    : 'Você está visualizando esta embarcação em modo de leitura.'}
                </p>
              </div>
            </div>
          )}
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
                  disabled={isReadOnly}
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: EL MEXICANO 58, FOCKER 240..."
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
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
                      disabled={isReadOnly}
                      onClick={() => setTipo('lancha')}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                        isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        tipo === 'lancha'
                          ? 'bg-mx-ink text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Lancha
                    </button>
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setTipo('jet')}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                        isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${
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
                    disabled={isReadOnly}
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    placeholder="Ex: 58, 08..."
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:border-mx-ink disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
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
                    disabled={isReadOnly}
                    value={fabricante}
                    onChange={e => setFabricante(e.target.value)}
                    placeholder="Ex: Fibrafort"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={modelo}
                    onChange={e => setModelo(e.target.value)}
                    placeholder="Ex: 242 GTO"
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">Ano</label>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={ano}
                    onChange={e => setAno(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20 disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
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
                  disabled={isReadOnly}
                  value={tamanho}
                  onChange={e => setTamanho(e.target.value)}
                  placeholder="Ex: 24 pés"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Potência do Motor
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={potencia}
                  onChange={e => setPotencia(e.target.value)}
                  placeholder="Ex: 250 HP"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
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
                  disabled={isReadOnly}
                  value={capacidadePassageiros}
                  onChange={e => setCapacidadePassageiros(Number(e.target.value))}
                  placeholder="8"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20 disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Vaga na Marina
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={vaga}
                  onChange={e => setVaga(e.target.value)}
                  placeholder="Ex: Vaga A-12"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Horímetro (Horas)
                </label>
                <input
                  type="number"
                  step="0.1"
                  disabled={isReadOnly}
                  value={horasMotor}
                  onChange={e => setHorasMotor(Number(e.target.value))}
                  placeholder="0.0"
                  className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20 disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Capacidade de Cotas da Embarcação (C1..CN) */}
            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-stone-600">
                  Total de Cotas da Embarcação (C1 a C{Math.max(1, Number(totalCotas) || DEFAULT_TOTAL_COTAS)})
                </label>
                <span className="text-[10px] font-semibold text-stone-400 tabular-nums">
                  Padrão sequencial C1..C{Math.max(1, Number(totalCotas) || DEFAULT_TOTAL_COTAS)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  {[4, 6, 8, 10, 12].map(preset => {
                    const isSelected = Number(totalCotas) === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => setTotalCotas(preset)}
                        className={`flex-1 h-9 rounded-lg border text-xs font-bold tabular-nums transition-colors ${
                          isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                        } ${
                          isSelected
                            ? 'bg-mx-ink text-white border-mx-ink shadow-2xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {preset} cotas
                      </button>
                    );
                  })}
                </div>
                <input
                  type="number"
                  min={1}
                  max={32}
                  disabled={isReadOnly}
                  value={totalCotas}
                  onChange={e => setTotalCotas(Math.max(1, Math.min(32, Number(e.target.value) || 1)))}
                  title="Quantidade personalizada de cotas"
                  className="w-18 h-9 px-2.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-mx-ink/20 disabled:bg-stone-50 disabled:text-stone-700 disabled:cursor-not-allowed"
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
                      disabled={isReadOnly}
                      onClick={() => setStatusOperacional(st.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isReadOnly ? 'cursor-not-allowed opacity-85' : 'cursor-pointer'
                      } ${
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
                  const isBlockedByRole =
                    (isMarinaGerente && emp.id === 'VALE') ||
                    (isComercial && emp.id === 'MARINA');

                  return (
                    <button
                      key={emp.id}
                      type="button"
                      disabled={isReadOnly || isBlockedByRole}
                      onClick={() => toggleEmpresa(emp.id)}
                      title={
                        isReadOnly
                          ? 'Modo somente leitura'
                          : isBlockedByRole
                          ? isMarinaGerente
                            ? 'Restrito à Vale Náutica'
                            : 'Restrito à Marina'
                          : undefined
                      }
                      className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-semibold transition-colors ${
                        isReadOnly || isBlockedByRole
                          ? isChecked
                            ? 'border-stone-300 bg-stone-100 text-stone-500 cursor-not-allowed opacity-75'
                            : 'border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed opacity-50'
                          : isChecked
                          ? 'border-mx-ink bg-mx-ink-100 text-mx-ink cursor-pointer'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 cursor-pointer'
                      }`}
                    >
                      <span>{emp.name}</span>
                      {isBlockedByRole && !isReadOnly && (
                        <span className="block text-[9px] font-normal text-stone-400 mt-0.5">
                          (Restrito)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* CARD 3: COTISTAS VINCULADOS */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3.5">
            {/* Cabeçalho da Seção */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900">
                <Users className="w-4 h-4 text-stone-600" />
                <h3 className="text-[13px] font-semibold text-stone-900">Cotistas / Donos</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-mx-ink-100 text-mx-ink">
                  {vinculadosList.length} vinculado{vinculadosList.length !== 1 ? 's' : ''}
                </span>
              </div>
              {vinculadosList.length > 0 && !isReadOnly && (
                <button
                  type="button"
                  onClick={handleRemoveAllDonos}
                  className="text-[10px] text-stone-400 hover:text-red-600 hover:underline transition-colors cursor-pointer"
                  title="Desvincular todos os cotistas desta embarcação"
                >
                  Desvincular todos
                </button>
              )}
            </div>

            {/* MOSTRADOR DE COTISTAS JÁ VINCULADOS */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-stone-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Cotistas Já Vinculados ({vinculadosList.length})
                </span>
                <span className="text-[10px] text-stone-400">
                  {isReadOnly
                    ? 'Lista de consulta'
                    : vinculadosList.length === 0
                    ? 'Nenhum no momento'
                    : 'Clique no ✕ para desvincular'}
                </span>
              </div>

              {vinculadosList.length === 0 ? (
                <div className="p-3 rounded-lg border border-dashed border-stone-200 bg-stone-50/60 text-center">
                  <p className="text-[11px] text-stone-400">
                    Nenhum cotista vinculado a esta embarcação ainda.
                  </p>
                  {!isReadOnly && (
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      Selecione clientes na lista abaixo para vinculá-los como cotistas.
                    </p>
                  )}
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-stone-50/80 rounded-xl border border-stone-200/80">
                  {vinculadosList.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-stone-200/70 shadow-2xs hover:border-stone-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-mx-ink-100 text-mx-ink font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-stone-900 truncate block">
                            {item.nome}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-stone-400">
                            {item.cota && (
                              <span className="font-medium text-stone-600 bg-stone-100 px-1.5 py-0.2 rounded">
                                Cota: {item.cota}
                              </span>
                            )}
                            {item.cpf && <span>CPF: {item.cpf}</span>}
                            {item.telefone && !item.cpf && <span>Tel: {item.telefone}</span>}
                          </div>
                        </div>
                      </div>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => toggleDono(item.id)}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          title={`Desvincular ${item.nome}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SELETOR / BUSCADOR DE COTISTAS DA BASE OU AVISO READ-ONLY */}
            {isReadOnly ? (
              <div className="pt-2 border-t border-stone-100">
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 text-[11px] text-stone-500 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>Alteração e inclusão de cotistas restrita aos gestores autorizados.</span>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-stone-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-stone-700">
                    Pesquisar e Selecionar Cotistas
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {filteredClients.length} de {clients.length} cliente{clients.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Abas Rápidas */}
                <div className="flex gap-1 p-0.5 bg-stone-100/80 rounded-lg text-[10px] font-medium text-stone-600">
                  <button
                    type="button"
                    onClick={() => setCotistaFilterTab('todos')}
                    className={`flex-1 py-1 rounded-md transition-colors cursor-pointer ${
                      cotistaFilterTab === 'todos' ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'hover:text-stone-900'
                    }`}
                  >
                    Todos ({clients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCotistaFilterTab('vinculados')}
                    className={`flex-1 py-1 rounded-md transition-colors cursor-pointer ${
                      cotistaFilterTab === 'vinculados' ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'hover:text-stone-900'
                    }`}
                  >
                    Vinculados ({vinculadosList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCotistaFilterTab('disponiveis')}
                    className={`flex-1 py-1 rounded-md transition-colors cursor-pointer ${
                      cotistaFilterTab === 'disponiveis' ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'hover:text-stone-900'
                    }`}
                  >
                    Disponíveis ({Math.max(0, clients.length - vinculadosList.length)})
                  </button>
                </div>

                {/* Campo de Busca */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar cotista por nome, CPF ou telefone..."
                    value={cotistaSearch}
                    onChange={e => setCotistaSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 rounded-lg border border-stone-200 text-xs bg-stone-50/70 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white transition-all"
                  />
                  {cotistaSearch && (
                    <button
                      type="button"
                      onClick={() => setCotistaSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                      title="Limpar busca"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Lista Completa com Rolagem (SEM CORTE DE 15!) */}
                <div className="border border-stone-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-stone-100 bg-stone-50/30 p-1">
                  {filteredClients.length === 0 ? (
                    <div className="py-6 text-center text-stone-400 text-xs">
                      <p className="font-medium text-stone-500">Nenhum cotista encontrado</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        {cotistaSearch
                          ? `Nenhum resultado para "${cotistaSearch}"`
                          : 'Não há clientes para a aba selecionada.'}
                      </p>
                    </div>
                  ) : (
                    filteredClients.map(c => {
                      const isSelected = selectedDonos.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleDono(c.id)}
                          className={`w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-mx-ink-100 text-mx-ink font-semibold'
                              : 'hover:bg-white text-stone-700'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="truncate block font-medium">{c.nome}</span>
                            {(c.cpf || c.telefone) && (
                              <span className="text-[10px] text-stone-400 truncate block">
                                {c.cpf ? `CPF: ${c.cpf}` : ''}
                                {c.cpf && c.telefone ? ' • ' : ''}
                                {c.telefone ? `Tel: ${c.telefone}` : ''}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSelected && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-mx-ink bg-mx-ink-200/50 px-1 py-0.2 rounded">
                                Vinculado
                              </span>
                            )}
                            <div
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-mx-ink border-mx-ink text-white' : 'border-stone-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>

          {/* CARD 4: ACESSÓRIOS & IMAGEM */}
          <section className="p-4 rounded-xl border border-stone-200/80 bg-white space-y-3">
            <div className="flex items-center gap-2 text-stone-900 pb-1 border-b border-stone-100">
              <Camera className="w-4 h-4 text-stone-500" />
              <h3 className="text-[13px] font-semibold">Mídia & Acessórios</h3>
            </div>

            {/* Upload de Foto da Embarcação */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-stone-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                  <span>Foto da Embarcação</span>
                </label>
                {imagemUrl && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[10px] text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                  >
                    {showUrlInput ? 'Ocultar URL' : 'Ver URL direta'}
                  </button>
                )}
              </div>

              {/* Input de arquivo oculto */}
              {!isReadOnly && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              )}

              {/* Mensagem de Erro de Upload */}
              {uploadError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <span className="text-[11px] font-medium">{uploadError}</span>
                </div>
              )}

              {/* Área de Upload / Preview */}
              {isUploadingImage ? (
                <div className="p-5 rounded-xl border-2 border-dashed border-mx-ink/40 bg-mx-ink-50/50 flex flex-col items-center justify-center text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-mx-ink animate-spin" />
                  <div>
                    <span className="text-xs font-semibold text-mx-ink block">
                      Enviando e otimizando imagem…
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Convertendo para formato otimizado WebP
                    </span>
                  </div>
                </div>
              ) : imagemUrl ? (
                <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-12 rounded-lg overflow-hidden border border-stone-200 shadow-2xs shrink-0 bg-stone-100 flex items-center justify-center">
                      <img
                        src={imagemUrl}
                        alt="Foto da embarcação"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Foto vinculada com sucesso</span>
                      </div>
                      <span className="text-[10px] text-stone-400 truncate block mt-0.5" title={imagemUrl}>
                        {imagemUrl.startsWith('/uploads/') ? 'Armazenada no servidor local' : imagemUrl}
                      </span>
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="Selecionar outra imagem"
                      >
                        <Edit2 className="w-3 h-3 text-stone-500" />
                        <span>Trocar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImagemUrl('');
                          setUploadError(null);
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remover foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : isReadOnly ? (
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 text-center text-xs text-stone-400">
                  Nenhuma foto cadastrada para esta embarcação.
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`p-5 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-1.5 group ${
                    isDragging
                      ? 'border-mx-ink bg-mx-ink-50/60 scale-[0.99]'
                      : 'border-stone-200 bg-stone-50/60 hover:border-mx-ink/40 hover:bg-stone-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white border border-stone-200/90 shadow-2xs flex items-center justify-center text-stone-500 group-hover:text-mx-ink group-hover:border-mx-ink/30 transition-colors">
                    <UploadCloud className="w-5 h-5 text-stone-500 group-hover:text-mx-ink transition-colors" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-stone-800 block">
                      Clique para selecionar ou arraste a foto aqui
                    </span>
                    <span className="text-[10px] text-stone-400 block mt-0.5">
                      PNG, JPG ou WEBP (máx. 8MB) • Otimização automática
                    </span>
                  </div>
                </div>
              )}

              {/* Opção de inserir ou editar link manual */}
              {showUrlInput && !isReadOnly && (
                <div className="pt-2">
                  <span className="text-[10px] font-medium text-stone-500 block mb-1">
                    Caminho / URL da Imagem:
                  </span>
                  <input
                    type="text"
                    value={imagemUrl}
                    onChange={e => setImagemUrl(e.target.value)}
                    placeholder="https://exemplo.com/foto-lancha.jpg"
                    className="w-full h-8 px-2.5 rounded-lg border border-stone-200 text-xs bg-stone-50/50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-mx-ink/20 focus:bg-white transition-all font-mono text-[11px]"
                  />
                </div>
              )}
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
                      disabled={isReadOnly}
                      onClick={() =>
                        setAcessorios(prev => ({
                          ...prev,
                          [acc.key]: !isChecked
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                        isReadOnly
                          ? isChecked
                            ? 'bg-stone-200 border-stone-300 text-stone-700 font-semibold cursor-default'
                            : 'bg-stone-50 border-stone-200 text-stone-400 cursor-default opacity-60'
                          : isChecked
                          ? 'bg-mx-ink-100 border-mx-ink text-mx-ink font-semibold cursor-pointer'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer'
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
          {isReadOnly ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-stone-500 flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-stone-400" />
                Embarcação em modo somente consulta
              </span>
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-sm"
              >
                Fechar
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="h-8 px-3.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>

                {isEditing && onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Deseja realmente excluir a embarcação "${nome}"? Esta ação removerá a embarcação da frota e cancelará vínculos.`)) {
                        if (editingBoat) onDelete(editingBoat.id, editingBoat.nome);
                        onClose();
                      }
                    }}
                    disabled={isSaving}
                    className="h-8 px-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 px-4 rounded-lg bg-mx-ink hover:bg-mx-ink-700 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Salvar embarcação'}</span>
              </button>
            </>
          )}
        </footer>
      </aside>
    </div>
  );
}
