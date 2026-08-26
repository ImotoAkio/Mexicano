/**
 * Utilitário para upload de fotos de checklist via API.
 * Envia a imagem para /api/upload/checklist-image e retorna a URL pública.
 */
export async function uploadPhotoToStorage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

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
