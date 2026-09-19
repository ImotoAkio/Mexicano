const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceConfig.tsx', 'utf8');

code = code.replace(
  "import { ContaBancaria, PlanoDeConta, Fornecedor } from '../../types';",
  "import { ContaBancaria, PlanoDeConta, Fornecedor, CentroDeCusto } from '../../types';"
);

code = code.replace(
  "const [planosContas, setPlanosContas] = useState<PlanoDeConta[]>([]);",
  "const [planosContas, setPlanosContas] = useState<PlanoDeConta[]>([]);\n  const [centrosCusto, setCentrosCusto] = useState<CentroDeCusto[]>([]);"
);

code = code.replace(
  "const [editingPlano, setEditingPlano] = useState<PlanoDeConta | null>(null);",
  "const [editingPlano, setEditingPlano] = useState<PlanoDeConta | null>(null);\n  const [editingCentro, setEditingCentro] = useState<CentroDeCusto | null>(null);"
);

code = code.replace(
  "const [planoForm, setPlanoForm] = useState<Partial<PlanoDeConta>>({",
  "const [centroForm, setCentroForm] = useState<Partial<CentroDeCusto>>({\n    nome: '',\n    empresaId: 'Todos',\n    status: 'ativo'\n  });\n\n  const [planoForm, setPlanoForm] = useState<Partial<PlanoDeConta>>({"
);

fs.writeFileSync('src/components/finance/FinanceConfig.tsx', code);
