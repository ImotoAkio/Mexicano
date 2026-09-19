const fs = require('fs');
const filePath = 'src/components/MarinaFuelView.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

code = code.replace(
  /\.\.\.\(chargeItem\?\.tipo_cliente === 'avulso' \? \[\] :/g,
  "...(chargeTargetItem?.isAvulso ? [] :"
);

const oldCalculationBox = `
{/* Total Calculation Display for Cobrar */}
{(() => {
  const chargeItemToUse = chargeItem || chargeTargetItem;
  const l = chargeItemToUse ? chargeItemToUse.litros : 0;
  const p = getFuelPrice(chargePaymentType);
  const tot = l * p;
  return (
    <div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-200/60 rounded-3xl flex items-center justify-between transition-all mt-4 mb-4">
      <div className="text-xs">
        <span className="text-slate-500 font-semibold uppercase tracking-widest text-[9px]">Valor do Abastecimento</span>
        <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
          {l.toFixed(1)}L x R$ {p.toFixed(2)}/L
        </span>
      </div>
      <span className="text-xl tracking-tight font-black font-mono text-blue-950">
        {tot.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  );
})()}`;

const newCalculationBox = `
{/* Total Calculation Display for Cobrar */}
<div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-200/60 rounded-3xl flex items-center justify-between transition-all mt-4 mb-4">
  <div className="text-xs">
    <span className="text-slate-500 font-semibold uppercase tracking-widest text-[9px]">Valor do Abastecimento</span>
    <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
      {litrosNum.toFixed(1)}L x R$ {preco.toFixed(2)}/L
    </span>
  </div>
  <span className="text-xl tracking-tight font-black font-mono text-blue-950">
    {totalCalc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
  </span>
</div>`;

// Simple string replacement if the exact block is there
if (code.includes('chargeItemToUse = chargeItem || chargeTargetItem')) {
  // It's a bit multi-line, let's use a regex that matches the start and end
  const pattern = /\{\/\* Total Calculation Display for Cobrar \*\/\}[\s\S]*?\{\(\(\) => \{[\s\S]*?chargeItemToUse = chargeItem \|\| chargeTargetItem;[\s\S]*?\}\)\(\)\}/g;
  code = code.replace(pattern, newCalculationBox);
}

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Fixed chargeItem references!');
