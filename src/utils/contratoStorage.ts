/**
 * Upload de contratos assinados (Aquisição e Gestão Náutica).
 *
 * Envia o documento para POST /api/upload/contrato, que grava no mesmo bucket
 * Cloudflare R2 usado pelos checklists, isolado por prefixo:
 *   contratos/aquisicao/<clienteId>/<arquivo>
 *   contratos/gestao/<clienteId>/<arquivo>
 *
 * Importante: NÃO há fallback em base64. Um contrato em base64 seria gravado
 * dentro do registro do cliente e sincronizado com o banco remoto a cada
 * alteração, inflando o banco e a memória do app. Se o upload falhar, a
 * operação falha de forma explícita para o usuário tentar novamente.
 */

export type ContratoTipo = 'aquisicao' | 'adm';

export interface ContratoUploadResult {
  url: string;
  /** Chave do objeto no bucket (ex.: contratos/aquisicao/cli_123/20261015T182300_contrato.pdf) */
  key?: string;
  filename: string;
  size: number;
  mime?: string;
  tipo?: string;
  storage: 'r2' | 'local';
}

export const CONTRATO_MAX_BYTES = 20 * 1024 * 1024;
export const CONTRATO_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*';

const ALLOWED_EXT = /\.(pdf|jpe?g|png|webp|heic|heif)$/i;

export class ContratoUploadError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ContratoUploadError';
  }
}

/** Validação rápida no navegador, antes de gastar banda com o envio. */
export function validateContratoFile(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImage = file.type.startsWith('image/') || ALLOWED_EXT.test(file.name);
  if (!isPdf && !isImage) {
    return 'Formato não suportado. Envie o contrato em PDF ou foto (JPG, PNG, WEBP, HEIC).';
  }
  if (file.size === 0) {
    return 'O arquivo está vazio.';
  }
  if (file.size > CONTRATO_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `O arquivo tem ${mb} MB e excede o limite de ${CONTRATO_MAX_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

function messageForStatus(status: number, serverMessage?: string): string {
  if (serverMessage) return serverMessage;
  switch (status) {
    case 0: return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    case 401: return 'Sua sessão expirou. Faça login novamente para enviar o contrato.';
    case 403: return 'Seu perfil não tem permissão para anexar contratos.';
    case 404: return 'Rota de upload de contratos indisponível. O servidor precisa ser reiniciado/atualizado.';
    case 413: return `Arquivo maior que o limite de ${CONTRATO_MAX_BYTES / 1024 / 1024} MB.`;
    case 415: return 'Formato de arquivo não suportado.';
    default: return `Falha ao enviar o contrato (erro ${status}).`;
  }
}

export function uploadContratoToStorage(
  file: File,
  tipo: ContratoTipo,
  clienteId: string,
  onProgress?: (percent: number) => void
): Promise<ContratoUploadResult> {
  const validationError = validateContratoFile(file);
  if (validationError) {
    return Promise.reject(new ContratoUploadError(validationError, 400));
  }

  const formData = new FormData();
  formData.append('tipo', tipo);
  formData.append('clienteId', clienteId);
  // O arquivo vai por último para que os campos de texto já estejam disponíveis no multer
  formData.append('contrato', file, file.name);

  const token = localStorage.getItem('admin_token');

  // XMLHttpRequest (e não fetch) para reportar progresso de envio em arquivos grandes
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload/contrato');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 120_000;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        // Reserva os últimos 5% para o processamento/gravação no bucket
        onProgress(Math.min(95, Math.round((e.loaded / e.total) * 95)));
      }
    };

    xhr.onload = () => {
      let json: any = null;
      try { json = JSON.parse(xhr.responseText); } catch { /* resposta não-JSON */ }

      if (xhr.status >= 200 && xhr.status < 300 && json?.success && json.url) {
        onProgress?.(100);
        if (json.storage === 'local') {
          console.warn('[CONTRATO] Bucket R2 não configurado no servidor — arquivo salvo em disco local:', json.key);
        }
        resolve({
          url: json.url,
          key: json.key,
          filename: json.filename || file.name,
          size: json.size || file.size,
          mime: json.mime,
          tipo: json.tipo,
          storage: json.storage === 'local' ? 'local' : 'r2',
        });
        return;
      }
      reject(new ContratoUploadError(messageForStatus(xhr.status, json?.message), xhr.status));
    };

    xhr.onerror = () => reject(new ContratoUploadError(messageForStatus(0), 0));
    xhr.ontimeout = () => reject(new ContratoUploadError('O envio demorou demais e foi cancelado. Tente novamente.', 0));

    xhr.send(formData);
  });
}
