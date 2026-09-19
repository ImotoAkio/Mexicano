const fs = require('fs');

// Copy FinanceFluxoCaixa.tsx content
let original = fs.readFileSync('src/components/finance/FinanceFluxoCaixa.tsx', 'utf8');

// Change export statement
original = original.replace(/export default function FinanceFluxoCaixa\(\) \{/, 'export default function FinanceLancamentos() {');

// We want everything from the top of the file up to the end of the common state definitions and useEffects.
// Then for render, we return only the Lancamentos part.
// Actually, it's easier to remove the `{activeTab === ...}` stuff.
let renderStart = original.indexOf('return (');

// Let's grab the top part up to renderStart
let topPart = original.substring(0, renderStart);

// Remove the `const activeTab = 'lancamentos';`
topPart = topPart.replace(/const activeTab[^;\n]+;/, '');
// Remove FinanceDashboard, Kanban etc imports
topPart = topPart.replace(/import FinanceDashboard[^;\n]+;/, '');
topPart = topPart.replace(/import FinanceKanban[^;\n]+;/, '');
topPart = topPart.replace(/import FinanceConfig[^;\n]+;/, '');
// Add Filter import if not there
if (!topPart.includes('Filter')) {
  topPart = topPart.replace(/import {/, 'import { Filter,');
}


let renderPart = `return (
    <div className={\`max-w-7xl mx-auto \${isFinanceiro ? 'p-1 md:p-2 space-y-4' : 'p-4 md:p-8 space-y-6'}\`}>
      {isFinanceiro ? (
        <div className="flex justify-between items-center py-1 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500">
            Olá, <strong className="font-bold text-slate-700 capitalize">{loggedUser?.username || 'Carregando...'}</strong>
          </span>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 rounded-xl">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                Lançamentos Financeiros
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Gestão unificada de pagamentos, conciliação e controle. Conta: <strong className="font-semibold text-slate-700 capitalize">{loggedUser?.username || 'Carregando...'}</strong>
            </p>
          </div>

          {isFinanceiroOrAdmin && (
            <div className="flex gap-2 items-center">
              <select
                value={empresaFiltro}
                onChange={(e) => setEmpresaFiltro(e.target.value)}
                className="px-3 py-2 text-sm font-semibold rounded-xl text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Todos">Todas as Empresas</option>
                <option value="Marina">Marina</option>
                <option value="Vale Administradora">Vale Administradora</option>
                <option value="Mexicano">Mexicano</option>
              </select>
              {isAdmin && (
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 transition-all duration-300 shadow-sm overflow-hidden shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span>Importar XML</span>
                </button>
              )}
              <button
                onClick={() => openModal()}
                className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Novo Lançamento</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/60 p-4 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-emerald-100/50 rounded-xl text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-emerald-800">Total Recebido (Pago)</p>
          </div>
          <p className="text-xl font-black mt-1.5 text-emerald-700 tracking-tight relative z-10">
            <span className="text-sm opacity-60 mr-1">R$</span>
            {totalRecebidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/60 p-4 rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-100 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-indigo-100/50 rounded-xl text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-indigo-800">A Receber (Lançados)</p>
          </div>
          <p className="text-xl font-black mt-1.5 text-indigo-700 tracking-tight relative z-10">
            <span className="text-sm opacity-60 mr-1">R$</span>
            {aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 p-4 rounded-xl shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/20 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-rose-500/10 rounded-xl text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-300">Em Atraso (Com Juros)</p>
          </div>
          <p className="text-xl font-black mt-1.5 text-white tracking-tight relative z-10">
            <span className="text-sm text-slate-400 mr-1">R$</span>
            {totalVencidosComJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          {totalAtrasadoJuros > 0 && (
            <p className="text-[10px] font-medium text-slate-400 mt-1.5 bg-white/5 inline-block px-2 py-0.5 rounded border border-white/5">
              Principal: R$ {totalAtrasadoPrincipal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • Juros: R$ {totalAtrasadoJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-white/50 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-50 rounded-xl text-indigo-600">
                <FileText className="w-5 h-5" />
              </div>
              Histórico de Lançamentos
            </h2>

            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente, barco, descrição..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Filtros em Grade - Redesenhados para Apple Design */}
          <div className="flex flex-col gap-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                <div className="relative z-30">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Classificação & Status</label>
                  <div className="flex gap-2">
                    <select
                      value={tipoFilter}
                      onChange={(e) => setTipoFilter(e.target.value)}
                      className="w-1/2 px-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-semibold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="todos">Tudo</option>
                      <option value="receita">Entradas</option>
                      <option value="despesa">Saídas</option>
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-1/2 px-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-semibold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="todos">Todos Status</option>
                      <option value="baixas">Apenas Baixas</option>
                      <option value="lancado">Novos</option>
                      <option value="vencido">Atrasados</option>
                      <option value="pago">Pagos</option>
                      <option value="cancelado">Cancelados</option>
                    </select>
                  </div>
                </div>

              <div className="relative z-20">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Buscar por Cliente</label>
                <Select
                  value={{ value: clienteFilter, label: clienteFilter === 'todos' ? 'Todos os Clientes' : clientes.find(c => c.id === clienteFilter)?.nome || 'Não encontrado' }}
                  onChange={(selected) => setClienteFilter(selected?.value || 'todos')}
                  options={[
                    { value: 'todos', label: 'Todos os Clientes' },
                    ...clientes.map(c => ({ value: c.id, label: c.nome }))
                  ]}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                      backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : 'none',
                      minHeight: '42px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#334155'
                    }),
                    menu: (base) => ({ ...base, fontSize: '0.875rem', zIndex: 50 })
                  }}
                  placeholder="Filtrar por cliente..."
                />
              </div>

              <div className="relative z-10">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Buscar por Embarcacao</label>
                <Select
                  value={{ value: embarcacaoFilter, label: embarcacaoFilter === 'todos' ? 'Todas as Embarcações' : embarcacoes.find(e => e.id === embarcacaoFilter)?.nome || 'Nao encontrada' }}
                  onChange={(selected) => setEmbarcacaoFilter(selected?.value || 'todos')}
                  options={[
                    { value: 'todos', label: 'Todas as Embarcações' },
                    ...embarcacoes.map(e => ({ value: e.id, label: e.nome }))
                  ]}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                      backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : 'none',
                      minHeight: '42px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#334155'
                    }),
                    menu: (base) => ({ ...base, fontSize: '0.875rem', zIndex: 50 })
                  }}
                  placeholder="Filtrar por barco..."
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 border border-slate-100 rounded-[1rem] p-2 mt-2">
              <div className="flex items-center w-full md:w-auto gap-4">
                <div className="flex items-center gap-2 pl-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-600">Período de Venc./Baixa:</span>
                </div>
                <div className="flex items-center gap-2 pr-2 overflow-x-auto max-w-full">
                  <input
                    type="date"
                    value={dataInicioFilter}
                    onChange={(e) => setDataInicioFilter(e.target.value)}
                    className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500/30 w-36 sm:w-auto shrink-0"
                  />
                  <span className="text-slate-400 font-bold">até</span>
                  <input
                    type="date"
                    value={dataFimFilter}
                    onChange={(e) => setDataFimFilter(e.target.value)}
                    className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500/30 w-36 sm:w-auto shrink-0"
                  />
                </div>
              </div>

              {(searchTerm || statusFilter !== 'todos' || tipoFilter !== 'todos' || clienteFilter !== 'todos' || embarcacaoFilter !== 'todos' || dataInicioFilter || dataFimFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('todos');
                    setTipoFilter('todos');
                    setClienteFilter('todos');
                    setEmbarcacaoFilter('todos');
                    setDataInicioFilter('');
                    setDataFimFilter('');
                  }}
                  className="mt-3 md:mt-0 px-4 py-2 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-500 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <X className="w-3.5 h-3.5" /> Limpar
                </button>
              )}
            </div>
          </div>
        </div>

`;

// Now we need the table part up to the modals from the original file.
// The table starts at `<div className="overflow-x-auto` (or whatever class) in the original.
// Let's extract everything inside the table block till the modals
const tableStartMatch = original.match(/<div className="overflow-x-auto[^>]*>/);
if (tableStartMatch) {
  const tStartIndex = tableStartMatch.index;
  // Modals start at: {isModalOpen && (
  const modalStartMatch = original.indexOf('{isModalOpen && (');
  // Or at the end of the return statement. Wait, modals are inside the main div or outside?
  // Let's check where they are:
  const modalsPart = original.substring(modalStartMatch);

  // Table part is from tStartIndex up to the end of the div that contains it. But it's easier to just take from tableStartMatch up to modalStartMatch.
  let tableAndModals = original.substring(tStartIndex);
  // Remove `{activeTab...}` sections that might appear after the table.
  const agendaStart = tableAndModals.indexOf("{activeTab === 'agenda'");
  if (agendaStart > -1) {
    tableAndModals = tableAndModals.substring(0, agendaStart);
  }

  // We need to properly close the main divs.
  // We opened `<div className="max-w-7xl...`, and `<div className="bg-white border...`
  // The table part includes the closing `</div>` for its container? Yes.

  // We can just append the rest of the modals and close our tags.
  // We'll use the original modals.
  renderPart += tableAndModals;

  // Close the main elements:
  // We know we must add exactly the correct closing tags. Let's just find the closing bracket of `return (`
  // Wait, `tableAndModals` probably has unbalanced tags if we slice it before `agenda`.
  // Let's be smart: use regex to grab the table `<table className="w-full text-left border-collapse">...</table>` or similar.
}

let newCode = topPart + renderPart;
fs.writeFileSync('build_lancamentos.cjs', newCode);
