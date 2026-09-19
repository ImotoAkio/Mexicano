const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentos.tsx', 'utf8');

const doubleEnd = `    </div>
  );
}

    </div>
  );
}`;

if (code.includes(doubleEnd)) {
  code = code.replace(doubleEnd, `    </div>\n  );\n}`);
  fs.writeFileSync('src/components/finance/FinanceLancamentos.tsx', code);
  console.log("Stripped double end.");
} else {
  console.log("Didn't find double end exactly as expected, let's just trim the last 4 lines");
  code = code.trim().split('\n').slice(0, -4).join('\n') + '\n';
  fs.writeFileSync('src/components/finance/FinanceLancamentos.tsx', code);
}
