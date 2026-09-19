const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'finance', 'FinanceLancamentos.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
  "import ImportXMLModal from './ImportXMLModal';",
  "import ImportXMLModal from './ImportXMLModal';\nimport FinanceLancamentoDrawer from './FinanceLancamentoDrawer';"
);

// 2. States
content = content.replace(
  "const [planosContas, setPlanosContas] = useState<any[]>([]);",
  "const [planosContas, setPlanosContas] = useState<any[]>([]);\n  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);"
);

content = content.replace(/const \[recorrenciaMode, setRecorrenciaMode\][^;]+;\n/g, "");
content = content.replace(/const \[qtdParcelas, setQtdParcelas\][^;]+;\n/g, "");
content = content.replace(/const \[formData, setFormData\] = useState<Partial<TransacaoFinanceira>>\([\s\S]*?\}\);\n/g, "");
content = content.replace(/const \[isCustomCategoria, setIsCustomCategoria\][^;]+;\n/g, "");
content = content.replace(/const \[isPeriodMode, setIsPeriodMode\][^;]+;\n/g, "");
content = content.replace(/const \[periodMonths, setPeriodMonths\][^;]+;\n/g, "");
content = content.replace(/const \[periodStartMonth, setPeriodStartMonth\][^;]+;\n/g, "");
content = content.replace(/const \[periodDueDay, setPeriodDueDay\][^;]+;\n/g, "");

// 3. handleEdit
content = content.replace(
  /const handleEdit = \(item: TransacaoFinanceira\) => \{[\s\S]*?setIsModalOpen\(true\);\n  \};/,
  "const handleEdit = (item: TransacaoFinanceira) => {\n    setEditingItem(item);\n    setIsModalOpen(true);\n  };"
);

// 4. handleSave
const handleSaveRegex = /const handleSave = async \(e: React\.FormEvent\) => \{[\s\S]*?^  \};\n/m;
content = content.replace(handleSaveRegex, `const handleSaveLancamentos = async (novosLancamentos: Partial<TransacaoFinanceira>[]) => {
    setIsModalOpen(false);
    setEditingItem(null);
    const withIds = novosLancamentos.map(l => ({
      ...l, id: l.id || \`fin_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`, createdAt: l.createdAt || new Date().toISOString()
    }));

    setTransacoes(prev => {
      const updated = [...prev];
      withIds.forEach(newItem => {
        const idx = updated.findIndex(t => t.id === newItem.id);
        if (idx !== -1) updated[idx] = newItem as any;
        else updated.unshift(newItem as any);
      });
      return updated;
    });

    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/financeiro/transacoes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({ action: 'upsert', data: withIds })
      });
      fetchData();
    } catch(e) {
      console.error("Erro ao salvar lançamentos", e);
    }
  };
`);

// 5. fetchData
const fetchRegex = /const \[resContas, resPlanos, resForn\] = await Promise\.all\(\[([\s\S]*?)\]\);\s+if \(resContas\.ok\) setContasBancarias\(await resContas\.json\(\)\);\s+if \(resPlanos\.ok\) setPlanosContas\(await resPlanos\.json\(\)\);\s+if \(resForn\.ok\) setFornecedores\(await resForn\.json\(\)\);/m;
content = content.replace(fetchRegex, `const [resContas, resPlanos, resForn, resCentros] = await Promise.all([
          fetch('/api/financeiro/contas-bancarias', { headers: { 'Authorization': \`Bearer \${token}\` } }),
          fetch('/api/financeiro/planos-contas', { headers: { 'Authorization': \`Bearer \${token}\` } }),
          fetch('/api/financeiro/fornecedores', { headers: { 'Authorization': \`Bearer \${token}\` } }),
          fetch('/api/financeiro/centros-custo', { headers: { 'Authorization': \`Bearer \${token}\` } })
        ]);
        if (resContas.ok) setContasBancarias(await resContas.json());
        if (resPlanos.ok) setPlanosContas(await resPlanos.json());
        if (resForn.ok) setFornecedores(await resForn.json());
        if (resCentros.ok) setCentrosCusto(await resCentros.json());`);

// 6. JSX Modal Replacements
const startModalIndex = content.indexOf('{/* Modal de Lançamento */}');
if (startModalIndex !== -1) {
  let depth = 0;
  let endModalIndex = -1;
  let started = false;

  for (let i = startModalIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;

    if (content.substr(i, 13) === '{isModalOpen ') {
      started = true;
    }

    if (started && depth === 0) {
      // found end of JSX block
      endModalIndex = i + 1;
      break;
    }
  }

  if (endModalIndex !== -1) {
    const modalStr = content.substring(startModalIndex, endModalIndex);
    const replacementStr = `<FinanceLancamentoDrawer
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSave={handleSaveLancamentos}
        editingItem={editingItem}
        defaultEmpresa={empresaFiltro}
        planosContas={planosContas}
        centrosCusto={centrosCusto}
        clientes={clientes}
        fornecedores={fornecedores}
        contasBancarias={contasBancarias}
        embarcacoes={embarcacoes}
      />`;
    content = content.replace(modalStr, replacementStr);
  }
}

// 7. Add Novo Lançamento onClick change
content = content.replace(
  /onClick=\{\(\) => \{\n\s+setEditingItem\(null\);\n\s+setFormData\(\{[\s\S]*?\}\);\n\s+setIsModalOpen\(true\);\n\s+\}\}/m,
  "onClick={() => { setEditingItem(null); setIsModalOpen(true); }}"
);

content = content.replace(
  /const generateDueDateForMonth[\s\S]*?return \`\$\{year\}-\$\{String\(month\)\.padStart\(2, '0'\)\}-\$\{dayStr\}\`;\n\};/m,
  ""
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Done");
