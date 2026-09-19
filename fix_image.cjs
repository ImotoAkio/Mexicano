const fs = require('fs');
const filepath = 'src/components/WhatsAppPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const oldImageGen = `      // Generate image for client debit statement card
      let base64Image: string | null = null;
      try {
        const captureEl = document.getElementById(\`bloqueio-invoice-capture-\${client.id}\`);
        if (captureEl) {
          base64Image = await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true });
        }
      } catch (imgErr) {
        console.warn('Erro ao gerar imagem do extrato de débito:', imgErr);
      }`;

const oldRegex = /\s*\/\/ Generate image for client debit statement card[\s\S]*?console\.warn\('Erro ao gerar imagem do extrato de débito:', imgErr\);\s*\}/;

const newImageGen = `
      // Generate image for client debit statement card
      let base64Image: string | null = null;
      try {
        const captureEl = document.getElementById(\`bloqueio-invoice-capture-\${client.id}\`);
        if (captureEl) {
          // Aguarda um pequeno instante para o DOM estar pronto e as fontes/background renderizarem
          await new Promise(r => setTimeout(r, 250));
          try {
            base64Image = await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true, cacheBust: true });
          } catch (e1) {
            console.warn('Retentando gerar imagem do extrato de débito...');
            await new Promise(r => setTimeout(r, 600));
            base64Image = await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 1.5, skipFonts: true, cacheBust: true });
          }
        }
      } catch (imgErr) {
        console.warn('Erro fatal ao gerar imagem do extrato de débito:', imgErr);
      }`;

content = content.replace(oldRegex, newImageGen);
fs.writeFileSync(filepath, content);
