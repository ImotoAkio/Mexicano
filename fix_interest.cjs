const fs = require('fs');
let code = fs.readFileSync('src/components/WhatsAppPage.tsx', 'utf8');
const oldFuncRegex = /const calculateTransactionInterest = \(t: TransacaoFinanceira\) => \{[\s\S]*?(?=export default function WhatsAppPage\(\))/;

const newFunc = `const calculateTransactionInterest = (t: TransacaoFinanceira) => {
  const originalVal = Number(t.valor) || 0;
  if (t.status === 'pago' || !t.dataVencimento) {
    return { daysOverdue: 0, interest: 0, total: originalVal };
  }
  const [y, m, d] = t.dataVencimento.split('-').map(Number);
  const dueDate = new Date(y, m - 1, d);
  dueDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - dueDate.getTime();
  const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysOverdue <= 0) {
    return { daysOverdue: 0, interest: 0, total: originalVal };
  }

  const ratePerDay = 0.0007333; // 0.07333% ao dia (~2.2% ao mes)
  const interest = originalVal * ratePerDay * daysOverdue;
  return { daysOverdue, interest, total: originalVal + interest };
};

`;

code = code.replace(oldFuncRegex, newFunc);
fs.writeFileSync('src/components/WhatsAppPage.tsx', code);
console.log("Updated WhatsAppPage.tsx");
