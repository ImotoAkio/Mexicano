const fs = require('fs');

const p = 'src/components/finance/TransactionDetailsModal.tsx';
let txt = fs.readFileSync(p, 'utf8');

if (!txt.includes('handleDragOver')) {
  // Inject state and functions at the top of the component
  const hookInject = `
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
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
  }, [onUploadReceipt, isUploading]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf') && !isUploading) {
      const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      onUploadReceipt(fakeEvent);
    }
  };
`;

  txt = txt.replace('const [copiedLink, setCopiedLink] = React.useState(false);', hookInject);

  // Hook drag events to the Drawer container
  txt = txt.replace(
    'className="relative flex flex-col w-full max-w-md h-full bg-white shadow-2xl pointer-events-auto border-l border-black/[0.04] overflow-hidden animate-in slide-in-from-right duration-300" \n        onClick={e => e.stopPropagation()}',
    `className={\`relative flex flex-col w-full max-w-md h-full bg-white shadow-2xl pointer-events-auto border-l border-black/[0.04] overflow-hidden animate-in slide-in-from-right duration-300 \${isDragging ? 'ring-2 ring-inset ring-indigo-500 opacity-95' : ''}\`}
        onClick={e => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}`
  );
  
  // Also add a visual indicator inside the Image preview area to clarify Paste is accepted
  txt = txt.replace(
    '<span className="text-white font-bold text-[10px] shadow-sm">{hasComprovante ? \'Atualizar\' : \'Anexar Documento\'}</span>',
    '<span className="text-white font-bold text-[10px] shadow-sm">{hasComprovante ? \'Atualizar Comprovante\' : \'Anexar Documento\'}</span>\n                    <span className="text-white/80 font-medium text-[8px] mt-0.5">Clique, Cole (Ctrl+V) ou Arraste</span>'
  );

  // Increase the Upload Overlay visibility condition slightly for drag
  txt = txt.replace(
    'className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center transition-opacity ${hasComprovante ? \'opacity-0 group-hover:opacity-100\' : \'opacity-100\'} cursor-pointer`}',
    'className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center transition-opacity ${hasComprovante && !isDragging ? \'opacity-0 group-hover:opacity-100\' : \'opacity-100\'} cursor-pointer`}'
  );

  fs.writeFileSync(p, txt, 'utf8');
  console.log("Upload flow improved.");
}
