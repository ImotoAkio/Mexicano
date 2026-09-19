const fs = require('fs');
let code = fs.readFileSync('src/components/WhatsAppPage.tsx', 'utf8');

const extratoHelpers = `
  const generateExtratoBase64 = async (clientId: string) => {
    const captureEl = document.getElementById(\`extrato-invoice-capture-\${clientId}\`) || document.getElementById(\`bloqueio-invoice-capture-\${clientId}\`);
    if (!captureEl) throw new Error("Elemento de extrato não encontrado");
    
    // Mostra brevemente se estiver escondido (necessário pro dom-to-image em alguns casos, mas ele tá num fixed offscreen)
    await new Promise(r => setTimeout(r, 200));

    try {
      // @ts-ignore
      return await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true, cacheBust: true });
    } catch(e) {
      await new Promise(r => setTimeout(r, 600));
      // @ts-ignore
      return await toPng(captureEl, { backgroundColor: '#ffffff', pixelRatio: 1.5, skipFonts: true, cacheBust: true });
    }
  };

  const handleGenerateExtratoPreview = async (clientId: string) => {
    setExtratoGenerating(true);
    try {
      const b64 = await generateExtratoBase64(clientId);
      setExtratoPreviewImage(b64);
    } catch (err: any) {
      showToast("Erro ao gerar prévia da imagem.", "error");
    } finally {
      setExtratoGenerating(false);
    }
  };

  const handleDownloadExtratoNew = async (clientId: string, clientName: string) => {
    setExtratoGenerating(true);
    try {
      const base64Image = extratoPreviewImage || await generateExtratoBase64(clientId);
      const a = document.createElement('a');
      a.href = base64Image;
      a.download = \`Extrato_\${clientName.replace(/\s+/g, '_')}.png\`;
      a.click();
      showToast("Extrato baixado!", "success");
    } catch (err: any) {
      showToast("Falha ao baixar extrato.", "error");
    } finally {
      setExtratoGenerating(false);
    }
  };

  const generateExtratoText = (clientId: string): string => {
    const client = clientDB.getById(clientId);
    if (!client) return '';
    const unpaid = transacoes.filter(t => t.clienteId === clientId && t.status !== 'pago' && t.status !== 'cancelado');
    let text = \`Olá, *\${formatFirstName(client.nome)}*! Tudo bem? ⚓\n\n\`;
    text += \`Constam em nosso sistema as seguintes pendências financeiras vinculadas ao seu cadastro:\n\n\`;
    let totalGeral = 0;
    unpaid.forEach((t, i) => {
      const { interest, total } = calculateTransactionInterest(t);
      totalGeral += total;
      const catName = t.categoria ? t.categoria.replace('Servi??o', 'Serviço').replace('??', 'ç') : 'Lançamento';
      const desc = t.descricao ? \` - \${t.descricao}\` : '';
      const venc = t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : '-';
      text += \`🔸 *\${i+1}. \${catName}*\${desc}\n\`;
      text += \`Vencimento: \${venc}\n\`;
      text += \`Valor Orig.: R$ \${Number(t.valor).toFixed(2).replace('.', ',')}\`;
      if (interest > 0) {
        text += \` | Juros/Atraso: R$ \${interest.toFixed(2).replace('.', ',')}\`;
      }
      text += \`\n*_Total: R$ \${total.toFixed(2).replace('.', ',')}_*\n\n\`;
    });
    
    text += \`*Total Geral Pendente: R$ \${totalGeral.toFixed(2).replace('.', ',')}*\n\n\`;
    text += \`⚠ Sua embarcação/reserva se encontra bloqueada até a regularização.\n\n\`;
    text += \`Para efetuar o pagamento, utilize a nossa chave PIX:\n[ INSERIR CHAVE AQUI ]\n\n\`;
    text += \`Por favor, nos envie o comprovante assim que realizar o pagamento para liberarmos o seu acesso no sistema! 👍\`;
    return text;
  };

  const handleCopyExtratoText = async (clientId: string) => {
    try {
      const text = generateExtratoText(clientId);
      await navigator.clipboard.writeText(text);
      showToast("Texto copiado para a área de transferência!", "success");
    } catch (e) {
      showToast("Erro ao copiar texto.", "error");
    }
  };

  const handleCopyExtratoImage = async (clientId: string) => {
    setExtratoGenerating(true);
    try {
      const base64Image = extratoPreviewImage || await generateExtratoBase64(clientId);
      const res = await fetch(base64Image);
      const blob = await res.blob();
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      showToast("Imagem copiada para a área de transferência!", "success");
    } catch (err: any) {
      showToast("Seu navegador não suporta cópia direta de imagem. Tente Baixar a imagem.", "error");
    } finally {
      setExtratoGenerating(false);
    }
  };

  const handleSendWAExtrato = (clientId: string) => {
    const client = clientDB.getById(clientId);
    if (!client || !client.telefone) return showToast("Cliente sem telefone válido.", "error");
    const text = generateExtratoText(clientId);
    const wppNum = client.telefone.replace(/\D/g, '');
    const url = \`https://wa.me/55\${wppNum}?text=\${encodeURIComponent(text)}\`;
    window.open(url, '_blank');
  };

  const handleDownloadExtrato = async (clientId: string, clientName: string) => {
    // Mantendo compatibility original pro caso de outro lugar chamar (pouco provável)
    await handleDownloadExtratoNew(clientId, clientName);
  };
`;
// Replace the old handleDownloadExtrato function entirely
code = code.replace(/const handleDownloadExtrato\b[\s\S]*?(?=const handleToggleSelectClient)/, extratoHelpers);
fs.writeFileSync('src/components/WhatsAppPage.tsx', code);
console.log("Success replacing JS functions");
