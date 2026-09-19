const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'finance', 'FinanceConfig.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('const [centrosCusto, setCentrosCusto]')) {
    content = content.replace(
        'const [fornecedores, setFornecedores] = useState<any[]>([]);',
        'const [fornecedores, setFornecedores] = useState<any[]>([]);\n  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);'
    );
}

if (!content.includes('fetch(`/api/financeiro/centros-custo${q}`')) {
    content = content.replace(
        'const [resContas, resPlanos, resFornecedores] = await Promise.all([',
        'const [resContas, resPlanos, resFornecedores, resCentros] = await Promise.all(['
    );
    content = content.replace(
        'fetch(`/api/financeiro/fornecedores${q}`, { credentials: \'include\', headers: getAuthHeader() })',
        'fetch(`/api/financeiro/fornecedores${q}`, { credentials: \'include\', headers: getAuthHeader() }),\n        fetch(`/api/financeiro/centros-custo${q}`, { credentials: \'include\', headers: getAuthHeader() })'
    );
    content = content.replace(
        'if (resFornecedores.ok) setFornecedores(await resFornecedores.json());',
        'if (resFornecedores.ok) setFornecedores(await resFornecedores.json());\n      if (resCentros && resCentros.ok) setCentrosCusto(await resCentros.json());'
    );
}

if (!content.includes('id: \'centros\', label: \'Centros de Custo\'')) {
    content = content.replace(
        "{ id: 'fornecedores', label: 'Fornecedores', icon: <Briefcase className=\"w-[18px] h-[18px]\" /> },",
        "{ id: 'centros', label: 'Centros de Custo', icon: <Building2 className=\"w-[18px] h-[18px]\" /> },\n            { id: 'fornecedores', label: 'Fornecedores', icon: <Briefcase className=\"w-[18px] h-[18px]\" /> },"
    );
}

if (!content.includes('import { Building2')) {
    content = content.replace(
        'lucide-react\';',
        'Building2 } from \'lucide-react\';'
    );
}

fs.writeFileSync(file, content);
console.log('Fixed FinanceConfig states and tabs');
