/**
 * Utilitário para compressão e upload de fotos de checklist via API.
 * Converte e redimensiona imagens no cliente para WebP (máx 1200px) com baixo uso de RAM,
 * enfileira envios com controle de concorrência e aplica timeout + retry com backoff exponencial.
 */

const MAX_DIMENSION = 1200;
const COMPRESS_THRESHOLD_BYTES = 80 * 1024; // 80KB
const MAX_CONCURRENT_UPLOADS = 3;
const UPLOAD_TIMEOUT_MS = 25000;
const RETRY_DELAYS_MS = [800, 2000];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Concurrency queue (semáforo) para evitar saturação do 4G/Wi-Fi quando
 * várias fotos são disparadas em sequência rápida.
 */
let activeUploads = 0;
const uploadQueue: Array<() => void> = [];

async function enqueueUpload<T>(task: () => Promise<T>): Promise<T> {
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    await new Promise<void>((resolve) => uploadQueue.push(resolve));
  }
  activeUploads++;
  try {
    return await task();
  } finally {
    activeUploads--;
    const next = uploadQueue.shift();
    if (next) next();
  }
}

function fitDimensions(width: number, height: number, maxDim = MAX_DIMENSION) {
  if (width <= maxDim && height <= maxDim) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }
  if (width >= height) {
    return {
      width: maxDim,
      height: Math.max(1, Math.round((height * maxDim) / width)),
    };
  }
  return {
    width: Math.max(1, Math.round((width * maxDim) / height)),
    height: maxDim,
  };
}

async function encodeCanvas(canvas: HTMLCanvasElement, quality = 0.78): Promise<Blob | null> {
  const webpBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/webp', quality);
  });

  if (webpBlob && webpBlob.type === 'image/webp') {
    return webpBlob;
  }

  // Fallback caso o navegador não suporte exportação WebP nativa via canvas
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
  });
}

async function compressImageClientSide(file: Blob): Promise<Blob> {
  // 1. Método moderno com createImageBitmap (respeita orientação EXIF e evita Base64)
  if (typeof createImageBitmap !== 'undefined') {
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      if (bitmap) {
        const { width, height } = fitDimensions(bitmap.width, bitmap.height);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
          bitmap = null;

          const compressedBlob = await encodeCanvas(canvas, 0.78);
          canvas.width = 1;
          canvas.height = 1;

          if (
            compressedBlob &&
            (compressedBlob.size < file.size || file.type !== 'image/webp')
          ) {
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
        try {
          (bitmap as ImageBitmap).close();
        } catch {
          // ignore
        }
      }
    }
  }

  // 2. Fallback usando URL.createObjectURL (leve em RAM comparado a FileReader)
  return new Promise((resolve) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        try {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          const { width, height } = fitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(file);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const blob = await encodeCanvas(canvas, 0.78);
          canvas.width = 1;
          canvas.height = 1;

          if (blob && (blob.size < file.size || file.type !== 'image/webp')) {
            resolve(blob);
          } else {
            resolve(file);
          }
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

/**
 * Comprime uma imagem para WebP (máx 1200px) para uso em upload ou preview otimizado.
 */
export async function compressPhotoForPreview(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/webp' && file.size <= COMPRESS_THRESHOLD_BYTES) return file;
  try {
    return await compressImageClientSide(file);
  } catch (e) {
    console.warn('Falha ao comprimir imagem para preview, mantendo original:', e);
    return file;
  }
}

function buildUploadFilename(input: File | Blob, finalBlob: Blob): string {
  const originalName = input instanceof File && input.name ? input.name : 'photo';
  const baseName = originalName.replace(/\.[^.]+$/, '') || 'photo';
  if (finalBlob.type === 'image/webp') return `${baseName}.webp`;
  if (finalBlob.type === 'image/jpeg') return `${baseName}.jpg`;
  return input instanceof File && input.name ? input.name : 'photo.jpg';
}

async function postChecklistImageWithTimeout(formData: FormData): Promise<string> {
  const token = localStorage.getItem('admin_token');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const res = await fetch('/api/upload/checklist-image', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      signal: controller.signal,
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Resposta inválida do servidor (${res.status})`);
    }

    if (!res.ok || !json?.success || !json?.imageUrl) {
      const err: any = new Error(json?.message || `Falha ao fazer upload da imagem (${res.status}).`);
      err.status = res.status;
      throw err;
    }

    return json.imageUrl;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadPhotoToStorage(file: File | Blob): Promise<string> {
  let finalBlob: Blob = file;

  // Evita recomprimir se já veio como Blob WebP pequeno ou já comprimido
  const isImage = !file.type || file.type.startsWith('image/');
  const alreadyOptimizedWebp = file.type === 'image/webp' && (!(file instanceof File) || file.size <= COMPRESS_THRESHOLD_BYTES);

  if (isImage && !alreadyOptimizedWebp && (file.size > COMPRESS_THRESHOLD_BYTES || file.type !== 'image/webp')) {
    try {
      finalBlob = await compressImageClientSide(file);
    } catch (e) {
      console.warn('Falha ao comprimir imagem, enviando original', e);
    }
  }

  const uploadFilename = buildUploadFilename(file, finalBlob);

  return enqueueUpload(async () => {
    const maxAttempts = 1 + RETRY_DELAYS_MS.length;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const formData = new FormData();
        formData.append('image', finalBlob, uploadFilename);
        return await postChecklistImageWithTimeout(formData);
      } catch (err: any) {
        lastError = err;
        // Não tentar novamente em erros definitivos de autenticação/payload inválido (400, 401, 403, 413, 415)
        const status = err?.status;
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
          throw err;
        }
        if (attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
    }

    throw lastError || new Error('Falha ao fazer upload da imagem.');
  });
}
