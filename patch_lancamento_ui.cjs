const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentos.tsx', 'utf8');

const regexFilters = /\{\/\* Filtros em Grade \*\/\}(.|[\r\n])*?<div className="overflow-x-auto min-h-\[300px\]">/;

const newFilters = `{/* Filtros em Grade - Redesenhados para mais espaço (Apple Design) */}
              <div className="flex flex-col gap-4 mt-6">

                {/* Linha 1: Filtros de Vinculos e Classificacao */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                    <div className="relative z-30">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Classificação & Status</label>
                      <div className="flex gap-2">
                        <select
                          value={tipoFilter}
                          onChange={(e) => setTipoFilter(e.target.value)}
                          className="w-1/2 px-4 py-2 bg-slate-50 hover:bg-white border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-semibold text-slate-700 shadow-sm outline-none cursor-pointer"
                        >
                          <option value="todos">Tudo</option>
                          <option value="receita">Entradas</option>
                          <option value="despesa">Saídas</option>
                        </select>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-1/2 px-4 py-2 bg-slate-50 hover:bg-white border border-slate-200/80 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-semibold text-slate-700 shadow-sm outline-none cursor-pointer"
                        >
                          <option value="todos">Todos os Status</option>
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
                          boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          minHeight: '38px',
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
                          boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          minHeight: '38px',
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

                {/* Linha 2: Periodo de Tempo com mais conforto */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 border border-slate-100 rounded-[1rem] p-2 mt-2">
                  <div className="flex items-center w-full md:w-auto gap-4">
                    <div className="flex items-center gap-2 pl-3">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600">Período Selecionado:</span>
                    </div>
                    <div className="flex items-center gap-2 pr-2 overflow-x-auto padding-b-1 max-w-full">
                      <input
                        type="date"
                        value={dataInicioFilter}
                        onChange={(e) => setDataInicioFilter(e.target.value)}
                        className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500/30 w-36 sm:w-auto"
                        title="Data Inicial"
                      />
                      <span className="text-slate-400 font-bold">até</span>
                      <input
                        type="date"
                        value={dataFimFilter}
                        onChange={(e) => setDataFimFilter(e.target.value)}
                        className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500/30 w-36 sm:w-auto"
                        title="Data Final"
                      />
                    </div>
                  </div>

                  {/* Botao limpar filtros se houver */}
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
                      className="mt-3 md:mt-0 px-4 py-2 hover:bg-slate-200/50 rounded-lg text-xs font-bold text-slate-500 transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Limpar Filtros
                    </button>
                  )}
                </div>
              </div>

            </div>

            <div className="overflow-x-auto min-h-[300px]">`;

code = code.replace(regexFilters, newFilters);
fs.writeFileSync('src/components/finance/FinanceLancamentos.tsx', code);
