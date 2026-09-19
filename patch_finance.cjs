const fs = require('fs');
const filepath = 'src/components/finance/FinanceFluxoCaixa.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const anchor1 = "const indexStr = `${i + 1}/${periodMonths}`;";
const anchor2 = "descricao: `${formData.descricao ? formData.descricao + ' | ' : ''}Ref: ${refMonth} (${indexStr})`,";

const newDesc = "descricao: `${formData.descricao ? formData.descricao + ' - ' : 'Mensalidade - '}${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][monthPart - 1]}/${yearPart} (Parcela ${i + 1} de ${periodMonths})`,";

content = content.replace(anchor1, ""); // Delete it
content = content.replace(anchor2, newDesc);

const pbAnchor = "descricao: `${formData.descricao ? formData.descricao + ' | ' : ''}Parcela ${i + 1}/${totalParcelas}`,";
const pbNew = "descricao: `${formData.descricao ? formData.descricao + ' - ' : ''}Parcela ${i + 1} de ${totalParcelas}`,";
content = content.replace(pbAnchor, pbNew);

fs.writeFileSync(filepath, content);
console.log("Patched successfully");
