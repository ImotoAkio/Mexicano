const fs = require('fs');

let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

// 1. Add Centros Tab Button
const planoTabButton = `activeSubTab === 'planos_contas'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }\`}
          >
            <Layers className="w-4 h-4" />
            <span className="font-semibold text-[13px]">Planos de Contas</span>
          </button>`;

const centroTabButton = `activeSubTab === 'planos_contas'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }\`}
          >
            <Layers className="w-4 h-4" />
            <span className="font-semibold text-[13px]">Planos de Contas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('centros_custo')}
            className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all \${
              activeSubTab === 'centros_custo'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }\`}
          >
            <Briefcase className="w-4 h-4" />
            <span className="font-semibold text-[13px]">Centros de Custo</span>
          </button>`;

code = code.replace(planoTabButton, centroTabButton);

// 2. Add handleSaveCentro
const savePlanoMatch = /const handleSavePlano = async \(e: React\.FormEvent\) => \{[\s\S]*?\};/;
const saveCentro = `const handleSaveCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...(editingCentro?.id ? { id: editingCentro.id } : {}),
        ...centroForm
      };
      const res = await fetch('/api/financeiro/centros-custo/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          action: 'upsert',
          data: payload
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        alert('Erro ao salvar centro de custo');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados');
    }
  };`;
code = code.replace(savePlanoMatch, (match) => match + '\n\n  ' + saveCentro);

// 3. New Modal Header
code = code.replace(
  /\{activeSubTab === 'planos_contas' && \(editingPlano \? 'Editar Plano de Contas' : 'Novo Plano de Contas'\)\}/,
  `{activeSubTab === 'planos_contas' && (editingPlano ? 'Editar Plano de Contas' : 'Novo Plano de Contas')}
                {activeSubTab === 'centros_custo' && (editingCentro ? 'Editar Centro de Custo' : 'Novo Centro de Custo')}`
);

// 4. New Button Label
code = code.replace(
  /\{activeSubTab === 'planos_contas' && 'Novo Plano de Contas'\}/,
  `{activeSubTab === 'planos_contas' && 'Novo Plano de Contas'}
            {activeSubTab === 'centros_custo' && 'Novo Centro de Custo'}`
);

// 5. Submit Form ID
code = code.replace(
  /\: activeSubTab === 'planos_contas'\s*\?\s*'form-plano'/,
  `: activeSubTab === 'planos_contas'
                    ? 'form-plano'
                    : activeSubTab === 'centros_custo'
                    ? 'form-centro'`
);

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('Button and Modal headers updated');
