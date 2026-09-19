const fs = require('fs');

let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

// 1. Update PlanoDeConta interface and add CentroDeCusto interface
let planoInterface = `interface PlanoDeConta {
  id?: string;
  codigoContabil: string;
  descricao: string;
  tipo: 'receita' | 'despesa';
  empresa: string;
  status: 'ativo' | 'inativo';
  parentId?: string;
}

interface CentroDeCusto {
  id?: string;
  codigo: string;
  descricao: string;
  tipo: 'receita' | 'despesa';
  empresa: string;
  status: 'ativo' | 'inativo';
  parentId?: string;
}`;

code = code.replace(/interface PlanoDeConta \{[\s\S]*?\}/, planoInterface);

// 2. Add centrosCusto and centroForm to state
code = code.replace(
  /const \[fornecedores, setFornecedores\] = useState<Fornecedor\[\]>\(\[\]\);/,
  `const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroDeCusto[]>([]);`
);

code = code.replace(
  /const \[editingFornecedor, setEditingFornecedor\] = useState<Fornecedor \| null>\(null\);/,
  `const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [editingCentro, setEditingCentro] = useState<CentroDeCusto | null>(null);`
);

// Form
code = code.replace(
  /const \[fornecedorForm, setFornecedorForm\] = useState<Partial<Fornecedor>>\([\s\S]*?\}\);/,
  `const [fornecedorForm, setFornecedorForm] = useState<Partial<Fornecedor>>({
    nomeFantasia: '',
    razaoSocial: '',
    cnpjCpf: '',
    empresaId: empresa && empresa !== 'Todos' ? empresa : 'Marina',
    dadosBancarios: '',
    status: 'ativo'
  });

  const [centroForm, setCentroForm] = useState<Partial<CentroDeCusto>>({
    codigo: '',
    descricao: '',
    tipo: 'despesa',
    empresa: empresa && empresa !== 'Todos' ? empresa : 'Todos',
    status: 'ativo',
    parentId: ''
  });`
);

// 3. Update tabs type
code = code.replace(
  /useState<'contas_bancarias' \| 'planos_contas' \| 'fornecedores'>\('contas_bancarias'\)/,
  `useState<'contas_bancarias' | 'planos_contas' | 'centros_custo' | 'fornecedores'>('contas_bancarias')`
);

// 4. Update fetch
code = code.replace(
  /fetch\(\`\/api\/financeiro\/fornecedores\$\{q\}\`\, \{ credentials\: \'include\'\, headers\: getAuthHeader\(\) \}\)/,
  `fetch(\`/api/financeiro/fornecedores\${q}\`, { credentials: 'include', headers: getAuthHeader() }),
        fetch(\`/api/financeiro/centros-custo\${q}\`, { credentials: 'include', headers: getAuthHeader() })`
);

code = code.replace(
  /const \[resContas, resPlanos, resFornecedores\] = await Promise.all/,
  `const [resContas, resPlanos, resFornecedores, resCentros] = await Promise.all`
);

code = code.replace(
  /if \(resFornecedores\.ok\) \{\s*const data = await resFornecedores\.json\(\);\s*setFornecedores\(data\);\s*\}/,
  `if (resFornecedores.ok) {
        const data = await resFornecedores.json();
        setFornecedores(data);
      }
      if (resCentros?.ok) {
        const data = await resCentros.json();
        setCentrosCusto(data);
      }`
);

// 5. handleOpenCreateModal
code = code.replace(
  /} else if \(activeSubTab === 'planos_contas'\) {/,
  `} else if (activeSubTab === 'planos_contas') {
      setEditingPlano(null);
      setPlanoForm({
        codigoContabil: '',
        descricao: '',
        tipo: 'despesa',
        empresa: empresa && empresa !== 'Todos' ? empresa : 'Todos',
        status: 'ativo',
        parentId: ''
      });
    } else if (activeSubTab === 'centros_custo') {
      setEditingCentro(null);
      setCentroForm({
        codigo: '',
        descricao: '',
        tipo: 'despesa',
        empresa: empresa && empresa !== 'Todos' ? empresa : 'Todos',
        status: 'ativo',
        parentId: ''
      });`
);

// update Plano form initial state inside handleOpenCreateModal previously (just in case the regex misses)
// Actually we already replaced above, but let's double check planoForm.
code = code.replace(
  /setPlanoForm\(\{([\s\S]*?codigoContabil: '',[\s\S]*?status: 'ativo')\s*\}\);/g,
  `setPlanoForm({$1, parentId: ''});`
);

// 6. Delete signature
code = code.replace(
  /const handleDelete = async \(type: 'contas-bancarias' \| 'planos-contas' \| 'fornecedores', id: string\) => {/,
  `const handleDelete = async (type: 'contas-bancarias' | 'planos-contas' | 'fornecedores' | 'centros-custo', id: string) => {`
);

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
console.log('FinanceConfig state parsing updated!');

