const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentos.tsx', 'utf8');

// Find where {activeTab === 'agenda' and slice it off. The component should end after the closing tags of the previous div.
const ptrAgenda = code.indexOf("{activeTab === 'agenda'");
if (ptrAgenda > -1) {
  code = code.substring(0, ptrAgenda);
  // Add closing tags for the main layout component.
  code += `\n    </div>\n  </div>\n  );\n}`;
}

// Remove the import of FinanceDashboard, FinanceKanban, FinanceConfig since they are not used anymore
code = code.replace(/import FinanceDashboard.*/, '');
code = code.replace(/import FinanceKanban.*/, '');
code = code.replace(/import FinanceConfig.*/, '');


fs.writeFileSync('src/components/finance/FinanceLancamentos.tsx', code);
