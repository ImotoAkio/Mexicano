/**
 * Utilitário para upload de fotos de checklist via API.
 * Envia a imagem para /api/upload/checklist-image e retorna a URL pública.
 * Compacta a imagem no cliente para economizar banda do marinheiro.
 */

function compressImageClientSide(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // fallback se nao suportar
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(file); // fallback
        }, 'image/jpeg', 0.7);
      };
      img.onerror = () => resolve(file); // fallback em caso de erro na imagem
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
  });
}

export async function uploadPhotoToStorage(file: File): Promise<string> {
  let finalBlob: Blob = file;

  // Apenas compactar se for imagem (jpeg, png, etc) e for maior que 1MB
  // Mas no caso de celular, file.type geralmente é image/jpeg.
  if (file.type.startsWith('image/') && file.size > 500 * 1024) {
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
