import React, { useState, useEffect } from 'react';
import { clientDB, boatDB } from '../db';
import { Cliente, Embarcacao } from '../types';
import { generateContract } from './ContractGenerator';
import { FileText, Download, UserCheck, Anchor, Sparkles, RefreshCw, CheckCircle2, ShieldCheck, FileCheck, ArrowRight, Loader2 } from 'lucide-react';
import { formatBoatName } from '../utils/constants';

export default function ContractGeneratorPage() {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [boats, setBoats] = useState<Embarcacao[]>([]);

  const [contractType, setContractType] = useState<'aquisicao' | 'adm'>('aquisicao');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');

  // Form Fields - Client
  const [clientNome, setClientNome] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientRg, setClientRg] = useState('');
  const [clientCnh, setClientCnh] = useState('');
  const [clientEstadoCivil, setClientEstadoCivil] = useState('Solteiro(a)');
  const [clientProfissao, setClientProfissao] = useState('');
  const [clientLogradouro, setClientLogradouro] = useState('');
  const [clientNumeroEnd, setClientNumeroEnd] = useState('');
  const [clientComplemento, setClientComplemento] = useState('');
  const [clientBairro, setClientBairro] = useState('');
  const [clientCidade, setClientCidade] = useState('Petrolina');
  const [clientEstado, setClientEstado] = useState('PE');
  const [clientCep, setClientCep] = useState('');
  const [clientTelefone, setClientTelefone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCota, setClientCota] = useState('C1');

  // Form Fields - Boat
  const [boatNome, setBoatNome] = useState('');
  const [boatModelo, setBoatModelo] = useState('');
  const [boatChassi, setBoatChassi] = useState('');
  const [boatInscricao, setBoatInscricao] = useState('');
  const [boatPropulsao, setBoatPropulsao] = useState('MOTOR CENTRO-RABETA');
  const [boatPotencia, setBoatPotencia] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadedClients = clientDB.getAll();
    const loadedBoats = boatDB.getAll();
    setClients(loadedClients);
    setBoats(loadedBoats);

    if (loadedClients.length > 0) {
      fillClientData(loadedClients[0]);
    }
    if (loadedBoats.length > 0) {
      fillBoatData(loadedBoats[0]);
    }
  }, []);

  const fillClientData = (client: Cliente) => {
    setSelectedClientId(client.id);
    setClientNome(client.nome || '');
    setClientCpf(client.cpf || '');
    setClientRg((client as any).rg || '');
    setClientCnh((client as any).cnh_cha || '');
    setClientEstadoCivil((client as any).estadoCivil || 'Solteiro(a)');
    setClientProfissao((client as any).profissao || '');
    setClientLogradouro(client.logradouro || '');
    setClientNumeroEnd(client.numeroEnd || '');
    setClientComplemento(client.complemento || '');
    setClientBairro(client.bairro || '');
    setClientCidade(client.cidade || 'Petrolina');
    setClientEstado(client.estado || 'PE');
    setClientCep(client.cep || '');
    setClientTelefone(client.telefone || '');
    setClientEmail(client.email || '');
    setClientCota(client.embarcacoes?.[0]?.cota || client.cota || 'C1');

    // Auto select linked boat if available
    const linkedBoatId = client.embarcacoes?.[0]?.embarcacaoId || client.embarcacaoId;
    if (linkedBoatId) {
      const foundBoat = boatDB.getById(linkedBoatId);
      if (foundBoat) {
        fillBoatData(foundBoat);
      }
    }
  };

  const fillBoatData = (boat: Embarcacao) => {
    setSelectedBoatId(boat.id);
    setBoatNome(formatBoatName(boat.nome) || '');
    setBoatModelo(boat.modelo || '');
    setBoatChassi((boat as any).chassi || boat.numero || '');
    setBoatInscricao((boat as any).inscricao || '');
    setBoatPropulsao((boat as any).tipo_propulsao || (boat.tipo === 'jet' ? 'TURBO JETO' : 'MOTOR CENTRO-RABETA'));
    setBoatPotencia((boat as any).potencia || '');
  };

  const handleClientSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedClientId(id);
    if (id === 'custom') {
      setClientNome('');
      setClientCpf('');
      setClientRg('');
      setClientCnh('');
      setClientProfissao('');
      setClientLogradouro('');
      setClientNumeroEnd('');
      setClientComplemento('');
      setClientBairro('');
      setClientCep('');
      setClientTelefone('');
      setClientEmail('');
      setClientCota('C1');
      return;
    }
    const client = clients.find(c => c.id === id);
    if (client) {
      fillClientData(client);
    }
  };

  const handleBoatSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedBoatId(id);
    if (id === 'custom') {
      setBoatNome('');
      setBoatModelo('');
      setBoatChassi('');
      setBoatInscricao('');
      setBoatPotencia('');
      return;
    }
    const boat = boats.find(b => b.id === id);
    if (boat) {
      fillBoatData(boat);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    setSuccessMessage(null);
    try {
      await generateContract(
        contractType,
        {
          nome: clientNome,
          cpf: clientCpf,
          rg: clientRg,
          cnh_cha: clientCnh,
          estadoCivil: clientEstadoCivil,
          profissao: clientProfissao,
          logradouro: clientLogradouro,
          numeroEnd: clientNumeroEnd,
          complemento: clientComplemento,
          bairro: clientBairro,
          cidade: clientCidade,
          estado: clientEstado,
          cep: clientCep,
          telefone: clientTelefone,
          email: clientEmail,
          cota: clientCota,
        },
        {
          nome: boatNome,
          modelo: boatModelo,
          chassi: boatChassi,
          inscricao: boatInscricao,
          tipo_propulsao: boatPropulsao,
          potencia: boatPotencia,
        }
      );
      setSuccessMessage('Contrato em PDF gerado e baixado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Erro ao gerar contrato:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/30 border border-amber-400/30 text-amber-200 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Painel Comercial & Jurídico</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Gerador de Contratos Oficiais PDF
            </h1>
            <p className="text-amber-100/80 text-xs md:text-sm leading-relaxed">
              Emissão de Contratos de Aquisição de Copropriedade de Embarcação e Contratos de Gestão e Administração Náutica.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/10 shrink-0">
            <FileCheck className="w-8 h-8 text-amber-300" />
            <div>
              <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider block">Modelos Disponíveis</span>
              <span className="text-xs font-bold text-white">Aquisição & Administração</span>
            </div>
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-40 h-40 rounded-full bg-white/5 blur-xl pointer-events-none" />
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-semibold animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-xs underline">
            Fechar
          </button>
        </div>
      )}

      {/* Contract Type Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setContractType('aquisicao')}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-4 ${
            contractType === 'aquisicao'
              ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-3 rounded-xl shrink-0 ${contractType === 'aquisicao' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block">Modelo 1</span>
            <h3 className="font-bold text-slate-900 text-sm">Contrato de Aquisição (Compra e Venda de Cota)</h3>
            <p className="text-xs text-slate-500 mt-1">Aquisição de copropriedade de 25% da embarcação / moto aquática.</p>
          </div>
        </button>

        <button
          onClick={() => setContractType('adm')}
          className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-4 ${
            contractType === 'adm'
              ? 'bg-indigo-500/10 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className={`p-3 rounded-xl shrink-0 ${contractType === 'adm' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">Modelo 2</span>
            <h3 className="font-bold text-slate-900 text-sm">Contrato de Gestão e Administração Náutica</h3>
            <p className="text-xs text-slate-500 mt-1">Regras de uso compartilhado, reservas, taxas e marina.</p>
          </div>
        </button>
      </div>

      {/* Main Grid: Form Left, Live Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Preset Selectors */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>1. Seleção Rápida de Cliente & Embarcação</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Preencher via Cliente Cadastrado</label>
                <select
                  value={selectedClientId}
                  onChange={handleClientSelectChange}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-semibold"
                >
                  <option value="custom">+ Digitação Manual (Novo Cliente)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} (CPF: {c.cpf || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Preencher via Embarcação Cadastrada</label>
                <select
                  value={selectedBoatId}
                  onChange={handleBoatSelectChange}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-semibold"
                >
                  <option value="custom">+ Digitação Manual (Nova Embarcação)</option>
                  {boats.map(b => (
                    <option key={b.id} value={b.id}>
                      {formatBoatName(b.nome)} ({b.modelo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Client Form Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>2. Dados do Cliente / Cotista (Comprador)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={clientNome}
                  onChange={e => setClientNome(e.target.value)}
                  placeholder="Ex: João Carlos da Silva"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CPF</label>
                <input
                  type="text"
                  value={clientCpf}
                  onChange={e => setClientCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">RG</label>
                <input
                  type="text"
                  value={clientRg}
                  onChange={e => setClientRg(e.target.value)}
                  placeholder="0.000.000 SDS/PE"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Habilitação Náutica (MTA/CHA)</label>
                <input
                  type="text"
                  value={clientCnh}
                  onChange={e => setClientCnh(e.target.value)}
                  placeholder="Nº da Carteira de Arrais/Motonauta"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estado Civil</label>
                <select
                  value={clientEstadoCivil}
                  onChange={e => setClientEstadoCivil(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                >
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="União Estável">União Estável</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Profissão</label>
                <input
                  type="text"
                  value={clientProfissao}
                  onChange={e => setClientProfissao(e.target.value)}
                  placeholder="Ex: Empresário"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cota Adquirida</label>
                <select
                  value={clientCota}
                  onChange={e => setClientCota(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-bold text-amber-700"
                >
                  <option value="C1">Cota C1 (25%)</option>
                  <option value="C2">Cota C2 (25%)</option>
                  <option value="C3">Cota C3 (25%)</option>
                  <option value="C4">Cota C4 (25%)</option>
                </select>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Logradouro / Endereço</label>
                  <input
                    type="text"
                    value={clientLogradouro}
                    onChange={e => setClientLogradouro(e.target.value)}
                    placeholder="Rua, Avenida..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Número</label>
                  <input
                    type="text"
                    value={clientNumeroEnd}
                    onChange={e => setClientNumeroEnd(e.target.value)}
                    placeholder="123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:col-span-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={clientBairro}
                    onChange={e => setClientBairro(e.target.value)}
                    placeholder="Centro"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={clientCidade}
                    onChange={e => setClientCidade(e.target.value)}
                    placeholder="Petrolina"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UF</label>
                  <input
                    type="text"
                    value={clientEstado}
                    onChange={e => setClientEstado(e.target.value)}
                    placeholder="PE"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CEP</label>
                  <input
                    type="text"
                    value={clientCep}
                    onChange={e => setClientCep(e.target.value)}
                    placeholder="56300-000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone (WhatsApp)</label>
                <input
                  type="text"
                  value={clientTelefone}
                  onChange={e => setClientTelefone(e.target.value)}
                  placeholder="(87) 99999-9999"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Boat Form Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Anchor className="w-4 h-4 text-amber-600" />
              <span>3. Dados da Embarcação / Moto Aquática</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome da Embarcação</label>
                <input
                  type="text"
                  value={boatNome}
                  onChange={e => setBoatNome(e.target.value)}
                  placeholder="Ex: MEXICANO 01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Modelo / Fabricante</label>
                <input
                  type="text"
                  value={boatModelo}
                  onChange={e => setBoatModelo(e.target.value)}
                  placeholder="Ex: SEA-DOO GTI 130"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nº do Chassi / HULL</label>
                <input
                  type="text"
                  value={boatChassi}
                  onChange={e => setBoatChassi(e.target.value)}
                  placeholder="Ex: YDV123456789"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nº de Inscrição Marinha</label>
                <input
                  type="text"
                  value={boatInscricao}
                  onChange={e => setBoatInscricao(e.target.value)}
                  placeholder="Ex: 401M2023001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Propulsão</label>
                <input
                  type="text"
                  value={boatPropulsao}
                  onChange={e => setBoatPropulsao(e.target.value)}
                  placeholder="MOTOR CENTRO-RABETA / TURBO JETO"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Potência do Motor</label>
                <input
                  type="text"
                  value={boatPotencia}
                  onChange={e => setBoatPotencia(e.target.value)}
                  placeholder="Ex: 130 HP / 300 HP"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Live Summary Preview & Generate Button Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-5 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-amber-600" />
                <span>Resumo do Documento</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                contractType === 'aquisicao' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {contractType === 'aquisicao' ? 'Aquisição Cota 25%' : 'Gestão & Administração'}
              </span>
            </div>

            {/* Document Preview Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs leading-relaxed">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Partes do Contrato</span>
                <p className="font-bold text-slate-900">{clientNome || '[Nome do Comprador]'}</p>
                <p className="text-slate-600 text-[11px]">CPF: {clientCpf || '[000.000.000-00]'}</p>
              </div>

              <div className="border-t border-slate-200/60 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Empresa / Administradora</span>
                <p className="font-semibold text-slate-800">
                  {contractType === 'aquisicao' ? 'MEXICANO LANCHAS LTDA (CNPJ 42.206.594/0001-31)' : 'VALE ADMINISTRADORA DE BENS NÁUTICOS LTDA'}
                </p>
              </div>

              <div className="border-t border-slate-200/60 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Embarcação Objeto</span>
                <p className="font-bold text-slate-900">{formatBoatName(boatNome) || '[Nome da Embarcação]'} - {boatModelo || '[Modelo]'}</p>
                <p className="text-slate-600 text-[11px]">Chassi: {boatChassi || 'N/A'} | Cota: <span className="font-bold text-amber-700">{clientCota}</span></p>
              </div>

              <div className="border-t border-slate-200/60 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Foro de Eleição</span>
                <p className="text-slate-700">Comarca de Petrolina - Estado de Pernambuco (PE)</p>
              </div>
            </div>

            {/* Generate PDF Trigger Button */}
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating || !clientNome}
              className="w-full py-4 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Gerando PDF em Alta Fidelidade...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Gerar e Baixar Contrato Oficial em PDF</span>
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-400 text-center leading-normal">
              O PDF gerado contém formatação oficial em formato A4, logo da Vale Náuticos, cláusulas jurídicas e campos para assinatura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
