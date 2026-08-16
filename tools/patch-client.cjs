const fs = require('fs');
const path = require('path');

// ======================= CLIENT PAGE =======================
const clientFilePath = path.join(__dirname, '..', 'src', 'components', 'ClientPage.tsx');
let clientContent = fs.readFileSync(clientFilePath, 'utf8');

// 1. Add adminRole and empresas state
const stateSearch = `const [plano, setPlano] = useState<'normal' | 'completo'>('normal');`;
const stateReplace = `const [plano, setPlano] = useState<'normal' | 'completo'>('normal');
  const [empresas, setEmpresas] = useState<string[]>(['VALE']);

  const adminRole = useMemo(() => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch {
      return null;
    }
  }, []);`;
clientContent = clientContent.replace(stateSearch, stateReplace);

// 2. filterEmpresa
const filterSearch = `const [filterBoat, setFilterBoat] = useState<string>('all');`;
const filterReplace = `const [filterBoat, setFilterBoat] = useState<string>('all');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');`;
clientContent = clientContent.replace(filterSearch, filterReplace);

// 3. handleOpenCreateModal
const createSearch = `setPlano('normal');
    setIsModalOpen(true);`;
const createReplace = `setPlano('normal');
    if (adminRole === 'marina' || adminRole === 'marina_operador' || adminRole === 'marina_gerente') {
      setEmpresas(['MARINA']);
    } else {
      setEmpresas(['VALE']);
    }
    setIsModalOpen(true);`;
clientContent = clientContent.replace(createSearch, createReplace);

// 4. handleOpenEditModal
const editSearch = `setPlano(client.plano || 'normal');
    setIsModalOpen(true);`;
const editReplace = `setPlano(client.plano || 'normal');
    setEmpresas(client.empresas && client.empresas.length > 0 ? client.empresas : ['VALE']);
    setIsModalOpen(true);`;
clientContent = clientContent.replace(editSearch, editReplace);

// 5. handleSave (update)
const updateSearch = `observacoesFinanceiras,
          plano
        });`;
const updateReplace = `observacoesFinanceiras,
          plano,
          empresas
        });`;
clientContent = clientContent.replace(updateSearch, updateReplace);

// 6. handleSave (create)
const createSaveSearch = `observacoesFinanceiras,
          plano
        });
        showToast('Cliente cadastrado com sucesso!');`;
const createSaveReplace = `observacoesFinanceiras,
          plano,
          empresas
        });
        showToast('Cliente cadastrado com sucesso!');`;
clientContent = clientContent.replace(createSaveSearch, createSaveReplace);

// 7. filteredClients
const filteredSearch = `// 3. Filter by finance`;
const filteredReplace = `// 2.5 Filter by empresa
      let matchesEmpresa = true;
      const isAdminOrFinance = adminRole === 'admin' || adminRole === 'financeiro';
      
      if (!isAdminOrFinance) {
        // Strict access rule: other roles only see their own company's clients
        const userEmpresa = (adminRole === 'marina' || adminRole === 'marina_operador' || adminRole === 'marina_gerente') ? 'MARINA' : 
                          (adminRole === 'comercial' ? 'MEXICANO' : 'VALE');
        matchesEmpresa = (c.empresas || ['VALE']).includes(userEmpresa);
      } else if (filterEmpresa !== 'all') {
        matchesEmpresa = (c.empresas || ['VALE']).includes(filterEmpresa);
      }

      // 3. Filter by finance`;
clientContent = clientContent.replace(filteredSearch, filteredReplace);

const filterCheckSearch = `return matchesSearch && matchesBoat && matchesFinance && matchesBoatType && matchesPlano;`;
const filterCheckReplace = `return matchesSearch && matchesBoat && matchesFinance && matchesBoatType && matchesPlano && matchesEmpresa;`;
clientContent = clientContent.replace(filterCheckSearch, filterCheckReplace);

// 8. Filters UI (add Empresa select)
const filterUISearch = `<div className="flex flex-col sm:flex-row gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Filtrar por Embarcação
              </label>`;
const filterUIReplace = `<div className="flex flex-col sm:flex-row gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            {(adminRole === 'admin' || adminRole === 'financeiro') && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Empresa
                </label>
                <select
                  value={filterEmpresa}
                  onChange={(e) => setFilterEmpresa(e.target.value)}
                  className="w-full h-10 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-3 transition-colors"
                >
                  <option value="all">Todas as Empresas</option>
                  <option value="VALE">Vale (Default)</option>
                  <option value="MARINA">Marina Club</option>
                  <option value="MEXICANO">Mexicano Lanchas</option>
                </select>
              </div>
            )}
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Filtrar por Embarcação
              </label>`;
clientContent = clientContent.replace(filterUISearch, filterUIReplace);

// 9. Modal UI Checkboxes
const modalSearch = `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>`;
const modalReplace = `{(adminRole === 'admin' || adminRole === 'financeiro') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Vínculo de Empresa(s)</label>
                    <div className="flex gap-4">
                      {['VALE', 'MARINA', 'MEXICANO'].map((emp) => (
                        <label key={emp} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={empresas.includes(emp)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEmpresas([...empresas, emp]);
                              } else {
                                setEmpresas(empresas.filter(x => x !== emp));
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-700">{emp === 'VALE' ? 'Vale' : emp === 'MARINA' ? 'Marina Club' : 'Mexicano Lanchas'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>`;
clientContent = clientContent.replace(modalSearch, modalReplace);

fs.writeFileSync(clientFilePath, clientContent, 'utf8');
console.log("ClientPage.tsx patched successfully!");
