const fs = require('fs');

const p = 'src/components/finance/TransactionDetailsModal.tsx';
let txt = fs.readFileSync(p, 'utf8');

const oldEffect = `  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file && !isUploading) {
            const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
            onUploadReceipt(fakeEvent);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onUploadReceipt, isUploading]);`;

const newEffect = `  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData || (window as any).clipboardData;
      if (!clipboardData) return;
      
      const files = clipboardData.files;
      const items = clipboardData.items;
      
      let fileToUpload: File | null = null;
      
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.indexOf('image') !== -1 || files[i].type.indexOf('pdf') !== -1) {
            fileToUpload = files[i];
            break;
          }
        }
      } else if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('pdf') !== -1) {
            fileToUpload = items[i].getAsFile();
            break;
          }
        }
      }

      if (fileToUpload && !isUploading) {
        e.preventDefault();
        e.stopPropagation();
        const fakeEvent = { target: { files: [fileToUpload] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        onUploadReceipt(fakeEvent);
      }
    };
    
    // Anexando ao documento inteiro na fase de captura para não perder o evento
    document.addEventListener('paste', handlePaste, true);
    return () => document.removeEventListener('paste', handlePaste, true);
  }, [onUploadReceipt, isUploading]);`;

txt = txt.replace(oldEffect, newEffect);

fs.writeFileSync(p, txt, 'utf8');
