const fs = require('fs');
const filepath = 'src/components/finance/FinanceFluxoCaixa.tsx';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
/const refMonth = String\(monthPart\)\.padStart\(2, '0'\) \+ '\/' \+ yearPart;\s*const indexStr = `\$\{i \+ 1\}\/\$\{periodMonths\}`;[\s\S]*?descricao: `\$\{formData\.descricao \? formData\.descricao \+ ' \| ' : ''\}Ref: \$\{refMonth\} \(\$\{indexStr\}\)`,[\s\S]*?createdAt: nowStr\s*\});/g,
`const refMonth = String(monthPart).padStart(2, '0') + '/' + yearPart;
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mName = monthNames[monthPart - 1] || String(monthPart).padStart(2, '0');
        const indexStr = \`\${i + 1} de \${periodMonths}\`;

        generated.push({
          ...formData,
          id: \`fin_\${Date.now()}_\${i}\`,
          dataVencimento: dueDate,
          descricao: \`\${formData.descricao ? formData.descricao + ' - ' : 'Mensalidade - '}\${mName}/\${yearPart} (Parcela \${indexStr})\`,
          createdAt: nowStr
        });`
);

content = content.replace(
/descricao: `\$\{formData\.descricao \? formData\.descricao \+ ' \| ' : ''\}Parcela \$\{i \+ 1\}\/\$\{totalParcelas\}`/g,
"descricao: `${formData.descricao ? formData.descricao + ' - ' : ''}Parcela ${i + 1} de ${totalParcelas}`"
);

fs.writeFileSync(filepath, content);
console.log("Patched successfully");
