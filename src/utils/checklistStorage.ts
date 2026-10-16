/**
 * Utilitário para upload de fotos de checklist via API.
 * Envia a imagem para /api/upload/checklist-image e retorna a URL pública.
 * Compacta a imagem no cliente com consumo ultrabaixo de memória para evitar que o celular trave por falta de memória.
 */

async function compressImageClientSide(file: File): Promise<Blob> {
  const MAX_WIDTH = 1200;
  const MAX_HEIGHT = 1200;

  // 1. Método moderno com decode direto em resolução reduzida:
  // createImageBitmap com opções de redimensionamento evita decodificar fotos brutas de 50MP na RAM!
  if (typeof createImageBitmap !== 'undefined') {
    let bitmap: ImageBitmap | null = null;
    try {
      try {
        // Chromium no Android decodifica diretamente na resolução final, economizando 95% de memória RAM
        bitmap = await (createImageBitmap as any)(file, {
          resizeWidth: MAX_WIDTH,
          resizeQuality: 'medium',
        });
      } catch {
        // Fallback para navegadores que não suportam options em createImageBitmap
        bitmap = await createImageBitmap(file);
      }

      if (bitmap) {
        let { width, height } = bitmap;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
          bitmap = null;

          const compressedBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.72);
          });

          // Limpa dimensões do canvas para liberar buffer de GPU imediatamente
          canvas.width = 1;
          canvas.height = 1;

          if (compressedBlob && compressedBlob.size < file.size) {
            return compressedBlob;
          }
        } else {
          bitmap.close();
          bitmap = null;
        }
      }
    } catch (err) {
      console.warn('createImageBitmap falhou, usando fallback seguro:', err);
      if (bitmap) {
        try { (bitmap as ImageBitmap).close(); } catch {}
      }
    }
  }

  // 2. Fallback usando URL.createObjectURL (muito mais leve que FileReader.readAsDataURL)
  return new Promise((resolve) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(file);
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            canvas.width = 1;
            canvas.height = 1;
            if (blob && blob.size < file.size) resolve(blob);
            else resolve(file);
          }, 'image/jpeg', 0.75);
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(file);
    }
  });
}

export async function uploadPhotoToStorage(file: File): Promise<string> {
  let finalBlob: Blob = file;

  // Compactar se for imagem e maior que 200KB
  if (file.type.startsWith('image/') && file.size > 200 * 1024) {
    try {
      finalBlob = await compressImageClientSide(file);
    } catch (e) {
      console.warn("Falha ao comprimir imagem, enviando original", e);
    }
  }

  const formData = new FormData();
  formData.append('image', finalBlob, file.name || 'photo.jpg');

  const token = localStorage.getItem('admin_token');
  const res = await fetch('/api/upload/checklist-image', {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Falha ao fazer upload da imagem.');
  }

  return json.imageUrl;
}
