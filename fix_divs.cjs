const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceLancamentos.tsx', 'utf8');

// There is a spot where `{isModalOpen` is preceded by too few or too many `</div>`.
// Our build script did:
// const tablePart = `
//         ...
//       </div>
//     </div>
// `;
//
// Let's replace:
//       </div>
//     </div>
//
// {isModalOpen && (
//
// With:
//
// {isModalOpen && (
//
// And then closing the container at the end.

// Let's first rollback to the just generated state, by re-running the generator script.
