import React, { useState, useEffect } from 'react';
import { 
  Droplets, Loader2, Save, AlertTriangle, 
  CheckCircle2, Truck, ArrowUpRight, ArrowDownRight,
  X, Search, Download, RefreshCw, Package, ShieldCheck,
  ChevronRight, FileText, Printer, BarChart2
} from 'lucide-react';
import {
  FuelInventory,
  FuelHistoryEntry,
  getFuelInventory,
  saveFuelInventory,
  getFuelHistory,
  addFuelHistoryEntry,
  getEstoqueTotalLitros
} from '../utils/fuelInventory';

interface MarinaTanksViewProps {
  operadorNome?: string;
  showToast?: (message: string, type: 'info' | 'success' | 'warning') => void;
}

export default function MarinaTanksView({ operadorNome, showToast }: MarinaTanksViewProps) {
  const [inventory, setInventory] = useState<FuelInventory>(getFuelInventory);
  const [history, setHistory] = useState<FuelHistoryEntry[]>(getFuelHistory);
  
  const refreshData = () => {
    setInventory(getFuelInventory());
    setHistory(getFuelHistory());
  };

  useEffect(() => {
    fetch('/api/fuel/inventory')
      .then(res => res.json())
      .then(data => {
        if (data) {
          saveFuelInventory(data);
          setInventory(data);
        }
      })
      .catch(() => {});

    fetch('/api/fuel/history')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setHistory(data);
        }
      })
      .catch(() => {});

    refreshData();
  }, []);

  // Modals state
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [closureModalOpen, setClosureModalOpen] = useState(false);

  // Form states - Compra
  const [purchaseDestino, setPurchaseDestino] = useState<'tanque_principal' | 'galoes_pier'>('tanque_principal');
  const [purchaseLitros, setPurchaseLitros] = useState('');
  const [purchaseGaloes, setPurchaseGaloes] = useState('');
  const [purchaseNotaFiscal, setPurchaseNotaFiscal] = useState('');
  const [purchaseFornecedor, setPurchaseFornecedor] = useState('');
  const [purchaseValorTotal, setPurchaseValorTotal] = useState('');

  // Form states - Transferência (Encher Galões)
  const [transferMode, setTransferMode] = useState<'galoes' | 'litros'>('galoes');
  const [transferGaloes, setTransferGaloes] = useState('2');
  const [transferLitros, setTransferLitros] = useState('40');
  const [transferObservacao, setTransferObservacao] = useState('');

  // Form states - Fechamento
  const [closureGaloesFisicosCheios, setClosureGaloesFisicosCheios] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Gerador de Relatório Ultra Eco-Ink (Fundo Branco Limpo / Economia de Tinta / Alta Nitidez)
  const handlePrintReport = () => {
    const totalEstoque = getEstoqueTotalLitros(inventory);
    const pctTanque = Math.min(100, Math.round((inventory.tanquePrincipalLitros / inventory.tanqueCapacidadeMaxima) * 100));
    const isTanqueLow = inventory.tanquePrincipalLitros <= inventory.alertaMinimoTanque;
    const litrosGaloesPier = inventory.galoesPierQuantidade * 20 + inventory.galaoParcialLitros;
    const pctTanqueShare = totalEstoque > 0 ? Math.round((inventory.tanquePrincipalLitros / totalEstoque) * 100) : 0;
    const pctPierShare = totalEstoque > 0 ? 100 - pctTanqueShare : 0;
    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    const horaEmissao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const respNome = operadorNome || 'Gerente da Marina';

    const historyRowsHTML = history.slice(0, 25).map((h, i) => {
      const isCompra = h.tipo.startsWith('compra');
      const isTransfer = h.tipo === 'transferencia_tanque_pier';
      const isAbast = h.tipo === 'abastecimento_embarcacao';
      const isFech = h.tipo === 'fechamento_turno';

      let tipoLabel = 'Movimentação';
      if (h.tipo === 'compra_tanque') tipoLabel = 'Compra: Tanque Principal';
      else if (h.tipo === 'compra_galoes') tipoLabel = 'Compra: Galões 20L';
      else if (isTransfer) tipoLabel = 'Enchimento de Galões';
      else if (isAbast) tipoLabel = h.barcoNome ? `Abastecimento (${h.barcoNome})` : 'Abastecimento Embarcação';
      else if (isFech) tipoLabel = 'Fechamento de Turno';

      let volumeFormatted = `${h.litros} L`;
      let volumeColor = '#0f172a';
      if (isCompra || isTransfer) {
        volumeFormatted = `+${h.litros} L`;
        volumeColor = '#047857';
      } else if (isAbast) {
        volumeFormatted = `-${h.litros} L`;
        volumeColor = '#b91c1c';
      }

      let statusBadge = '<span style="background-color: #ffffff; color: #047857; border: 1.5px solid #047857; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;">OK</span>';
      if (h.diferencaLitros && h.diferencaLitros !== 0) {
        const difText = h.diferencaLitros > 0 ? `+${h.diferencaLitros}` : `${h.diferencaLitros}`;
        statusBadge = `<span style="background-color: #ffffff; color: #b45309; border: 1.5px solid #b45309; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;">Divergência (${difText}L)</span>`;
      }

      return `
        <tr style="background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px 12px; font-family: monospace; color: #475569;">${h.dataHora}</td>
          <td style="padding: 8px 12px; font-weight: 700; color: #0f172a;">${tipoLabel}</td>
          <td style="padding: 8px 12px; color: #334155;">${h.operador}</td>
          <td style="padding: 8px 12px; font-weight: 700; font-family: monospace; color: ${volumeColor};">${volumeFormatted}</td>
          <td style="padding: 8px 12px; color: #64748b; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${h.detalhes || h.fornecedor || '-'}</td>
          <td style="padding: 8px 12px; text-align: right;">${statusBadge}</td>
        </tr>
      `;
    }).join('');

    const printHTML = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Combustíveis - Vila Náutica</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #ffffff !important;
            color: #0f172a !important;
            padding: 15px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header-banner {
            background-color: #ffffff;
            color: #0f172a;
            padding: 14px 0;
            border-bottom: 3px solid #0f172a;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 20px;
          }
          .header-title h1 {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.5px;
            text-transform: uppercase;
            color: #0f172a;
          }
          .header-title p {
            font-size: 11px;
            color: #475569;
            margin-top: 2px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header-meta {
            text-align: right;
            font-size: 11px;
            color: #475569;
            line-height: 1.5;
          }
          .header-meta strong {
            color: #0f172a;
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #0f172a;
            margin-bottom: 10px;
            margin-top: 18px;
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 4px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }
          .kpi-card {
            background-color: #ffffff;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px;
          }
          .kpi-label {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
            letter-spacing: 0.5px;
          }
          .kpi-value {
            font-size: 24px;
            font-weight: 900;
            color: #0f172a;
            margin: 4px 0 2px 0;
            font-family: monospace;
          }
          .kpi-subtext {
            font-size: 10px;
            color: #64748b;
            font-weight: 600;
          }
          .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
          }
          .chart-card {
            background-color: #ffffff;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px;
          }
          .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 10px;
          }
          .progress-track {
            width: 100%;
            height: 20px;
            background-color: #ffffff;
            border-radius: 4px;
            overflow: hidden;
            border: 1.5px solid #0f172a;
            position: relative;
          }
          .progress-fill-blue {
            height: 100%;
            background-color: #e0f2fe;
            border-right: 2px solid #0284c7;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 8px;
            color: #0369a1;
            font-size: 10px;
            font-weight: 800;
            font-family: monospace;
          }
          .progress-fill-red {
            height: 100%;
            background-color: #fef2f2;
            border-right: 2px solid #dc2626;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 8px;
            color: #b91c1c;
            font-size: 10px;
            font-weight: 800;
            font-family: monospace;
          }
          .split-bar {
            width: 100%;
            height: 20px;
            background-color: #ffffff;
            border-radius: 4px;
            overflow: hidden;
            border: 1.5px solid #0f172a;
            display: flex;
          }
          .split-left {
            height: 100%;
            background-color: #e0f2fe;
            border-right: 1.5px solid #0284c7;
            color: #0369a1;
            font-size: 10px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .split-right {
            height: 100%;
            background-color: #eef2ff;
            color: #4338ca;
            font-size: 10px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .chart-footer {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #475569;
            margin-top: 6px;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border: 1.5px solid #0f172a;
          }
          th {
            background-color: #ffffff;
            color: #0f172a;
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding: 9px 12px;
            text-align: left;
            border-bottom: 2px solid #0f172a;
          }
          .footer-section {
            margin-top: 28px;
            padding-top: 16px;
            border-top: 1.5px solid #cbd5e1;
          }
          .statement {
            font-size: 10px;
            color: #475569;
            font-style: italic;
            margin-bottom: 28px;
            font-weight: 500;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .sig-box {
            text-align: center;
          }
          .sig-line {
            border-bottom: 1.5px solid #0f172a;
            margin-bottom: 6px;
          }
          .sig-name {
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
          }
          .sig-role {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #475569;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div class="header-title">
            <h1>Vila Náutica • Mexicano Lanchas</h1>
            <p>Relatório Oficial de Estoque e Auditoria de Combustível</p>
          </div>
          <div class="header-meta">
            <div>Emissão: <strong>${dataEmissao} às ${horaEmissao}</strong></div>
            <div>Responsável: <strong>${respNome}</strong></div>
            <div>Status da Marina: <strong style="color: #047857;">OK (Auditado)</strong></div>
          </div>
        </div>

        <div class="section-title">1. Resumo Físico de Inventário</div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Estoque Global</div>
            <div class="kpi-value">${totalEstoque.toLocaleString('pt-BR')} L</div>
            <div class="kpi-subtext">Volume Total na Marina</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Tanque Principal (Bulk)</div>
            <div class="kpi-value">${inventory.tanquePrincipalLitros.toLocaleString('pt-BR')} L</div>
            <div class="kpi-subtext">Capacidade: 10.000 L (${pctTanque}%)</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Galões no Píer (20L)</div>
            <div class="kpi-value">${inventory.galoesPierQuantidade} galões</div>
            <div class="kpi-subtext">Volume em Litros: ${litrosGaloesPier} L</div>
          </div>
        </div>

        <div class="section-title">2. Gráficos de Capacidade e Distribuição</div>
        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-header">
              <span>Nível do Tanque Principal</span>
              <span style="color: #0284c7;">${pctTanque}% Ocupado</span>
            </div>
            <div class="progress-track">
              <div class="${isTanqueLow ? 'progress-fill-red' : 'progress-fill-blue'}" style="width: ${Math.max(10, pctTanque)}%;">
                ${inventory.tanquePrincipalLitros.toLocaleString('pt-BR')} L
              </div>
            </div>
            <div class="chart-footer">
              <span>0 L</span>
              <span>Alerta Mínimo: 2.000 L</span>
              <span>Capacidade: 10.000 L</span>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <span>Distribuição do Saldo</span>
              <span style="color: #475569;">Tanque ${pctTanqueShare}% | Píer ${pctPierShare}%</span>
            </div>
            <div class="split-bar">
              <div class="split-left" style="width: ${pctTanqueShare}%;">Tanque (${inventory.tanquePrincipalLitros}L)</div>
              <div class="split-right" style="width: ${pctPierShare}%;">Píer (${litrosGaloesPier}L)</div>
            </div>
            <div class="chart-footer">
              <span style="color: #0284c7; font-weight: 700;">● Tanque Principal (Bulk)</span>
              <span style="color: #4338ca; font-weight: 700;">● Galões 20L no Píer</span>
            </div>
          </div>
        </div>

        <div class="section-title">3. Histórico de Entradas e Movimentações</div>
        <table>
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Operação</th>
              <th>Operador</th>
              <th>Volume (L)</th>
              <th>Detalhes / Fornecedor</th>
              <th style="text-align: right;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${historyRowsHTML || '<tr><td colSpan="6" style="padding: 15px; text-align: center; color: #64748b;">Nenhum registro no histórico.</td></tr>'}
          </tbody>
        </table>

        <div class="footer-section">
          <div class="statement">
            Declaramos para os devidos fins de auditoria interna que os dados acima representam com exatidão os saldos físicos apurados nos tanques e reservatórios da marina.
          </div>
          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-name">${respNome}</div>
              <div class="sig-role">Responsável pela Marina</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-name">Gerência / Auditoria Interna</div>
              <div class="sig-role">Visto da Administração</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 300);
    } else {
      alert('Permita pop-ups no seu navegador para visualizar e imprimir o relatório.');
    }
  };

  // Sincronização dinâmica de galões vs litros na transferência
  const handleGaloesChange = (val: string) => {
    setTransferGaloes(val);
    const g = Number(val);
    if (!isNaN(g) && g >= 0) {
      setTransferLitros(String(g * 20));
    } else {
      setTransferLitros('');
    }
  };

  const handleLitrosChange = (val: string) => {
    setTransferLitros(val);
    const l = Number(val);
    if (!isNaN(l) && l >= 0) {
      setTransferGaloes(String(Math.floor(l / 20)));
    } else {
      setTransferGaloes('');
    }
  };

  // 1. Registrar Compra
  const handleRegisterPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const inv = { ...inventory };
      let litrosNum = 0;
      let galoesNum = 0;

      if (purchaseDestino === 'tanque_principal') {
        litrosNum = Number(purchaseLitros);
        if (!litrosNum || litrosNum <= 0) {
          alert('Informe uma quantidade válida em litros.');
          setIsSubmitting(false);
          return;
        }
        inv.tanquePrincipalLitros = Math.min(inv.tanqueCapacidadeMaxima, inv.tanquePrincipalLitros + litrosNum);
      } else {
        galoesNum = Number(purchaseGaloes);
        if (!galoesNum || galoesNum <= 0) {
          alert('Informe uma quantidade válida de galões.');
          setIsSubmitting(false);
          return;
        }
        litrosNum = galoesNum * inv.galoesCapacidadeLitros;
        inv.galoesPierQuantidade += galoesNum;
      }

      saveFuelInventory(inv);

      addFuelHistoryEntry({
        tipo: purchaseDestino === 'tanque_principal' ? 'compra_tanque' : 'compra_galoes',
        litros: litrosNum,
        galoes: galoesNum || undefined,
        fornecedor: purchaseFornecedor || 'Não informado',
        notaFiscal: purchaseNotaFiscal || 'S/N',
        valorTotal: purchaseValorTotal ? Number(purchaseValorTotal) : undefined,
        operador: operadorNome || 'Gerente',
        detalhes: purchaseDestino === 'tanque_principal' 
          ? `Tanque Principal (+${litrosNum}L)`
          : `Galões no Píer (+${galoesNum} galões 20L)`
      });

      refreshData();
      setPurchaseModalOpen(false);
      setPurchaseLitros('');
      setPurchaseGaloes('');
      setPurchaseNotaFiscal('');
      setPurchaseFornecedor('');
      setPurchaseValorTotal('');
      setIsSubmitting(false);

      if (showToast) showToast('Compra de combustível registrada!', 'success');
    }, 300);
  };

  // 2. Registrar Transferência (Encher Galões)
  const handleRegisterTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const litrosNum = Number(transferLitros);
    if (!litrosNum || litrosNum <= 0) {
      alert('Informe uma quantidade válida de galões ou litros.');
      return;
    }

    if (litrosNum > inventory.tanquePrincipalLitros) {
      alert(`Saldo insuficiente no Tanque Principal! Disponível: ${inventory.tanquePrincipalLitros}L`);
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const inv = { ...inventory };
      const galoesGerados = Math.floor(litrosNum / inv.galoesCapacidadeLitros);
      const litrosEfetivosTransferidos = galoesGerados * inv.galoesCapacidadeLitros;

      inv.tanquePrincipalLitros -= litrosEfetivosTransferidos;
      inv.galoesPierQuantidade += galoesGerados;

      saveFuelInventory(inv);

      addFuelHistoryEntry({
        tipo: 'transferencia_tanque_pier',
        litros: litrosEfetivosTransferidos,
        galoes: galoesGerados,
        operador: operadorNome || 'Gerente',
        detalhes: `Enchimento de ${galoesGerados} galões de 20L (-${litrosEfetivosTransferidos}L do Tanque)`
      });

      refreshData();
      setTransferModalOpen(false);
      setTransferGaloes('2');
      setTransferLitros('40');
      setTransferObservacao('');
      setIsSubmitting(false);

      if (showToast) showToast(`${galoesGerados} Galões de 20L enviados ao Píer!`, 'success');
    }, 300);
  };

  // 3. Registrar Fechamento
  const handleRegisterClosure = (e: React.FormEvent) => {
    e.preventDefault();
    const galoesFisicos = Number(closureGaloesFisicosCheios);
    if (isNaN(galoesFisicos) || galoesFisicos < 0) {
      alert('Informe a quantidade de galões cheios.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const inv = { ...inventory };
      const galoesEsperados = inv.galoesPierQuantidade;
      const diferencaGaloes = galoesFisicos - galoesEsperados;
      const diferencaLitros = diferencaGaloes * inv.galoesCapacidadeLitros;

      inv.galoesPierQuantidade = galoesFisicos;
      saveFuelInventory(inv);

      addFuelHistoryEntry({
        tipo: 'fechamento_turno',
        litros: galoesFisicos * inv.galoesCapacidadeLitros,
        galoes: galoesFisicos,
        diferencaLitros: diferencaLitros,
        operador: operadorNome || 'Gerente',
        detalhes: diferencaLitros === 0
          ? `Fechamento OK (${galoesFisicos} galões)`
          : `Fechamento com ${diferencaLitros > 0 ? 'sobra' : 'falta'} de ${Math.abs(diferencaLitros)}L`
      });

      refreshData();
      setClosureModalOpen(false);
      setClosureGaloesFisicosCheios('');
      setIsSubmitting(false);

      if (showToast) showToast('Fechamento de turno concluído!', 'success');
    }, 300);
  };

  // Filtro
  const filteredHistory = history.filter(h => {
    const term = searchTerm.toLowerCase();
    return !term || (
      (h.fornecedor && h.fornecedor.toLowerCase().includes(term)) ||
      (h.notaFiscal && h.notaFiscal.toLowerCase().includes(term)) ||
      (h.barcoNome && h.barcoNome.toLowerCase().includes(term)) ||
      (h.detalhes && h.detalhes.toLowerCase().includes(term)) ||
      (h.operador && h.operador.toLowerCase().includes(term))
    );
  });

  const totalEstoqueLitros = getEstoqueTotalLitros(inventory);
  const pctTanque = Math.min(100, Math.round((inventory.tanquePrincipalLitros / inventory.tanqueCapacidadeMaxima) * 100));
  const isTanqueLow = inventory.tanquePrincipalLitros <= inventory.alertaMinimoTanque;

  const litrosGaloesPier = inventory.galoesPierQuantidade * 20 + inventory.galaoParcialLitros;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 text-slate-800 font-sans pb-12">
      
      {/* Main Clean Card Container */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
        
        {/* Clean Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              <span>Tanques e Galões</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Monitoramento do Tanque Principal, galões de 20L e movimentações.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Botão Gerar Relatório (Fundo Suave / Eco) */}
            <button
              onClick={handlePrintReport}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Gerar Relatório</span>
            </button>

            {/* Botão Encher Galões */}
            <button
              onClick={() => setTransferModalOpen(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
              <span>Encher Galões</span>
            </button>

            {/* Botão Nova Compra */}
            <button
              onClick={() => setPurchaseModalOpen(true)}
              className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Truck className="w-4 h-4" />
              <span>Nova Compra</span>
            </button>
          </div>
        </div>

        {/* Unified Light KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Estoque Total */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estoque Global</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
                Marina Total
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {totalEstoqueLitros.toLocaleString('pt-BR')}
                </span>
                <span className="text-slate-500 font-bold text-sm">L</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tanque ({inventory.tanquePrincipalLitros.toLocaleString('pt-BR')}L) + Píer ({litrosGaloesPier.toLocaleString('pt-BR')}L)
              </p>
            </div>
          </div>

          {/* Card 2: Tanque Principal */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanque Principal (Bulk)</span>
              {isTanqueLow ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Crítico
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Nível OK
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">
                    {inventory.tanquePrincipalLitros.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-slate-500 font-bold text-sm">L</span>
                </div>
                <span className="text-xs font-semibold text-slate-500">{pctTanque}%</span>
              </div>
              
              <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isTanqueLow ? 'bg-rose-500' : 'bg-blue-600'}`}
                  style={{ width: `${pctTanque}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button 
                onClick={() => setTransferModalOpen(true)}
                className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Transferir p/ Píer</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Galões no Píer */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Galões no Píer (20L)</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">
                {litrosGaloesPier}L Disponível
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {inventory.galoesPierQuantidade}
                </span>
                <span className="text-slate-600 font-medium text-xs">galões cheios</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {inventory.galaoParcialLitros > 0 
                  ? `+ 1 galão em uso (${inventory.galaoParcialLitros}L restantes)` 
                  : 'Prontos para consumo dos marinheiros'}
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button 
                onClick={() => setClosureModalOpen(true)}
                className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Fechamento de Turno</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Clean Search Input */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar histórico (NF, fornecedor, barco)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white transition-all font-medium"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-slate-400 font-medium">
            {filteredHistory.length} registros
          </span>
        </div>

        {/* Minimalist History Table */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="p-3 pl-4">Operação</th>
                  <th className="p-3">Data & Operador</th>
                  <th className="p-3">Volume</th>
                  <th className="p-3">Detalhes</th>
                  <th className="p-3 pr-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Nenhum registro no histórico.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          {h.tipo.startsWith('compra') && (
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <Truck className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {h.tipo === 'transferencia_tanque_pier' && (
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {h.tipo === 'abastecimento_embarcacao' && (
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              <Droplets className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {h.tipo === 'fechamento_turno' && (
                            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                          )}

                          <div>
                            <span className="font-semibold text-slate-900 block text-xs">
                              {h.tipo === 'compra_tanque' && 'Compra Tanque Principal'}
                              {h.tipo === 'compra_galoes' && 'Compra Galões 20L'}
                              {h.tipo === 'transferencia_tanque_pier' && 'Enchimento de Galões'}
                              {h.tipo === 'abastecimento_embarcacao' && (h.barcoNome || 'Abastecimento Embarcação')}
                              {h.tipo === 'fechamento_turno' && 'Fechamento de Turno'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-slate-600">
                        <span className="block font-medium">{h.dataHora}</span>
                        <span className="text-[10px] text-slate-400">Por: {h.operador}</span>
                      </td>

                      <td className="p-3">
                        {h.tipo.startsWith('compra') || h.tipo === 'transferencia_tanque_pier' ? (
                          <span className="font-semibold text-emerald-600 flex items-center gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +{h.litros} L
                          </span>
                        ) : h.tipo === 'abastecimento_embarcacao' ? (
                          <span className="font-semibold text-rose-600 flex items-center gap-0.5">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            -{h.litros} L
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700">{h.litros} L</span>
                        )}
                      </td>

                      <td className="p-3 text-slate-600">
                        <span className="block text-xs truncate max-w-xs">{h.detalhes || h.fornecedor || '-'}</span>
                        {h.notaFiscal && <span className="text-[10px] text-slate-400 font-mono">NF: {h.notaFiscal}</span>}
                      </td>

                      <td className="p-3 pr-4 text-right">
                        {h.diferencaLitros && h.diferencaLitros !== 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Divergência ({h.diferencaLitros > 0 ? `+${h.diferencaLitros}` : h.diferencaLitros}L)
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 1. Modal: Compra */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#2563EB]" />
                <span>Registrar Compra de Combustível</span>
              </h3>
              <button onClick={() => setPurchaseModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterPurchase} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 text-xs">Destino do Combustível</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setPurchaseDestino('tanque_principal')}
                    className={`py-2 px-3 rounded-xl border transition-all cursor-pointer ${
                      purchaseDestino === 'tanque_principal' 
                        ? 'bg-[#2563EB] text-white border-[#2563EB]' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Tanque Principal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchaseDestino('galoes_pier')}
                    className={`py-2 px-3 rounded-xl border transition-all cursor-pointer ${
                      purchaseDestino === 'galoes_pier' 
                        ? 'bg-[#2563EB] text-white border-[#2563EB]' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Galões de 20L
                  </button>
                </div>
              </div>

              {purchaseDestino === 'tanque_principal' ? (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 text-xs">Quantidade (Litros) *</label>
                  <input 
                    type="number"
                    required
                    value={purchaseLitros}
                    onChange={(e) => setPurchaseLitros(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    placeholder="Ex: 3000"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 text-xs">Quantidade de Galões (20L) *</label>
                  <input 
                    type="number"
                    required
                    value={purchaseGaloes}
                    onChange={(e) => setPurchaseGaloes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    placeholder="Ex: 10"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 text-xs">Nota Fiscal</label>
                  <input 
                    type="text"
                    value={purchaseNotaFiscal}
                    onChange={(e) => setPurchaseNotaFiscal(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    placeholder="NF-123"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 text-xs">Fornecedor</label>
                  <input 
                    type="text"
                    value={purchaseFornecedor}
                    onChange={(e) => setPurchaseFornecedor(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    placeholder="Distribuidora BR"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Encher Galões */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span>Encher Galões de 20L (Tanque ➔ Píer)</span>
              </h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterTransfer} className="p-5 space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
                <span>Saldo no Tanque:</span>
                <strong className="font-mono text-sm">{inventory.tanquePrincipalLitros.toLocaleString('pt-BR')} L</strong>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 text-xs">Informar Enchimento Por *</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setTransferMode('galoes')}
                    className={`py-2 px-3 rounded-xl border transition-all cursor-pointer ${
                      transferMode === 'galoes' 
                        ? 'bg-[#2563EB] text-white border-[#2563EB]' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Quantidade de Galões (20L)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferMode('litros')}
                    className={`py-2 px-3 rounded-xl border transition-all cursor-pointer ${
                      transferMode === 'litros' 
                        ? 'bg-[#2563EB] text-white border-[#2563EB]' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Volume em Litros (L)
                  </button>
                </div>
              </div>

              {transferMode === 'galoes' ? (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 text-xs">Quantidade de Galões de 20L Enchidos *</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    value={transferGaloes}
                    onChange={(e) => handleGaloesChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-mono"
                    placeholder="Ex: 2"
                  />
                  {Number(transferGaloes) > 0 && (
                    <span className="text-xs text-[#2563EB] font-semibold block pt-1">
                      👉 Retirará <strong>{Number(transferGaloes) * 20} Litros</strong> do Tanque Principal
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 text-xs">Volume a Retirar do Tanque (Litros) *</label>
                  <input 
                    type="number"
                    required
                    step="20"
                    value={transferLitros}
                    onChange={(e) => handleLitrosChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-mono"
                    placeholder="Ex: 40"
                  />
                  {Number(transferLitros) > 0 && (
                    <span className="text-xs text-slate-500 font-medium block pt-1">
                      👉 Equivale a <strong>{Math.floor(Number(transferLitros) / 20)} Galões de 20L</strong> cheios no Píer
                    </span>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !transferLitros || Number(transferLitros) <= 0}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar Enchimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Fechamento */}
      {closureModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Fechamento de Turno</span>
              </h3>
              <button onClick={() => setClosureModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterClosure} className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                Galões esperados no sistema: <strong>{inventory.galoesPierQuantidade} galões</strong>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 text-xs">Galões Cheios Encontrados no Píer *</label>
                <input 
                  type="number"
                  required
                  value={closureGaloesFisicosCheios}
                  onChange={(e) => setClosureGaloesFisicosCheios(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder={String(inventory.galoesPierQuantidade)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setClosureModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || closureGaloesFisicosCheios === ''}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Concluir Fechamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
