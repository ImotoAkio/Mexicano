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
  Clock,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Lock,
  Unlock,
  Tag,
  Share2,
  Calendar,
  Compass,
  ExternalLink,
  Upload,
  Plus,
  Trash2,
  Star,
  ChevronLeft,
  ChevronRight,
  Flame,
  Music,
  Sun,
  Droplets,
  Coffee,
  Armchair,
  Sliders,
  Sparkles
} from 'lucide-react';
import { Embarcacao, Cliente, Reserva, LeadComercial } from '../../types';
import { boatDB, getAdminToken, syncWithRemote } from '../../db';
import { DEFAULT_TOTAL_COTAS, getBoatCotasStatusList, getBoatEstoqueResumo } from '../../utils/cotaUtils';
import { isJetSkiBoat } from '../../utils/boatUtils';

interface ComercialBoatDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave?: (savedBoat: Embarcacao) => void;
  onDelete?: (id: string, name: string) => void;
  editingBoat?: Embarcacao | null;
  clients: Cliente[];
  isReadOnly?: boolean;
  userRole?: string;
  // Ações Comerciais Integradas
  onOpenProposta?: (boatId: string, cota?: string, lead?: LeadComercial | null) => void;
  onOpenVenda?: (boatId: string, cota?: string, clienteId?: string) => void;
  onOpenSeaTrial?: (boatId: string) => void;
  onOpenCotaModal?: (boatId: string, cota?: string, mode?: 'reserva' | 'repasse' | 'recompra' | 'transferencia') => void;
}

type DrawerTab = 'cotas' | 'agenda' | 'ficha' | 'kit_midia';

