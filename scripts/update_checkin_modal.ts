import * as fs from 'fs';

const file = 'C:/Users/Akio/Documents/mexicano/src/components/ClientCheckinModal.tsx';
let txt = fs.readFileSync(file, 'utf8');

// 1. Add states for allowed checkin bounds
txt = txt.replace(/const \[previsaoSaida, setPrevisaoSaida\] = useState\('09:00'\);\r?\n\s*const \[previsaoChegada, setPrevisaoChegada\] = useState\('17:00'\);/, `const [previsaoSaida, setPrevisaoSaida] = useState('09:00');
  const [previsaoChegada, setPrevisaoChegada] = useState('17:00');
  const [limiteSaida, setLimiteSaida] = useState('00:00');
  const [limiteChegada, setLimiteChegada] = useState('23:59');`);

// 2. Fetch logic: update limiteSaida and limiteChegada
const configFetchRegex = /if \(schedule && schedule\[String\(dayOfWeek\)\]\) {[\s\S]*?\} else \{[\s\S]*?\}/;
const configFetchReplacement = `if (schedule && schedule[String(dayOfWeek)]) {
            const dayConfig = schedule[String(dayOfWeek)];
            if (dayConfig.checkinSaida) {
              setPrevisaoSaida(dayConfig.checkinSaida);
              setLimiteSaida(dayConfig.checkinSaida);
            }
            if (dayConfig.checkinChegada) {
              setPrevisaoChegada(dayConfig.checkinChegada);
              setLimiteChegada(dayConfig.checkinChegada);
            }
          } else {
            // Fallback defaults: weekdays 09-17, weekends 09-19
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            setPrevisaoSaida('09:00');
            setLimiteSaida('09:00');
            setPrevisaoChegada(isWeekend ? '19:00' : '17:00');
            setLimiteChegada(isWeekend ? '19:00' : '17:00');
          }`;
txt = txt.replace(configFetchRegex, configFetchReplacement);

// 3. Fallback error catch logic update
const fallbackErrorRegex = /\.catch\(\(\) => \{[\s\S]*?\}\);/;
const fallbackErrorReplacement = `.catch(() => {
          // Fallback on error
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          setPrevisaoSaida('09:00');
          setLimiteSaida('09:00');
          setPrevisaoChegada(isWeekend ? '19:00' : '17:00');
          setLimiteChegada(isWeekend ? '19:00' : '17:00');
        });`;
txt = txt.replace(fallbackErrorRegex, fallbackErrorReplacement);

// 4. Reset limits on open
const resetRegex = /setPrevisaoChegada\('17:00'\);\r?\n\s*\}\r?\n\s*if/; // Wait, these are not reset in useEffect. Let's reset them in useEffect next to setStep(1).
const useEffResetRegex = /setTakeChurrasqueira\(false\);\r?\n\s*setQtdBancos\(0\);/;
txt = txt.replace(useEffResetRegex, `setTakeChurrasqueira(false);
      setQtdBancos(0);
      setLimiteSaida('00:00');
      setLimiteChegada('23:59');`);

// 5. Validation in handleNext
const handleNextRegex = /if \(step === 1 && previsaoSaida\) \{([\s\S]*?)setStep\(prev => prev \+ 1\);/m;
const handleNextReplace = `if (step === 1 && previsaoSaida) {
      if (previsaoSaida < limiteSaida || previsaoSaida > limiteChegada) {
        setErrorMsg(\`Horário de saída inválido. A marina opera das \${limiteSaida} às \${limiteChegada} neste dia.\`);
        return;
      }
      
      if (previsaoChegada && (previsaoChegada < limiteSaida || previsaoChegada > limiteChegada)) {
        setErrorMsg(\`Horário de retorno inválido. O limite de chegada para este dia é \${limiteChegada}.\`);
        return;
      }

      if (previsaoChegada && previsaoSaida >= previsaoChegada) {
        setErrorMsg('O horário de retorno deve ser posterior ao horário de saída.');
        return;
      }
$1setStep(prev => prev + 1);`;
txt = txt.replace(handleNextRegex, handleNextReplace);

fs.writeFileSync(file, txt);
console.log('Fixed ClientCheckinModal.tsx');
