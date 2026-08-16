const fs = require('fs');
const path = require('path');

// ======================= BOAT PAGE =======================
const boatFilePath = path.join(__dirname, '..', 'src', 'components', 'BoatPage.tsx');
let boatContent = fs.readFileSync(boatFilePath, 'utf8');

// 1. Add adminRole and empresas state
const stateBoatSearch = `const [seguroUrl, setSeguroUrl] = useState('');`;
const stateBoatReplace = `const [seguroUrl, setSeguroUrl] = useState('');
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
boatContent = boatContent.replace(stateBoatSearch, stateBoatReplace);

// 2. filterEmpresa
const filterBoatSearch = `const [search, setSearch] = useState('');`;
const filterBoatReplace = `const [search, setSearch] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');`;
boatContent = boatContent.replace(filterBoatSearch, filterBoatReplace);

// 3. handleOpenCreateModal
const createBoatSearch = `setSeguroUrl('');
    setIsModalOpen(true);`;
const createBoatReplace = `setSeguroUrl('');
    if (adminRole === 'marina' || adminRole === 'marina_operador' || adminRole === 'marina_gerente') {
      setEmpresas(['MARINA']);
    } else {
      setEmpresas(['VALE']);
    }
    setIsModalOpen(true);`;
boatContent = boatContent.replace(createBoatSearch, createBoatReplace);

// 4. handleOpenEditModal
const editBoatSearch = `setSeguroUrl(boat.seguroUrl || '');
    setIsModalOpen(true);`;
const editBoatReplace = `setSeguroUrl(boat.seguroUrl || '');
    setEmpresas(boat.empresas && boat.empresas.length > 0 ? boat.empresas : ['VALE']);
    setIsModalOpen(true);`;
boatContent = boatContent.replace(editBoatSearch, editBoatReplace);

// 5. handleSave (update)
const updateBoatSearch = `seguroUrl: seguroUrl || undefined
        });`;
const updateBoatReplace = `seguroUrl: seguroUrl || undefined,
          empresas
        });`;
boatContent = boatContent.replace(updateBoatSearch, updateBoatReplace);

// 6. handleSave (create)
const createSaveBoatSearch = `seguroUrl: seguroUrl || undefined
        });
        showToast('Embarcação cadastrada com sucesso!');`;
const createSaveBoatReplace = `seguroUrl: seguroUrl || undefined,
          empresas
        });
        showToast('Embarcação cadastrada com sucesso!');`;
boatContent = boatContent.replace(createSaveBoatSearch, createSaveBoatReplace);

// 7. filteredBoats
const filteredBoatSearch = `const matchesSearch = !search`;
const filteredBoatReplace = `let matchesEmpresa = true;
    const isAdminOrFinance = adminRole === 'admin' || adminRole === 'financeiro';
    if (!isAdminOrFinance) {
      const userEmpresa = (adminRole === 'marina' || adminRole === 'marina_operador' || adminRole === 'marina_gerente') ? 'MARINA' : 
                        (adminRole === 'comercial' ? 'MEXICANO' : 'VALE');
      matchesEmpresa = (boat.empresas || ['VALE']).includes(userEmpresa);
    } else if (filterEmpresa !== 'all') {
      matchesEmpresa = (boat.empresas || ['VALE']).includes(filterEmpresa);
    }

    const matchesSearch = !search`;
boatContent = boatContent.replace(filteredBoatSearch, filteredBoatReplace);

const filterCheckBoatSearch = `return matchesSearch;`;
const filterCheckBoatReplace = `return matchesSearch && matchesEmpresa;`;
boatContent = boatContent.replace(filterCheckBoatSearch, filterCheckBoatReplace);

// 8. Filters UI (add Empresa select)
const filterUIBoatSearch = `<div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />`;
const filterUIBoatReplace = `{(adminRole === 'admin' || adminRole === 'financeiro') && (
            <div className="w-full md:w-48">
              <select
                value={filterEmpresa}
                onChange={(e) => setFilterEmpresa(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              >
                <option value="all">Todas as Empresas</option>
                <option value="VALE">Vale (Default)</option>
                <option value="MARINA">Marina Club</option>
                <option value="MEXICANO">Mexicano Lanchas</option>
              </select>
            </div>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />`;
boatContent = boatContent.replace(filterUIBoatSearch, filterUIBoatReplace);

// 9. Modal UI Checkboxes
const modalBoatSearch = `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Embarcação *</label>`;
const modalBoatReplace = `{(adminRole === 'admin' || adminRole === 'financeiro') && (
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Embarcação *</label>`;
boatContent = boatContent.replace(modalBoatSearch, modalBoatReplace);

fs.writeFileSync(boatFilePath, boatContent, 'utf8');
console.log("BoatPage.tsx patched successfully!");
