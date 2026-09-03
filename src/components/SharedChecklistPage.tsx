import React, { useState, useEffect } from 'react';
import { Anchor, ArrowDownCircle, CheckCircle2, ArrowUpCircle, Image as ImageIcon, Download, Loader2, Compass, Shield, Flame, Activity, FileText, Pocket, LifeBuoy } from 'lucide-react';
import Logo from './Logo';

const renderSafetyItem = (reserva: any, key: string, label: string, IconClass: any) => {
  const status = reserva.checklistEquipamentos?.[key];
  const isOk = status !== false; // Considera undefined como OK por padrão no legado
  return (
    <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
      isOk ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
    }`}>
      <span className="flex items-center gap-2 truncate"><IconClass className="w-4 h-4 text-[#B69D74] shrink-0" /> <span className="truncate">{label}</span></span>
      <span className="shrink-0 ml-1">{isOk ? '✓ OK' : '⚠️ Avaria'}</span>
    </div>
  );
};

export default function SharedChecklistPage({ checklistId }: { checklistId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalPhotos, setModalPhotos] = useState<{title: string, urls: string[]} | null>(null);

  useEffect(() => {
    fetch(`/api/public/checklist/${checklistId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.checklist) {
          setData(data.checklist);
        } else {
          setError(data.message || 'Checklist não encontrado');
        }
      })
      .catch(err => {
        setError('Falha na conexão ao carregar checklist.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [checklistId]);

  const formatAngleLabel = (key: string) => {
    const labels: Record<string, string> = {
      'frente': 'Frente',
      'traseira': 'Traseira',
      'lat_esquerda': 'Lat. Esquerda',
      'lat_direita': 'Lat. Direita',
      'painel': 'Painel',
      'casco_inferior': 'Casco Inferior',
      'casco_traseiro': 'Casco Traseiro',
      'porta_objetos': 'Porta Objetos',
      'frente_proa': 'Frente - Proa',
      'frente_conves': 'Frente - Convés',
      'traseira_popa': 'Traseira - Popa',
      'traseira_plataforma': 'Traseira - Plataforma',
      'lat_esq_proa': 'Lat. Esq - Proa',
      'lat_esq_popa': 'Lat. Esq - Popa',
      'lat_dir_proa': 'Lat. Dir - Proa',
      'lat_dir_popa': 'Lat. Dir - Popa',
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const parseFotos = (fotosStr: any, extras: any = []): { label: string, url: string }[] => {
    let arr: { label: string, url: string }[] = [];
    if (!fotosStr) {
       arr = [];
    } else if (Array.isArray(fotosStr)) {
       arr = fotosStr.map((url, i) => ({ label: `Foto ${i + 1}`, url }));
    } else if (typeof fotosStr === 'object') {
       arr = Object.entries(fotosStr)
         .filter(([_, v]) => typeof v === 'string')
         .map(([k, v]) => ({ label: formatAngleLabel(k), url: v as string }));
    } else if (typeof fotosStr === 'string') {
      try {
        const parsed = JSON.parse(fotosStr);
        arr = Array.isArray(parsed)
          ? parsed.map((url, i) => ({ label: `Foto ${i + 1}`, url }))
          : [];
      } catch (e) {
        arr = fotosStr.split(',').filter((f: string) => f.trim().length > 0).map((url: string, i: number) => ({ label: `Foto ${i + 1}`, url }));
      }
    }

    if (Array.isArray(extras)) {
      extras.forEach((url, i) => {
        if (typeof url === 'string') {
          arr.push({ label: `Extra ${i + 1}`, url });
        }
      });
    }
    return arr;
  };

  const handleDownloadAll = (fotos: { label: string, url: string }[], title: string) => {
    // Para simplificar, abre cada URL. Em uma app real, poderia gerar um ZIP no backend.
    fotos.forEach((f, i) => {
      const a = document.createElement('a');
      a.href = f.url;
      a.download = `${title.toLowerCase()}_foto_${i+1}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#050505] flex items-center justify-center font-sans relative overflow-hidden text-white">
        <div className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen">
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_50%)]"></div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <div className="relative w-28 h-28 flex items-center justify-center animate-pulse">
            <div className="w-full h-full opacity-90 p-4">
              <Logo className="w-full h-full text-[#B69D74]" />
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center">
            <h1 className="text-xl font-medium tracking-[0.2em] text-white/90">CARREGANDO...</h1>
            <div className="h-[1px] bg-[#B69D74]/30 mt-4 w-12 [animation:luxury-line-expand_2.5s_ease-in-out_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#050505] flex flex-col items-center justify-center font-sans text-white p-6">
        <Compass className="w-16 h-16 text-[#B69D74] mb-4 opacity-50" />
        <h1 className="text-2xl font-light text-white mb-2">Ops, algo deu errado.</h1>
        <p className="text-white/60 text-center max-w-md">{error || 'Não foi possível carregar os dados deste checklist.'}</p>
      </div>
    );
  }

  const dateObj = data.dataAgendamento ? new Date(data.dataAgendamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
  const fotosDescida = parseFotos(data.fotosChecklistDescida || data.fotosChecklistSaida);
  const fotosChegada = parseFotos(data.fotosChecklistChegada);
  const fotosSubida = parseFotos(data.fotosChecklistSubida);

  const renderSection = (title: string, hora: string | null, fotos: { label: string, url: string }[], Icon: React.ElementType, colorClass: string) => {
    if (!hora && fotos.length === 0) return null;

    return (
      <div className="bg-[#111111] rounded-2xl border border-white/5 p-6 mb-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${colorClass}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white/90">{title}</h3>
              <p className="text-sm text-white/50">{hora ? `Registrado às ${hora}` : 'Pendente'}</p>
            </div>
          </div>
          {fotos.length > 0 && (
            <button
              onClick={() => handleDownloadAll(fotos, title)}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#222] border border-white/10 rounded-lg text-sm text-[#B69D74] transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Baixar Imagens</span>
            </button>
          )}
        </div>

        {fotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fotos.map((foto, i) => (
              <div
                key={i}
                onClick={() => setModalPhotos({ title, urls: fotos.map(f => f.url) })}
                className="relative group rounded-xl overflow-hidden aspect-square bg-[#0A0A0A] cursor-pointer ring-1 ring-white/5 hover:ring-[#B69D74]/50 transition-all"
              >
                <img src={foto.url} alt={`${title} ${i+1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-center text-xs text-white backdrop-blur-sm truncate">
                  {foto.label}
                </div>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <ImageIcon className="w-6 h-6 text-white drop-shadow-md" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/40 text-sm italic py-4">Nenhuma imagem registrada para esta etapa.</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#050505] font-sans text-white selection:bg-[#B69D74]/30">
      {/* Header */}
      <header className="bg-[#0A0A0A] border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo className="w-10 h-10 text-[#B69D74]" />
            <div className="hidden sm:block w-[1px] h-8 bg-white/10"></div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-medium tracking-[0.1em] text-white/90">VILA NÁUTICA</h1>
              <p className="text-[10px] text-[#B69D74] tracking-widest uppercase">Portal do Cliente</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-white/90 font-medium">{data.embarcacaoNome || 'Embarcação'}</h2>
            <p className="text-white/50 text-sm">{dateObj}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
        <div className="mb-8">
          <h1 className="text-2xl font-light text-white/90 mb-2">Relatório de Checklist</h1>
          <p className="text-white/50">Imagens e horários registrados durante a operação da sua embarcação.</p>
        </div>

        {renderSection('Descida', data.horaDescida, fotosDescida, ArrowDownCircle, 'text-blue-400')}
        {renderSection('Chegada', data.horaChegada, fotosChegada, CheckCircle2, 'text-amber-400')}
        {renderSection('Subida', data.horaSubida, fotosSubida, ArrowUpCircle, 'text-emerald-400')}

        {/* Equipamentos & Segurança da Lancha (Apenas para Lanchas) */}
        {(() => {
          const isJet = data?.embarcacaoTipo === 'jet' || (data?.embarcacaoNome || '').toLowerCase().includes('jet');

          if (isJet) {
            return data.checklistObservacoes ? (
              <div className="bg-[#111111] rounded-2xl border border-white/5 p-6 mb-6">
                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/10 text-xs text-white/80">
                  <span className="font-bold text-[#B69D74] block uppercase tracking-wider text-[10px] mb-1">Observações do Marinheiro:</span>
                  <p>{data.checklistObservacoes}</p>
                </div>
              </div>
            ) : null;
          }

          return (
            <div className="bg-[#111111] rounded-2xl border border-white/5 p-6 mb-6">
              <h3 className="text-lg font-medium text-white/90 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#B69D74]" />
                <span>Segurança & Equipamentos da Lancha</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
                {renderSafetyItem(data, 'coletes', 'Coletes', Shield)}
                {renderSafetyItem(data, 'extintor', 'Extintor', Flame)}
                {renderSafetyItem(data, 'cortaCorrente', 'Corta-Corrente', Activity)}
                {renderSafetyItem(data, 'ancora', 'Âncora', Anchor)}
                {renderSafetyItem(data, 'documento', 'Documentação', FileText)}
                {renderSafetyItem(data, 'boiaCircular', 'Bóia Circular', LifeBuoy)}
                {renderSafetyItem(data, 'primeirosSocorros', 'P. Socorros', Pocket)}
              </div>
              {data.checklistObservacoes && (
                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/10 text-xs text-white/80 mt-4">
                  <span className="font-bold text-[#B69D74] block uppercase tracking-wider text-[10px] mb-1">Observações do Marinheiro:</span>
                  <p>{data.checklistObservacoes}</p>
                </div>
              )}
            </div>
          );
        })()}

        {!data.horaDescida && !data.horaChegada && !data.horaSubida && (
          <div className="py-20 text-center">
            <Compass className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40">Nenhum checklist foi registrado ainda para este agendamento.</p>
          </div>
        )}
      </main>

      {/* Photo Gallery Modal */}
      {modalPhotos && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505]/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 flex justify-between items-center bg-transparent relative z-10">
            <h3 className="font-light tracking-widest text-[#B69D74] text-lg uppercase">{modalPhotos.title}</h3>
            <button 
              onClick={(e) => { e.stopPropagation(); setModalPhotos(null); }} 
              className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-full transition-all cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 relative z-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {modalPhotos.urls.map((url, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden bg-[#111] aspect-[4/3] ring-1 ring-white/10 shadow-2xl">
                  <img src={url} alt={`Foto ${i+1}`} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <a href={url} download target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#B69D74] text-sm font-medium flex items-center gap-2 hover:text-white transition-colors">
                      <Download className="w-4 h-4" /> Baixar Original
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
