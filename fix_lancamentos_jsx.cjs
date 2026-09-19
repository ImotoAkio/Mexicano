const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentos.tsx', 'utf8');

// Replace the residual `)}` from `activeTab === 'lancamentos'`
code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\)\}\s*\{\/\* Tab 2: Agenda de Saídas \*\/\}\s*<\/div>\s*<\/div>\s*\);\s*\}/,
`</div>
  </div>
</div>
</div>
);
}`);

fs.writeFileSync('src/components/finance/FinanceLancamentos.tsx', code);
