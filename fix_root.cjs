const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentos.tsx', 'utf8');

// we inserted:
//       </div>
//     </div>
//
// {isModalOpen && (
//
// Let's replace that with just `</div>\n{isModalOpen` and then add a `</div>` at the very end.

code = code.replace(/      <\/div>\n    <\/div>\n\n\{isModalOpen && \(/, '      </div>\n\n{isModalOpen && (');

// Also need to make sure the END has the proper closing tag.
// It ends with:
//   );
// }
// Let's make it:
//     </div>
//   );
// }
code = code.replace(/  \);\n\}\n?$/, '    </div>\n  );\n}');

fs.writeFileSync('src/components/finance/FinanceLancamentos.tsx', code);
