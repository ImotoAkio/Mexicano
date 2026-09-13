import React, { useState, useRef } from 'react';
import { 
  Printer, 
  Download, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  RefreshCw,
  Compass
} from 'lucide-react';
import { generateAvisoSaidaPDF } from '../utils/pdfGenerator';
// @ts-ignore
import logoSrc from '../assets/images/vale_nauticos_logo_1780256879963.png';

export default function AvisosSaidaPage() {
  // Form fields
  const [data, setData] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [nomeEmbarcacao, setNomeEmbarcacao] = useState('');
  const [pessoasABordo, setPessoasABordo] = useState('');
  const [destino, setDestino] = useState('');
  const [previsaoSaida, setPrevisaoSaida] = useState('');
  const [previsaoChegada, setPrevisaoChegada] = useState('');
  const [observacao, setObservacao] = useState('');

  
  const userRole = (localStorage.getItem('admin_role') || '').toLowerCase().trim();
  const isGerente = userRole === 'marina_gerente' || userRole === 'gerente';

  // Logo and Header options
  const [logoOption, setLogoOption] = useState<'default' | 'empty' | 'custom'>(() => {
    return (isGerente && localStorage.getItem('avisos_saida_logoOption')) 
      ? (localStorage.getItem('avisos_saida_logoOption') as 'default' | 'empty' | 'custom') 
      : 'default';
  });
  const [customLogoBase64, setCustomLogoBase64] = useState<string>(() => {
    return (isGerente && localStorage.getItem('avisos_saida_customLogo')) || '';
  });
  const [customLogoName, setCustomLogoName] = useState<string>(() => {
    return (isGerente && localStorage.getItem('avisos_saida_customLogoName')) || '';
  });
  const [bannerText, setBannerText] = useState(() => {
    if (isGerente) {
      const saved = localStorage.getItem('avisos_saida_bannerText');
      return saved !== null ? saved : 'Marina Club Velho Chico';
    }
    return 'VILA NÁUTICA';
  });

  // Save preferences for Gerente Marina
  React.useEffect(() => {
    if (isGerente) {
      localStorage.setItem('avisos_saida_logoOption', logoOption);
      localStorage.setItem('avisos_saida_customLogo', customLogoBase64);
      localStorage.setItem('avisos_saida_customLogoName', customLogoName);
      localStorage.setItem('avisos_saida_bannerText', bannerText);
    }
  }, [isGerente, logoOption, customLogoBase64, customLogoName, bannerText]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle custom logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomLogoName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomLogoBase64(event.target.result as string);
          setLogoOption('custom');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogoUpload = () => {
    setCustomLogoBase64('');
    setCustomLogoName('');
    setLogoOption('default');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Set mock data
  const handleLoadMockData = () => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('pt-BR');
    
    setData(formattedDate);
    setNome('MARCOS SILVA');
    setTipo('LANCHA');
    setNomeEmbarcacao('FALCON 320');
    setPessoasABordo('06');
    setDestino('ILHA DO RODEADOURO');
    setPrevisaoSaida('10:00');
    setPrevisaoChegada('18:00');
    setObservacao('NENHUMA');
  };

  // Clear all fields (for blank print)
  const handleClearAll = () => {
    setData('');
    setNome('');
    setTipo('');
    setNomeEmbarcacao('');
    setPessoasABordo('');
    setDestino('');
    setPrevisaoSaida('');
    setPrevisaoChegada('');
    setObservacao('');
  };

  // Generate PDF
  const handleGeneratePDF = async (action: 'print' | 'download') => {
    // Determine which logo URL to send to pdfGenerator
    let logoUrl: string | undefined = undefined;
    if (logoOption === 'empty') {
      logoUrl = 'empty';
    } else if (logoOption === 'custom') {
      logoUrl = customLogoBase64;
    }

    const pdfData = {
      data: data || ' ',
      nome: nome || ' ',
      tipo: tipo || ' ',
      nomeEmbarcacao: nomeEmbarcacao || ' ',
      pessoasABordo: pessoasABordo || ' ',
      destino: destino || ' ',
      previsaoSaida: previsaoSaida || ' ',
      previsaoChegada: previsaoChegada || ' ',
      observacao: observacao || ' '
    };

    try {
      await generateAvisoSaidaPDF(pdfData, {
        autoPrint: action === 'print',
        download: action === 'download',
        logoUrl,
        bannerText: bannerText || (isGerente ? 'MARINA CLUB VELHO CHICO' : 'VILA NÁUTICA')
      });
    } catch (err) {
      console.error('Erro ao gerar o PDF:', err);
      alert('Ocorreu um erro ao gerar o PDF. Verifique se o logotipo carregado é válido.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#B69D74]" />
            Gerador de Avisos de Saída
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Gere ou imprima formulários de Plano de Navegação (ANEXO 4-A / NORMAM-211) em branco ou pré-preenchidos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleLoadMockData}
            className="flex items-center px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Dados de Teste
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Campos (Em Branco)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Configuration Panel */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Logo & Banner Settings */}
          <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm tracking-wider uppercase border-b border-slate-50 pb-3">
              1. Identidade do Documento
            </h3>
            
            {/* Header Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Texto do Cabeçalho
              </label>
              <input
                type="text"
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                placeholder={isGerente ? 'Ex: MARINA CLUB VELHO CHICO' : 'Ex: VILA NÁUTICA'}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74]"
              />
            </div>

            {/* Logo Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Logotipo
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLogoOption('default')}
                  className={`px-3 py-2 text-xs font-medium border rounded-lg transition-colors ${
                    logoOption === 'default'
                      ? 'border-[#B69D74] bg-[#B69D74]/5 text-[#8c7450]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Padrão (Marina)
                </button>
                <button
                  type="button"
                  onClick={() => setLogoOption('empty')}
                  className={`px-3 py-2 text-xs font-medium border rounded-lg transition-colors ${
                    logoOption === 'empty'
                      ? 'border-[#B69D74] bg-[#B69D74]/5 text-[#8c7450]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Sem Logo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (customLogoBase64) {
                      setLogoOption('custom');
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`px-3 py-2 text-xs font-medium border rounded-lg transition-colors ${
                    logoOption === 'custom'
                      ? 'border-[#B69D74] bg-[#B69D74]/5 text-[#8c7450]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Upload Custom
                </button>
              </div>

              {/* Upload Input */}
              <div className="mt-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                
                {customLogoBase64 ? (
                  <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="truncate text-slate-600 max-w-[180px]">
                      {customLogoName || 'logotipo_carregado.png'}
                    </span>
                    <button
                      type="button"
                      onClick={clearLogoUpload}
                      className="text-red-500 hover:text-red-700 font-semibold"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  logoOption === 'custom' && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors text-xs"
                    >
                      <Upload className="w-5 h-5 mb-1 text-slate-400" />
                      Clique para fazer upload do logo
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Settings */}
          <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm tracking-wider uppercase border-b border-slate-50 pb-3">
              2. Informações do Plano
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Nome do Comandante/Cotas
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do condutor"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Tipo da Embarcação
                </label>
                <input
                  type="text"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Ex: Lancha / Jet Ski"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Nome / Modelo
                </label>
                <input
                  type="text"
                  value={nomeEmbarcacao}
                  onChange={(e) => setNomeEmbarcacao(e.target.value)}
                  placeholder="Ex: M44 / F30"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Data
                </label>
                <input
                  type="text"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Pessoas a Bordo
                </label>
                <input
                  type="text"
                  value={pessoasABordo}
                  onChange={(e) => setPessoasABordo(e.target.value)}
                  placeholder="Ex: 06"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74]"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Destino da Embarcação
                </label>
                <input
                  type="text"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  placeholder="Destino planejado"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Previsão de Saída
                </label>
                <input
                  type="text"
                  value={previsaoSaida}
                  onChange={(e) => setPrevisaoSaida(e.target.value)}
                  placeholder="HH:MM"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Previsão de Chegada
                </label>
                <input
                  type="text"
                  value={previsaoChegada}
                  onChange={(e) => setPrevisaoChegada(e.target.value)}
                  placeholder="HH:MM"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74]"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Observações
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Instruções adicionais..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#B69D74] focus:border-[#B69D74] resize-none"
                />
              </div>
            </div>

            {/* Print & Download Actions */}
            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                type="button"
                onClick={() => handleGeneratePDF('print')}
                className="flex items-center justify-center px-4 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors text-sm shadow-sm"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir / PDF
              </button>
              <button
                type="button"
                onClick={() => handleGeneratePDF('download')}
                className="flex items-center justify-center px-4 py-2.5 bg-[#B69D74] text-white font-medium rounded-lg hover:bg-[#a58c63] transition-colors text-sm shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Arquivo
              </button>
            </div>

          </div>

        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-7 bg-slate-100 rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-start overflow-y-auto max-h-[850px] shadow-inner">
          <div className="mb-4 text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            Visualização Prévia do Layout Impresso (A4)
          </div>
          
          {/* Simulated A4 Page */}
          <div className="w-[595px] min-h-[842px] bg-white shadow-xl border border-slate-300 p-8 flex flex-col justify-between font-serif text-black leading-relaxed relative text-left">
            
            {/* Top Section */}
            <div>
              {/* Header Grid */}
              <div className="flex justify-between items-start mb-6">
                {/* Logo Area */}
                <div className="w-[120px] h-[75px] border border-dashed border-slate-200 rounded flex items-center justify-center relative bg-slate-50">
                  {logoOption === 'empty' ? (
                    <span className="text-[10px] text-slate-400 font-sans italic">Sem Logotipo</span>
                  ) : logoOption === 'custom' && customLogoBase64 ? (
                    <img 
                      src={customLogoBase64} 
                      alt="Logo customizado" 
                      className="max-w-full max-h-full object-contain p-1"
                    />
                  ) : (
                    <img 
                      src={logoSrc} 
                      alt="Logo padrão" 
                      className="max-w-full max-h-full object-contain p-1"
                    />
                  )}
                  <div className="absolute -top-2 -left-2 bg-slate-200 text-slate-600 rounded-full p-1 text-[8px] font-sans font-bold flex items-center justify-center w-4 h-4">
                    LOGO
                  </div>
                </div>

                {/* Normam Header */}
                <div className="text-right font-sans">
                  <div className="text-[9px] font-bold">NORMAM-211/DPC</div>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center font-sans mb-6">
                <div className="text-[10px] font-bold mb-1">ANEXO 4-A</div>
                <div className="text-sm font-bold tracking-widest border-b border-black pb-1 inline-block">AVISO DE SAÍDA</div>
              </div>

              {/* Grid Table */}
              <div className="border border-black text-xs font-sans">
                
                {/* Row 1 */}
                <div className="grid grid-cols-12 border-b border-black">
                  <div className="col-span-6 p-2 border-r border-black flex gap-1 items-baseline">
                    <span className="font-bold text-[10px]">DATA:</span>
                    <span className="text-[10px]">{data}</span>
                  </div>
                  <div className="col-span-6 p-2 font-bold text-[10px] text-left truncate bg-slate-50/50">
                    {bannerText ? bannerText.toUpperCase() : (isGerente ? 'MARINA CLUB VELHO CHICO' : 'VILA NÁUTICA')}
                  </div>
                </div>

                {/* Row 2 */}
                <div className="p-2 border-b border-black flex gap-1 items-baseline">
                  <span className="font-bold text-[10px]">NOME:</span>
                  <span className="text-[10px] uppercase">{nome}</span>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-12 border-b border-black">
                  <div className="col-span-6 p-2 border-r border-black flex gap-1 items-baseline">
                    <span className="font-bold text-[10px]">TIPO:</span>
                    <span className="text-[10px] uppercase">{tipo}</span>
                  </div>
                  <div className="col-span-6 p-2 flex gap-1 items-baseline">
                    <span className="font-bold text-[10px]">NOME DA EMBARCAÇÃO:</span>
                    <span className="text-[10px] uppercase">{nomeEmbarcacao}</span>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="p-2 border-b border-black flex gap-1 items-baseline">
                  <span className="font-bold text-[10px]">NÚMERO DE PESSOAS A BORDO:</span>
                  <span className="text-[10px]">{pessoasABordo}</span>
                </div>

                {/* Row 5 */}
                <div className="p-2 border-b border-black flex gap-1 items-baseline">
                  <span className="font-bold text-[10px]">DESTINO DA EMBARCAÇÃO:</span>
                  <span className="text-[10px] uppercase">{destino}</span>
                </div>

                {/* Row 6 */}
                <div className="grid grid-cols-12 border-b border-black">
                  <div className="col-span-6 p-2 border-r border-black flex gap-1 items-baseline">
                    <span className="font-bold text-[10px]">PREVISÃO DE SAÍDA:</span>
                    <span className="text-[10px]">{previsaoSaida}</span>
                  </div>
                  <div className="col-span-6 p-2 flex gap-1 items-baseline">
                    <span className="font-bold text-[10px]">PREVISÃO DE CHEGADA:</span>
                    <span className="text-[10px]">{previsaoChegada}</span>
                  </div>
                </div>

                {/* Row 7 */}
                <div className="p-2 min-h-[38px] flex gap-1 items-baseline">
                  <span className="font-bold text-[10px]">OBSERVAÇÃO:</span>
                  <span className="text-[10px] uppercase">
                    {observacao && observacao.trim() !== 'Nenhuma' ? observacao : ''}
                  </span>
                </div>

              </div>

              {/* Responsibility Statement */}
              <div className="mt-6 text-[9px] leading-relaxed text-justify font-sans text-slate-800">
                É responsabilidade do comandante da embarcação ter a bordo o material de navegação e de salvatagem compatível com a singradura que irá realizar e o número de pessoas a bordo.
              </div>
            </div>

            {/* Bottom Section */}
            <div className="space-y-8 font-sans">
              
              {/* Signature Line */}
              <div className="text-center">
                <div className="text-[10px] text-slate-700">Comandante da Embarcação</div>
                <div className="mt-8 text-slate-400">_________________________________________________________________</div>
              </div>

              {/* Notes Footer */}
              <div className="text-[8px] text-slate-600 leading-normal space-y-1 pt-4 border-t border-slate-100">
                <div className="font-bold text-[9px] text-slate-800">Observações:</div>
                <div>
                  O aviso de saída deve ser entregue ao clube ou marina, antes da saída da embarcação ou transmitido via rádio, sendo responsabilidade do clube ou marina o registro e arquivamento das informações. Poderá ainda, ser entregue a uma pessoa de confiança.
                </div>
                <div>
                  Em substituição a este anexo, o comandante da embarcação de esporte e recreio poderá realizar o registro no aplicativo "NAVSEG" (disponível nas lojas de aplicativos), para dispositivos móveis, desenvolvido pela Marinha do Brasil, bem como compartilhar o seu plano de viagem por meio digital.
                </div>
              </div>

            </div>

          </div>

          <div className="mt-2 text-[10px] text-slate-400 font-medium">
            Nota: O PDF gerado seguirá as dimensões e proporções oficiais A4 da Marinha do Brasil.
          </div>
        </div>

      </div>
    </div>
  );
}