export default function ComercialBoatDrawer({
  open,
  onClose,
  onSave,
  editingBoat = null,
  clients = [],
  isReadOnly = false,
  userRole,
  onOpenProposta,
  onOpenVenda,
  onOpenSeaTrial,
  onOpenCotaModal
}: ComercialBoatDrawerProps) {
  const isEditing = !!editingBoat;

  const effectiveRole = (userRole || localStorage.getItem('admin_role') || 'comercial').toLowerCase().trim();
  const isMarinaGerente = effectiveRole === 'marina_gerente' || effectiveRole === 'marina';

  const [activeTab, setActiveTab] = useState<DrawerTab>('cotas');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCopyText, setCopiedCopyText] = useState(false);

  // Estados do Formulário - Identificação Técnica
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState<'lancha' | 'jet'>('lancha');
  const [fabricante, setFabricante] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState<number>(new Date().getFullYear());

  // Valores Comerciais & Cotas
  const [valorCota, setValorCota] = useState<number>(0);
  const [taxaAdmMensal, setTaxaAdmMensal] = useState<number>(0);
  const [totalCotas, setTotalCotas] = useState<number>(DEFAULT_TOTAL_COTAS);

  // Especificações
  const [tamanho, setTamanho] = useState('');
  const [potencia, setPotencia] = useState('');
  const [marcaMotor, setMarcaMotor] = useState('');
  const [tipoPropulsao, setTipoPropulsao] = useState('Centro-Rabeta');
  const [capacidadePassageiros, setCapacidadePassageiros] = useState<number>(8);
  const [vaga, setVaga] = useState('');

  // Status & Operação
  const [statusOperacional, setStatusOperacional] = useState<'disponivel' | 'em_manutencao' | 'pendencia'>('disponivel');
  const [horasMotor, setHorasMotor] = useState<number>(0);
  const [empresas, setEmpresas] = useState<string[]>(['VALE', 'MEXICANO']);
  const [imagemUrl, setImagemUrl] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [newFotoUrlInput, setNewFotoUrlInput] = useState('');
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [descricaoComercial, setDescricaoComercial] = useState('');
  const [itensConforto, setItensConforto] = useState<string[]>([]);
  const [newItemConfortoInput, setNewItemConfortoInput] = useState('');

  // Cotistas Vinculados
  const [selectedDonos, setSelectedDonos] = useState<string[]>([]);

  // Acessórios
  const [acessorios, setAcessorios] = useState({
    tenda: false,
    mesa: false,
    churrasqueira: false,
    bancosCadeiras: false,
    extintores: true,
    som: false,
    ducha: false,
    solario: false
  });

  // Reservas e Manutenções ativas carregadas do servidor
  const [activeReservas, setActiveReservas] = useState<any[]>([]);
  const [proximasSaidas, setProximasSaidas] = useState<Reserva[]>([]);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(false);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Carregar dados da embarcação
  useEffect(() => {
    if (!open) return;

    if (editingBoat) {
      setNome(editingBoat.nome || '');
      setNumero(editingBoat.numero || '');
      const isJet = editingBoat.tipo === 'jet' || isJetSkiBoat(editingBoat);
      setTipo(isJet ? 'jet' : 'lancha');
      setFabricante(editingBoat.fabricante || '');
      setModelo(editingBoat.modelo || '');
      setAno(editingBoat.ano || new Date().getFullYear());
      setTamanho(editingBoat.tamanho ? String(editingBoat.tamanho) : (editingBoat.comprimento ? String(editingBoat.comprimento) : ''));
      setPotencia(editingBoat.potencia || '');
      setMarcaMotor(editingBoat.marcaMotor || '');
      setTipoPropulsao(editingBoat.tipo_propulsao || (isJet ? 'Hidrojato' : 'Centro-Rabeta'));
      setCapacidadePassageiros(editingBoat.capacidadePassageiros || (isJet ? 3 : 8));
      setTotalCotas(editingBoat.totalCotas && Number(editingBoat.totalCotas) > 0 ? Number(editingBoat.totalCotas) : DEFAULT_TOTAL_COTAS);
      setValorCota(editingBoat.valorCota ? Number(editingBoat.valorCota) : 0);
      setTaxaAdmMensal(
        editingBoat.taxaAdmMensal && Number(editingBoat.taxaAdmMensal) > 0
          ? Number(editingBoat.taxaAdmMensal)
          : (isJet ? 350 : 2500)
      );
      setVaga(editingBoat.vaga || '');
      setStatusOperacional(editingBoat.statusOperacional || (editingBoat.emManutencao ? 'em_manutencao' : 'disponivel'));
      setHorasMotor(editingBoat.horasMotor || editingBoat.horimetroActual || 0);
      setEmpresas(editingBoat.empresas && editingBoat.empresas.length > 0 ? editingBoat.empresas : ['VALE', 'MEXICANO']);

      const loadedFotos: string[] = [];
      if (editingBoat.imagemUrl && editingBoat.imagemUrl.trim()) {
        loadedFotos.push(editingBoat.imagemUrl.trim());
      }
      if (Array.isArray(editingBoat.fotos)) {
        editingBoat.fotos.forEach(f => {
          if (f && typeof f === 'string' && f.trim() && !loadedFotos.includes(f.trim())) {
            loadedFotos.push(f.trim());
          }
        });
      }
      const rawAcess: any = editingBoat.acessorios;
      if (rawAcess && typeof rawAcess === 'object' && Array.isArray(rawAcess.fotos)) {
        rawAcess.fotos.forEach((f: any) => {
          if (f && typeof f === 'string' && f.trim() && !loadedFotos.includes(f.trim())) {
            loadedFotos.push(f.trim());
          }
        });
      }
      setFotos(loadedFotos);
      setImagemUrl(loadedFotos[0] || editingBoat.imagemUrl || '');
      setNewFotoUrlInput('');
      setDescricaoComercial(
        editingBoat.descricaoComercial ||
        (rawAcess && typeof rawAcess === 'object' ? rawAcess.descricaoComercial || '' : '')
      );

      const defaultConforto = isJet
        ? [
            'Painel Digital Multifunção',
            'Freio e Ré Inteligente (iBR)',
            'Modo Sport & ECO',
            'Escada de Reembarque',
            'Sistema de Som Bluetooth Náutico',
            'Compartimento Estanque p/ Celular'
          ]
        : [
            'Churrasqueira Gourmet',
            'Som Náutico Bluetooth',
            'Toldo Retrátil',
            'Ducha de Popa Pressurizada',
            'Solário de Proa',
            'Mesa de Centro Rebatível'
          ];
      const savedConforto =
        rawAcess && typeof rawAcess === 'object' && Array.isArray(rawAcess.itensConforto) && rawAcess.itensConforto.length > 0
          ? rawAcess.itensConforto
          : defaultConforto;
      setItensConforto(savedConforto);
      setNewItemConfortoInput('');

      setSelectedDonos(Array.isArray(editingBoat.donos) ? [...editingBoat.donos] : []);

      setAcessorios({
        tenda: !!editingBoat.acessorios?.tenda,
        mesa: !!editingBoat.acessorios?.mesa,
        churrasqueira: !!editingBoat.acessorios?.churrasqueira,
        bancosCadeiras: !!editingBoat.acessorios?.bancosCadeiras,
        extintores: editingBoat.acessorios?.extintores !== undefined ? !!editingBoat.acessorios.extintores : true,
        som: !!(editingBoat.acessorios as any)?.som,
        ducha: !!(editingBoat.acessorios as any)?.ducha,
        solario: !!(editingBoat.acessorios as any)?.solario
      });

      // Carregar reservas e bloqueios da embarcação
      loadBoatAgendaAndReservas(editingBoat.id);
    } else {
      setNome('');
      setNumero('');
      setTipo('lancha');
      setFabricante('');
      setModelo('');
      setAno(new Date().getFullYear());
      setTamanho('');
      setPotencia('');
      setMarcaMotor('');
      setTipoPropulsao('Centro-Rabeta');
      setCapacidadePassageiros(8);
      setTotalCotas(DEFAULT_TOTAL_COTAS);
      setValorCota(180000);
      setTaxaAdmMensal(2500);
      setVaga('');
      setStatusOperacional('disponivel');
      setHorasMotor(0);
      setEmpresas(isMarinaGerente ? ['MARINA'] : ['VALE', 'MEXICANO']);
      setImagemUrl('');
      setFotos([]);
      setNewFotoUrlInput('');
      setDescricaoComercial('');
      setItensConforto([
        'Churrasqueira Gourmet',
        'Som Náutico Bluetooth',
        'Toldo Retrátil',
        'Ducha de Popa Pressurizada',
        'Solário de Proa',
        'Mesa de Centro Rebatível'
      ]);
      setNewItemConfortoInput('');
      setSelectedDonos([]);
      setAcessorios({
        tenda: false,
        mesa: false,
        churrasqueira: false,
        bancosCadeiras: false,
        extintores: true,
        som: false,
        ducha: false,
        solario: false
      });
      setActiveTab('ficha');
    }

    setErrorMessage(null);
    setSuccessMessage(null);
  }, [open, editingBoat, isMarinaGerente]);

  // Carregar dados de bloqueios 48h e agenda de saídas
  const loadBoatAgendaAndReservas = async (boatId: string) => {
    setIsLoadingAgenda(true);
    try {
      const token = getAdminToken() || localStorage.getItem('admin_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [resReservas, resBloqueios] = await Promise.all([
        fetch('/api/db/pull', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/comercial/cotas-reservadas', { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (resBloqueios && Array.isArray(resBloqueios.reservas)) {
        setActiveReservas(resBloqueios.reservas.filter((r: any) => r.embarcacaoId === boatId));
      }

      if (resReservas && Array.isArray(resReservas.reservations)) {
        const todayStr = new Date().toISOString().split('T')[0];
        const boatSaidas = resReservas.reservations
          .filter((r: Reserva) => r.embarcacaoId === boatId && r.data >= todayStr && r.status !== 'cancelado')
          .sort((a: Reserva, b: Reserva) => a.data.localeCompare(b.data))
          .slice(0, 15);
        setProximasSaidas(boatSaidas);
      }
    } catch (err) {
      console.error('Erro ao carregar agenda da embarcação:', err);
    } finally {
      setIsLoadingAgenda(false);
    }
  };

  // Liberar bloqueio de 48h
  const handleLiberarCota = async (reservaId: string, cotaCode: string) => {
    if (!confirm(`Deseja realmente liberar a cota ${cotaCode} de volta para o estoque disponível da El Mexicano?`)) return;

    try {
      const token = getAdminToken() || localStorage.getItem('admin_token');
      const res = await fetch(`/api/comercial/cotas-reservadas/${reservaId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        setSuccessMessage(`Cota ${cotaCode} liberada com sucesso para venda.`);
        if (editingBoat) loadBoatAgendaAndReservas(editingBoat.id);
        await syncWithRemote().catch(() => {});
      } else {
        const data = await res.json();
        alert(data.message || 'Erro ao liberar cota.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de comunicação');
    }
  };

  // Lista de Cotas detalhadas com status unificado
  const cotasStatusList = useMemo(() => {
    if (!editingBoat) return [];
    return getBoatCotasStatusList(editingBoat.id, clients, editingBoat, activeReservas);
  }, [editingBoat, clients, activeReservas]);

  // Resumo de Estoque
  const resumoEstoque = useMemo(() => {
    if (!editingBoat) return null;
    return getBoatEstoqueResumo(editingBoat.id, clients, editingBoat, activeReservas);
  }, [editingBoat, clients, activeReservas]);

  // Status Físico na Marina (Discreto, sem pílula colorida gritante no estado normal)
  const statusMarina = useMemo(() => {
    if (!editingBoat) return { label: 'Disponível na vaga', dotClass: 'bg-emerald-500', pillClass: 'bg-stone-100 text-stone-600 border-stone-200/80' };
    const todayStr = new Date().toISOString().split('T')[0];

    if (editingBoat.emManutencao || statusOperacional === 'em_manutencao') {
      return {
        label: 'Em manutenção',
        dotClass: 'bg-amber-500',
        pillClass: 'bg-amber-50 text-amber-800 border-amber-200/70'
      };
    }

    const saidaHoje = proximasSaidas.find(s => s.data === todayStr);
    if (saidaHoje) {
      return {
        label: `Navegando hoje (${saidaHoje.periodo || 'Em uso'})`,
        dotClass: 'bg-sky-500',
        pillClass: 'bg-sky-50 text-sky-800 border-sky-200/70'
      };
    }

    return {
      label: 'Na marina',
      dotClass: 'bg-emerald-500',
      pillClass: 'bg-stone-100 text-stone-600 border-stone-200/80'
    };
  }, [editingBoat, statusOperacional, proximasSaidas]);

  // Gerenciamento de Galeria de Fotos (Múltiplas Imagens)
  const handleMultiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhotos(true);
    setErrorMessage(null);
    const uploadedUrls: string[] = [];

    try {
      const token = getAdminToken() || localStorage.getItem('admin_token');
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 8 * 1024 * 1024) {
          setErrorMessage(`A imagem "${file.name}" excede o limite de 8MB.`);
          continue;
        }
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('/api/upload/boat-image', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.success && data.imageUrl) {
          uploadedUrls.push(data.imageUrl);
        } else {
          setErrorMessage(data.message || `Erro ao enviar "${file.name}".`);
        }
      }

      if (uploadedUrls.length > 0) {
        const updatedFotos = [...fotos];
        uploadedUrls.forEach(u => {
          if (!updatedFotos.includes(u)) updatedFotos.push(u);
        });
        setFotos(updatedFotos);
        setImagemUrl(updatedFotos[0] || '');
        setSuccessMessage(
          uploadedUrls.length === 1
            ? '1 foto carregada na galeria. Clique em Salvar Galeria para publicar.'
            : `${uploadedUrls.length} fotos carregadas na galeria. Clique em Salvar Galeria para publicar.`
        );
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha na comunicação ao enviar imagens.');
    } finally {
      setIsUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleAddPhotoUrl = () => {
    const raw = newFotoUrlInput.trim();
    if (!raw) return;
    const urls = raw
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (urls.length === 0) return;

    const updatedFotos = [...fotos];
    urls.forEach(u => {
      if (!updatedFotos.includes(u)) updatedFotos.push(u);
    });
    setFotos(updatedFotos);
    setImagemUrl(updatedFotos[0] || '');
    setNewFotoUrlInput('');
  };

  const handleSetCoverPhoto = (idx: number) => {
    if (idx <= 0 || idx >= fotos.length) return;
    const chosen = fotos[idx];
    const rest = fotos.filter((_, i) => i !== idx);
    const updated = [chosen, ...rest];
    setFotos(updated);
    setImagemUrl(updated[0] || '');
  };

  const handleMovePhoto = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= fotos.length) return;
    const updated = [...fotos];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setFotos(updated);
    setImagemUrl(updated[0] || '');
  };

  const handleRemovePhoto = (idx: number) => {
    const updated = fotos.filter((_, i) => i !== idx);
    setFotos(updated);
    setImagemUrl(updated[0] || '');
  };

  const handleAddItemConforto = () => {
    const raw = newItemConfortoInput.trim();
    if (!raw) return;
    const items = raw.split(',').map(s => s.trim()).filter(Boolean);
    const next = [...itensConforto];
    items.forEach(it => {
      if (!next.includes(it)) next.push(it);
    });
    setItensConforto(next);
    setNewItemConfortoInput('');
  };

  const handleToggleAcessorio = (key: 'som' | 'tenda' | 'mesa' | 'bancosCadeiras' | 'churrasqueira' | 'ducha', label: string) => {
    const nextVal = !acessorios[key];
    setAcessorios(prev => ({ ...prev, [key]: nextVal }));
    if (nextVal) {
      if (!itensConforto.includes(label)) {
        setItensConforto(prev => [...prev, label]);
      }
    } else {
      setItensConforto(prev => prev.filter(i => i !== label));
    }
  };

  const handleRemoveItemConforto = (item: string) => {
    setItensConforto(prev => prev.filter(i => i !== item));
    if (item.includes('Churrasqueira')) setAcessorios(prev => ({ ...prev, churrasqueira: false }));
    if (item.includes('Som')) setAcessorios(prev => ({ ...prev, som: false }));
    if (item.includes('Toldo') || item.includes('Tenda')) setAcessorios(prev => ({ ...prev, tenda: false }));
    if (item.includes('Ducha')) setAcessorios(prev => ({ ...prev, ducha: false }));
    if (item.includes('Mesa')) setAcessorios(prev => ({ ...prev, mesa: false }));
    if (item.includes('Cadeira') || item.includes('Assento')) setAcessorios(prev => ({ ...prev, bancosCadeiras: false }));
  };

  // Salvar Alterações na Embarcação
  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome da embarcação.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const finalFotos = [...fotos];
      if (newFotoUrlInput.trim()) {
        newFotoUrlInput
          .trim()
          .split(/[\n,]+/)
          .map(s => s.trim())
          .filter(Boolean)
          .forEach(u => {
            if (!finalFotos.includes(u)) finalFotos.push(u);
          });
        setFotos(finalFotos);
        setNewFotoUrlInput('');
      } else if (imagemUrl.trim() && !finalFotos.includes(imagemUrl.trim())) {
        finalFotos.unshift(imagemUrl.trim());
        setFotos(finalFotos);
      }

      const primaryCoverUrl = finalFotos[0] || imagemUrl.trim() || '';
      setImagemUrl(primaryCoverUrl);

      const payload: Partial<Embarcacao> = {
        nome: nome.trim(),
        numero: numero.trim(),
        tipo,
        fabricante: fabricante.trim(),
        modelo: modelo.trim(),
        ano: Number(ano) || new Date().getFullYear(),
        tamanho: tamanho.trim(),
        comprimento: tamanho.trim(),
        potencia: potencia.trim(),
        marcaMotor: marcaMotor.trim(),
        tipo_propulsao: tipoPropulsao.trim(),
        capacidadePassageiros: Number(capacidadePassageiros) || 0,
        totalCotas: Math.max(4, Math.min(8, Number(totalCotas) || DEFAULT_TOTAL_COTAS)),
        valorCota: Number(valorCota) || 0,
        taxaAdmMensal: Number(taxaAdmMensal) || 0,
        vaga: vaga.trim(),
        statusOperacional,
        emManutencao: statusOperacional === 'em_manutencao',
        horasMotor: Number(horasMotor) || 0,
        horimetroActual: Number(horasMotor) || 0,
        empresas,
        imagemUrl: primaryCoverUrl,
        fotos: finalFotos,
        descricaoComercial: descricaoComercial.trim(),
        donos: selectedDonos,
        acessorios: {
          ...acessorios,
          itensConforto,
          configurado: true,
          ...(finalFotos.length > 0 ? { fotos: finalFotos } : {}),
          ...(descricaoComercial.trim() ? { descricaoComercial: descricaoComercial.trim() } : {})
        } as any
      };

      let savedBoat: Embarcacao;
      if (isEditing && editingBoat) {
        savedBoat = boatDB.update(editingBoat.id, payload);
      } else {
        savedBoat = boatDB.create(payload as any);
      }

      await syncWithRemote().catch(() => {});
      if (onSave) onSave(savedBoat);
      setSuccessMessage('Dados e galeria de mídias da embarcação salvos com sucesso.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      setErrorMessage(err.message || 'Falha ao salvar dados da embarcação.');
    } finally {
      setIsSaving(false);
    }
  };

  // Copiar link rastreável
  const handleCopyCatalogoLink = () => {
    if (!editingBoat) return;
    const vendedor = localStorage.getItem('admin_nome') || 'comercial';
    const link = `${window.location.origin}/catalogo?barco=${editingBoat.id}&vendedor=${encodeURIComponent(vendedor)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copiar copy formatado para WhatsApp
  const handleCopyWhatsAppText = () => {
    if (!editingBoat) return;
    const vendedor = localStorage.getItem('admin_nome') || 'Comercial Mexicano';
    const link = `${window.location.origin}/catalogo?barco=${editingBoat.id}&vendedor=${encodeURIComponent(vendedor)}`;

    const text = `🌊 *OPORTUNIDADE NÁUTICA EXCLUSIVA - EL MEXICANO* 🚤\n\n` +
      `*Embarcação:* ${editingBoat.nome} (${editingBoat.modelo || editingBoat.fabricante || 'Lancha'})\n` +
      `*Ano:* ${editingBoat.ano} | *Motorização:* ${editingBoat.potencia || 'Embarcada'}\n` +
      `*Capacidade:* ${editingBoat.capacidadePassageiros || 8} pessoas a bordo\n` +
      `*Localização:* Marina Club Velho Chico (Vaga ${editingBoat.vaga || 'Privativa'})\n\n` +
      `💰 *Valor da Fração (Cota):* R$ ${Number(editingBoat.valorCota || valorCota || 180000).toLocaleString('pt-BR')}\n` +
      `🏢 *Taxa Condominial Mensal (Vale Administradora):* R$ ${Number(taxaAdmMensal || (tipo === 'jet' ? 350 : 2500)).toLocaleString('pt-BR')}/mês\n\n` +
      `✨ *Diferenciais:* Gestão náutica 100% descomplicada, vaga e conservação inclusas na Marina Club Velho Chico, manutenção preventiva rigorosa e agendamento digital no aplicativo.\n\n` +
      `📲 *Acesse o Catálogo Digital & Fotos:* ${link}\n\n` +
      `_Podemos agendar uma visita presencial ou Test Drive neste final de semana?_`;

    navigator.clipboard.writeText(text);
    setCopiedCopyText(true);
    setTimeout(() => setCopiedCopyText(false), 2000);
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-stone-900/35 backdrop-blur-xs transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        className={`absolute top-2 right-2 bottom-2 w-[calc(100%-1rem)] sm:w-[620px] lg:w-[660px] bg-white rounded-2xl shadow-xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border border-stone-200/80 overflow-hidden ${
          open ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        {/* Header Sóbrio no Padrão Vila Náutica */}
        <header className="px-6 py-4 border-b border-stone-200/70 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200/70 text-stone-700 flex items-center justify-center shrink-0">
              <Ship className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 tracking-tight truncate">
                  {nome || 'Nova Embarcação'}
                </h2>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusMarina.pillClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMarina.dotClass}`} />
                  {statusMarina.label}
                </span>
              </div>
              <p className="text-xs text-stone-400 truncate mt-0.5 tabular-nums">
                {modelo ? `${modelo} • ` : ''}{fabricante ? `${fabricante} • ` : ''}Ano {ano} {vaga ? `• Vaga ${vaga}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isEditing && (
              <button
                type="button"
                onClick={handleCopyCatalogoLink}
                className="h-8 px-2.5 rounded-lg bg-white border border-stone-200/80 text-stone-600 hover:text-stone-900 hover:bg-stone-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar link do Catálogo Comercial com seu ID de vendedor"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5 text-stone-400" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Link'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Abas do Drawer (Monocromáticas, Linha Única, Sem Ícones Coloridos) */}
        <div className="px-6 border-b border-stone-200/70 bg-white flex items-center gap-1 overflow-x-auto text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('cotas')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'cotas'
                ? 'border-[#2D0A16] text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <Users className="w-3.5 h-3.5 opacity-70" />
            <span>Cotas (C1–C{totalCotas})</span>
            {resumoEstoque && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 text-[10px] font-medium tabular-nums">
                {resumoEstoque.cotasDisponiveis} {resumoEstoque.cotasDisponiveis === 1 ? 'livre' : 'livres'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'agenda'
                ? 'border-[#2D0A16] text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 opacity-70" />
            <span>Agenda & Visitas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ficha')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'ficha'
                ? 'border-[#2D0A16] text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <FileText className="w-3.5 h-3.5 opacity-70" />
            <span>Ficha Técnica</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kit_midia')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'kit_midia'
                ? 'border-[#2D0A16] text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 opacity-70" />
            <span>Kit Mídia</span>
          </button>
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {errorMessage && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-stone-900 text-xs text-white flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAF9F6]">
          {/* ============================================================= */}
          {/* ABA 1: ESPELHO DE COTAS & QUADRO SOCIETÁRIO (QUIETER) */}
          {/* ============================================================= */}
          {activeTab === 'cotas' && (
            <div className="space-y-4">
              {/* Faixa de Resumo Compacta e Tabular */}
              {resumoEstoque && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-stone-200/70 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500">Total:</span>
                    <span className="font-semibold text-stone-900 tabular-nums">{resumoEstoque.totalCotas} frações</span>
                  </div>
                  <span className="text-stone-200 hidden sm:inline">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500">Estoque Mexicano:</span>
                    <span className="font-semibold text-stone-900 tabular-nums">{resumoEstoque.cotasDisponiveisMexicano} livres</span>
                  </div>
                  <span className="text-stone-200 hidden sm:inline">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500">Em repasse:</span>
                    <span className="font-semibold text-stone-900 tabular-nums">{resumoEstoque.cotasRepasse}</span>
                  </div>
                  <span className="text-stone-200 hidden sm:inline">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500">Bloqueios 48h:</span>
                    <span className="font-semibold text-stone-900 tabular-nums">{resumoEstoque.cotasReservadas}</span>
                  </div>
                </div>
              )}

              {/* Lista Unificada das Cotas (C1 até C8) sem Poluição Visual */}
              <div className="bg-white rounded-xl border border-stone-200/80 divide-y divide-stone-100 overflow-hidden">
                {cotasStatusList.map(cotaInfo => {
                  const isMexicano = cotaInfo.status === 'disponivel_mexicano';
                  const isRepasse = cotaInfo.status === 'em_repasse';
                  const isReservada = cotaInfo.status === 'reservada';
                  const isVendida = cotaInfo.status === 'vendida';

                  return (
                    <div
                      key={cotaInfo.cota}
                      className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isMexicano
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : isReservada
                          ? 'bg-amber-50/20'
                          : 'hover:bg-stone-50/60'
                      }`}
                    >
                      {/* Lado Esquerdo: Identificação & Titular */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-xs shrink-0 tabular-nums border ${
                            isMexicano
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                              : isRepasse
                              ? 'bg-sky-50 text-sky-800 border-sky-200/80'
                              : isReservada
                              ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                              : 'bg-stone-100/80 text-stone-600 border-stone-200/60'
                          }`}
                        >
                          {cotaInfo.cota}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-stone-900 truncate">
                              {isMexicano
                                ? 'Disponível — Estoque El Mexicano'
                                : isReservada
                                ? `Reservada: ${cotaInfo.reservaInfo?.leadNome || 'Lead Comercial'}`
                                : cotaInfo.clienteNome}
                            </p>

                            {isMexicano && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                                Venda direta
                              </span>
                            )}
                            {isRepasse && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-sky-50 text-sky-800 border border-sky-200/60">
                                Em repasse
                              </span>
                            )}
                            {isReservada && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                                <Clock className="w-2.5 h-2.5" />
                                Bloqueio 48h
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 tabular-nums">
                            {isMexicano && (
                              <span>
                                Valor da fração: <strong className="font-semibold text-stone-700">R$ {Number(valorCota || 180000).toLocaleString('pt-BR')}</strong>
                              </span>
                            )}
                            {isRepasse && (
                              <span>
                                Valor de repasse: <strong className="font-semibold text-stone-700">R$ {Number(cotaInfo.valorRepasse || valorCota || 180000).toLocaleString('pt-BR')}</strong>
                              </span>
                            )}
                            {isReservada && cotaInfo.reservaInfo && (
                              <span>
                                Vendedor: <strong className="font-medium text-stone-700">{cotaInfo.reservaInfo.vendedorNome || 'Comercial'}</strong>
                                {' • '}Expira em {new Date(cotaInfo.reservaInfo.expiraEm).toLocaleString('pt-BR')}
                              </span>
                            )}
                            {isVendida && (
                              <span>
                                Titular ativo
                                {cotaInfo.cliente?.telefone || cotaInfo.cliente?.email
                                  ? ` • ${cotaInfo.cliente.telefone || cotaInfo.cliente.email}`
                                  : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Ações por Cota (Sóbrias e Hierárquicas) */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {/* Ações para Cotas Disponíveis ou Repasse */}
                        {(isMexicano || isRepasse) && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenCotaModal && editingBoat) {
                                  onOpenCotaModal(editingBoat.id, cotaInfo.cota, 'reserva');
                                }
                              }}
                              className="h-8 px-2.5 rounded-lg bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 border border-stone-200/80 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Bloquear fração por 48h para um Lead"
                            >
                              <Lock className="w-3 h-3 text-stone-400" />
                              <span>Reservar 48h</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenProposta && editingBoat) {
                                  onOpenProposta(editingBoat.id, cotaInfo.cota, null);
                                }
                              }}
                              className="h-8 px-2.5 rounded-lg bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 border border-stone-200/80 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Gerar Proposta Comercial para esta cota"
                            >
                              <FileText className="w-3 h-3 text-stone-400" />
                              <span>Proposta</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenVenda && editingBoat) {
                                  onOpenVenda(editingBoat.id, cotaInfo.cota, isRepasse ? cotaInfo.clienteId : undefined);
                                }
                              }}
                              className="h-8 px-3 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Lançar Venda Direta desta cota"
                            >
                              <span>Vender</span>
                            </button>
                          </>
                        )}

                        {/* Ações para Cotas Reservadas 48h */}
                        {isReservada && cotaInfo.reservaInfo && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleLiberarCota(cotaInfo.reservaInfo!.id, cotaInfo.cota)}
                              className="h-8 px-2.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200/80 text-stone-600 hover:text-stone-900 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Liberar cota de volta ao estoque"
                            >
                              <Unlock className="w-3 h-3 text-stone-400" />
                              <span>Liberar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenProposta && editingBoat) {
                                  const leadMock: any = {
                                    id: cotaInfo.reservaInfo!.leadId,
                                    nome: cotaInfo.reservaInfo!.leadNome
                                  };
                                  onOpenProposta(editingBoat.id, cotaInfo.cota, leadMock);
                                }
                              }}
                              className="h-8 px-3 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>Gerar Proposta</span>
                            </button>
                          </>
                        )}

                        {/* Ações para Cotas Vendidas (Sem botões azuis repetitivos) */}
                        {isVendida && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenCotaModal && editingBoat) {
                                  onOpenCotaModal(editingBoat.id, cotaInfo.cota, 'repasse');
                                }
                              }}
                              className="h-8 px-2.5 rounded-lg bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 border border-stone-200/80 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Colocar cota deste cotista em repasse comercial"
                            >
                              <Tag className="w-3 h-3 text-stone-400" />
                              <span>Repasse</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenCotaModal && editingBoat) {
                                  onOpenCotaModal(editingBoat.id, cotaInfo.cota, 'recompra');
                                }
                              }}
                              className="h-8 px-2.5 rounded-lg bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 border border-stone-200/80 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Recomprar cota de volta para a El Mexicano"
                            >
                              <RefreshCw className="w-3 h-3 text-stone-400" />
                              <span>Recomprar</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* ABA 2: AGENDA & DISPONIBILIDADE NA MARINA */}
          {/* ============================================================= */}
          {activeTab === 'agenda' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-stone-500" />
                    Direito de Uso Comercial & Test Drive
                  </h3>
                  <button
                    type="button"
                    onClick={() => onOpenSeaTrial && editingBoat && onOpenSeaTrial(editingBoat.id)}
                    className="h-8 px-3 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Anchor className="w-3.5 h-3.5 opacity-80" />
                    <span>Agendar Visita / Test Drive</span>
                  </button>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Como a <strong className="font-semibold text-stone-700">El Mexicano</strong> é titular das cotas em estoque, a equipe comercial possui direito de uso para realizar apresentações a bordo e <em>Test Drive</em> com clientes, desde que não haja reserva de cotista no mesmo horário.
                </p>
              </div>

              {/* Status Atual na Marina */}
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400 block">Status operacional hoje</span>
                  <span className="text-sm font-semibold text-stone-900">{statusMarina.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-400 block">Vaga oficial na marina</span>
                  <span className="text-sm font-semibold text-stone-900 tabular-nums">{vaga || 'Não informada'}</span>
                </div>
              </div>

              {/* Próximas Saídas Agendadas */}
              <div className="space-y-2.5">
                <h4 className="text-sm font-semibold text-stone-900">
                  Próximas saídas e reservas de cotistas
                </h4>

                {isLoadingAgenda ? (
                  <div className="p-8 text-center text-xs text-stone-400">Carregando calendário da marina...</div>
                ) : proximasSaidas.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-500 bg-white rounded-xl border border-stone-200/80">
                    Nenhuma saída agendada para os próximos dias. Embarcação disponível na marina para visitas.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-stone-200/80 divide-y divide-stone-100 overflow-hidden">
                    {proximasSaidas.map(reserva => (
                      <div
                        key={reserva.id}
                        className="p-3.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900 tabular-nums">
                              {new Date(reserva.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                              <span className="ml-2 font-normal text-stone-500">({reserva.periodo || 'Dia inteiro'})</span>
                            </p>
                            <p className="text-[11px] text-stone-400">
                              {(reserva as any).observacoes || (reserva as any).destino || 'Saída de lazer cotista'}
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-600">
                          {reserva.status || 'Confirmada'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* ABA 3: FICHA TÉCNICA, CUSTOS VALE & EDIÇÃO */}
          {/* ============================================================= */}
          {activeTab === 'ficha' && (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Resumo de Custos Vale Administradora */}
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-stone-900">
                  <Building2 className="w-4 h-4 text-stone-500" />
                  <h3 className="text-sm font-semibold">Custos e regras da Vale Administradora</h3>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed tabular-nums">
                  Rateio mensal fixo estimado para o cotista: <strong className="font-semibold text-stone-800">R$ {Number(taxaAdmMensal || (tipo === 'jet' ? 350 : 2500)).toLocaleString('pt-BR')}/mês</strong>. {tipo === 'jet' ? 'Inclui vaga seca coberta na Marina Club Velho Chico, lavagem pós-uso, seguro náutico e revisões preventivas do jet ski.' : 'Inclui apoio de cais e píer na Marina Club Velho Chico, vaga seca/molhada, lavagem pós-uso, seguro náutico e vistorias preventivas da embarcação.'}
                </p>
              </div>

              {/* Campos do Formulário Técnico */}
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 space-y-3.5">
                <h4 className="text-sm font-semibold text-stone-900 pb-2 border-b border-stone-100">
                  Dados principais da embarcação
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Tipo de ativo *</label>
                    <select
                      disabled={isReadOnly}
                      value={tipo}
                      onChange={e => {
                        const newTipo = e.target.value as 'lancha' | 'jet';
                        setTipo(newTipo);
                        if (newTipo === 'jet') {
                          setTaxaAdmMensal(350);
                          setTipoPropulsao('Hidrojato');
                          setCapacidadePassageiros(3);
                        } else {
                          if (taxaAdmMensal === 350 || taxaAdmMensal === 0) {
                            setTaxaAdmMensal(2500);
                          }
                          setTipoPropulsao('Centro-Rabeta');
                          setCapacidadePassageiros(8);
                        }
                      }}
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs font-medium text-stone-800 focus:outline-none focus:border-stone-400 cursor-pointer"
                    >
                      <option value="lancha">Lancha (Embarcação)</option>
                      <option value="jet">Jet Ski (Moto Aquática - R$ 350/mês)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Nome do barco *</label>
                    <input
                      type="text"
                      required
                      disabled={isReadOnly}
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      placeholder="Ex: EL MEXICANO 45"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Modelo / Estaleiro</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={modelo}
                      onChange={e => setModelo(e.target.value)}
                      placeholder="Ex: Focker 272 GTO"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Ano de fabricação</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={ano}
                      onChange={e => setAno(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 tabular-nums focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Comprimento / Porte (Pés)</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={tamanho}
                      onChange={e => setTamanho(e.target.value)}
                      placeholder="Ex: 29 pés ou 3 Lugares"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Marca do motor</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={marcaMotor}
                      onChange={e => setMarcaMotor(e.target.value)}
                      placeholder="Ex: Rotax, Mercruiser, Volvo Penta, Mercury"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Potência exata do motor</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={potencia}
                      onChange={e => setPotencia(e.target.value)}
                      placeholder="Ex: 130 HP, 300 HP V8, 250 HP"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Tipo de propulsão / instalação</label>
                    <select
                      disabled={isReadOnly}
                      value={tipoPropulsao}
                      onChange={e => setTipoPropulsao(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400 cursor-pointer"
                    >
                      <option value="Centro-Rabeta">Centro-Rabeta (Inboard / Stern Drive)</option>
                      <option value="Motor de Popa">Motor de Popa (Outboard)</option>
                      <option value="Hidrojato">Hidrojato (Jet Propulsion)</option>
                      <option value="Linha de Eixo">Linha de Eixo (Shaft Drive)</option>
                      <option value="Pod Drive">IPS / Pod Drive</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Horímetro atual (horas de uso)</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={horasMotor}
                      onChange={e => setHorasMotor(Number(e.target.value))}
                      placeholder="Ex: 45"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 tabular-nums focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Capacidade homologada (passageiros)</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={capacidadePassageiros}
                      onChange={e => setCapacidadePassageiros(Number(e.target.value))}
                      placeholder="Ex: 8"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 tabular-nums focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Vaga na marina</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={vaga}
                      onChange={e => setVaga(e.target.value)}
                      placeholder="Ex: Pier A - Vaga 12"
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Total de cotas (4 a 8)</label>
                    <select
                      disabled={isReadOnly}
                      value={totalCotas}
                      onChange={e => setTotalCotas(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-stone-200 text-xs font-semibold text-stone-900 focus:outline-none focus:border-stone-400"
                    >
                      <option value={4}>4 Cotas (C1 a C4)</option>
                      <option value={6}>6 Cotas (C1 a C6)</option>
                      <option value={8}>8 Cotas (C1 a C8 - Padrão Náutico)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Valores Comerciais */}
              <div className="p-4 rounded-xl bg-white border border-stone-200/80 space-y-3.5">
                <h4 className="text-sm font-semibold text-stone-900 pb-2 border-b border-stone-100">
                  Preços e condomínio comercial
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Valor da cota padrão (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">R$</span>
                      <input
                        type="number"
                        step="1000"
                        disabled={isReadOnly}
                        value={valorCota}
                        onChange={e => setValorCota(Number(e.target.value))}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-stone-200 text-xs font-semibold text-stone-900 tabular-nums focus:outline-none focus:border-stone-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-600 block">Taxa adm mensal Vale (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">R$</span>
                      <input
                        type="number"
                        step="50"
                        disabled={isReadOnly}
                        value={taxaAdmMensal}
                        onChange={e => setTaxaAdmMensal(Number(e.target.value))}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-stone-200 text-xs font-semibold text-stone-900 tabular-nums focus:outline-none focus:border-stone-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Alterações */}
              {!isReadOnly && (
                <div className="pt-1 flex items-center justify-end gap-2.5">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="h-9 px-4 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 opacity-80" />
                    <span>{isSaving ? 'Salvando dados...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ============================================================= */}
          {/* ABA 4: GALERIA MULTI-FOTOS, PÁGINA DE VENDA & KIT MÍDIA */}
          {/* ============================================================= */}
          {activeTab === 'kit_midia' && (
            <div className="space-y-4">
              {/* 1. Galeria de Imagens Comercial (Múltiplas Fotos) */}
              <div className="p-4 bg-white rounded-xl border border-stone-200/80 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-stone-500" />
                      Galeria de Fotos da Embarcação
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Adicione várias fotos para compor a página de venda completa no catálogo. A 1ª foto é a capa principal.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold tabular-nums">
                    {fotos.length} {fotos.length === 1 ? 'imagem' : 'imagens'}
                  </span>
                </div>

                {/* Preview da Foto de Capa + Grade de Fotos */}
                {fotos.length > 0 ? (
                  <div className="space-y-3">
                    {/* Foto Principal (Capa) em destaque */}
                    <div className="relative w-full h-52 rounded-xl bg-stone-100 border border-stone-200/80 overflow-hidden group">
                      <img
                        src={fotos[0]}
                        alt={`${nome} - Capa`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-900/85 backdrop-blur-xs text-white text-[11px] font-semibold">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>Foto de Capa Principal (1/{fotos.length})</span>
                      </div>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(0)}
                          className="absolute top-3 right-3 h-7 px-2.5 rounded-md bg-white/90 hover:bg-red-600 text-stone-700 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          title="Remover foto de capa"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>

                    {/* Grade com todas as fotos da galeria */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {fotos.map((url, idx) => {
                        const isCover = idx === 0;
                        return (
                          <div
                            key={`${url}-${idx}`}
                            className={`relative rounded-xl overflow-hidden border bg-stone-50 group transition-all ${
                              isCover
                                ? 'border-[#2D0A16] ring-1 ring-[#2D0A16]'
                                : 'border-stone-200/80 hover:border-stone-400'
                            }`}
                          >
                            <div className="aspect-[16/10] w-full overflow-hidden bg-stone-100">
                              <img
                                src={url}
                                alt={`${nome} foto ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Barra de controle por miniatura */}
                            <div className="p-2 bg-white border-t border-stone-100 flex items-center justify-between gap-1 text-[11px]">
                              {isCover ? (
                                <span className="font-semibold text-[#2D0A16] flex items-center gap-1 truncate">
                                  <Star className="w-3 h-3 fill-[#2D0A16] shrink-0" />
                                  Capa (#1)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isReadOnly}
                                  onClick={() => handleSetCoverPhoto(idx)}
                                  className="text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1 truncate cursor-pointer"
                                  title="Definir esta imagem como foto de capa principal"
                                >
                                  <Star className="w-3 h-3 text-stone-400 shrink-0" />
                                  <span>Usar como capa</span>
                                </button>
                              )}

                              {!isReadOnly && (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMovePhoto(idx, -1)}
                                    className="p-1 rounded hover:bg-stone-100 text-stone-500 disabled:opacity-30 cursor-pointer"
                                    title="Mover para esquerda"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === fotos.length - 1}
                                    onClick={() => handleMovePhoto(idx, 1)}
                                    className="p-1 rounded hover:bg-stone-100 text-stone-500 disabled:opacity-30 cursor-pointer"
                                    title="Mover para direita"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(idx)}
                                    className="p-1 rounded hover:bg-red-50 text-stone-400 hover:text-red-600 cursor-pointer"
                                    title="Excluir imagem"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-40 rounded-xl bg-stone-50 border border-dashed border-stone-300 flex flex-col items-center justify-center text-center p-4">
                    <ImageIcon className="w-7 h-7 text-stone-400 mb-1.5 opacity-60" />
                    <p className="text-xs font-medium text-stone-600">Nenhuma foto cadastrada nesta embarcação</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Envie fotos do seu computador/celular ou adicione links de imagens abaixo.
                    </p>
                  </div>
                )}

                {/* Controles de Adição: Upload Múltiplo + URL */}
                {!isReadOnly && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <label className="h-9 px-3.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 border border-stone-200/80 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0">
                        <Upload className="w-3.5 h-3.5 text-stone-600" />
                        <span>{isUploadingPhotos ? 'Enviando fotos...' : 'Enviar Fotos do Dispositivo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={isUploadingPhotos}
                          onChange={handleMultiImageUpload}
                          className="hidden"
                        />
                      </label>

                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          placeholder="Ou cole a URL da imagem (ex: https://...)"
                          value={newFotoUrlInput}
                          onChange={e => setNewFotoUrlInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddPhotoUrl();
                            }
                          }}
                          className="flex-1 h-9 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
                        />
                        <button
                          type="button"
                          onClick={handleAddPhotoUrl}
                          className="h-9 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200/80 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Conteúdo da Página de Venda (Descrição Comercial & Equipamentos) */}
              <div className="p-4 bg-white rounded-xl border border-stone-200/80 space-y-4">
                <div className="pb-2 border-b border-stone-100">
                  <h4 className="text-sm font-semibold text-stone-900">
                    Conteúdo da Página de Venda no Catálogo
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Personalize o texto de apresentação e os itens de série exibidos na ficha completa da embarcação.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-700 block">
                    Apresentação / Descrição comercial do ativo
                  </label>
                  <textarea
                    rows={3}
                    disabled={isReadOnly}
                    value={descricaoComercial}
                    onChange={e => setDescricaoComercial(e.target.value)}
                    placeholder="Descreva os diferenciais desta embarcação, estado de conservação, acabamento de bordo, navegação e experiência para o cotista..."
                    className="w-full p-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400 leading-relaxed"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-800 block">
                      Memorial descritivo de equipamentos & conforto a bordo ({itensConforto.length})
                    </label>
                    <span className="font-mono text-[10px] text-stone-400">
                      Configure os acessórios desta embarcação
                    </span>
                  </div>

                  {/* Toggles Rápidos dos 6 Acessórios Principais */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'churrasqueira', label: 'Churrasqueira Gourmet', icon: Flame },
                      { key: 'som', label: 'Som Náutico Bluetooth', icon: Music },
                      { key: 'tenda', label: 'Toldo Retrátil', icon: Sun },
                      { key: 'ducha', label: 'Ducha de Popa Pressurizada', icon: Droplets },
                      { key: 'mesa', label: 'Mesa de Centro Rebatível', icon: Coffee },
                      { key: 'bancosCadeiras', label: 'Cadeiras / Assentos Confort', icon: Armchair },
                    ].map(acc => {
                      const isActive =
                        acc.key === 'churrasqueira'
                          ? (acessorios.churrasqueira || itensConforto.some(i => i.toLowerCase().includes('churrasqueira')))
                          : acc.key === 'som'
                          ? (acessorios.som || itensConforto.some(i => i.toLowerCase().includes('som')))
                          : acc.key === 'tenda'
                          ? (acessorios.tenda || itensConforto.some(i => i.toLowerCase().includes('toldo') || i.toLowerCase().includes('tenda')))
                          : acc.key === 'ducha'
                          ? (acessorios.ducha || itensConforto.some(i => i.toLowerCase().includes('ducha')))
                          : acc.key === 'mesa'
                          ? (acessorios.mesa || itensConforto.some(i => i.toLowerCase().includes('mesa')))
                          : (acessorios.bancosCadeiras || itensConforto.some(i => i.toLowerCase().includes('cadeira') || i.toLowerCase().includes('assento')));

                      const Icon = acc.icon;

                      return (
                        <button
                          key={acc.key}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => handleToggleAcessorio(acc.key as any, acc.label)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                            isActive
                              ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                              : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                              isActive ? 'bg-white text-stone-900 border-white' : 'border-stone-300 bg-white'
                            }`}
                          >
                            {isActive && <Check className="w-3 h-3" strokeWidth={3} />}
                          </span>
                          <span className="text-[11px] font-medium truncate">{acc.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Chips de Itens Ativos */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {itensConforto.map(item => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200/80 text-xs font-medium text-stone-800"
                      >
                        <span>{item}</span>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemConforto(item)}
                            className="text-stone-400 hover:text-red-600 cursor-pointer"
                            title="Remover item"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {!isReadOnly && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newItemConfortoInput}
                          onChange={e => setNewItemConfortoInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddItemConforto();
                            }
                          }}
                          placeholder="Adicionar diferencial (ex: Solário de Proa, Teka EVA, GPS Garmin, Guincho Elétrico...)"
                          className="flex-1 h-8.5 px-3 rounded-lg border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400"
                        />
                        <button
                          type="button"
                          onClick={handleAddItemConforto}
                          className="h-8.5 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Incluir</span>
                        </button>
                      </div>

                      {/* Sugestões de Diferenciais */}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {[
                          'Solário de Proa',
                          'Teka EVA Premium',
                          'GPS / Sonar Garmin',
                          'Guincho Elétrico',
                          'Cristaleira Iluminada',
                          'Farol de Busca 360°',
                          'Inversor 110V/220V',
                          'Salvatagem Marinha',
                          'Cooler Embutido',
                          'Carreta Rodoviária'
                        ].map(diff => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => {
                              if (!itensConforto.includes(diff)) {
                                setItensConforto(prev => [...prev, diff]);
                              }
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                              itensConforto.includes(diff)
                                ? 'bg-stone-200 text-stone-500 border-stone-300 opacity-50 cursor-default'
                                : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            + {diff}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {!isReadOnly && (
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-end">
                    <button
                      type="button"
                      disabled={isSaving || isUploadingPhotos}
                      onClick={handleSave}
                      className="h-9 px-4 rounded-lg bg-[#2D0A16] hover:bg-[#3B0D1E] text-white text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5 opacity-80" />
                      <span>{isSaving ? 'Salvando...' : 'Salvar Galeria & Página de Venda'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Botões do Kit Mídia Express */}
              <div className="p-4 bg-white rounded-xl border border-stone-200/80 space-y-3">
                <h4 className="text-sm font-semibold text-stone-900">
                  Divulgação comercial e WhatsApp
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppText}
                    className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/70 hover:bg-stone-100/80 text-left transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-stone-500" />
                        Texto de venda p/ WhatsApp
                      </span>
                      {copiedCopyText && (
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                          Copiado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Gera resumo formatado com valor da cota, condomínio e link para enviar ao cliente.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCatalogoLink}
                    className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/70 hover:bg-stone-100/80 text-left transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                        Link rastreável do catálogo
                      </span>
                      {copiedLink && (
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                          Copiado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Link direto da embarcação com parâmetro do vendedor para atribuição comercial.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
