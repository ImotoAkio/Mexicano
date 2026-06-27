import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Upload, Plus, FolderPlus, Download, Trash2, Search, ArrowLeft, Users } from 'lucide-react';

interface DriveFolder {
  id: string;
  name: string;
  parentId: string | null;
  clienteId?: string | null;
}

interface DriveFile {
  id: string;
  folderId: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  clienteId?: string | null;
  createdAt: string;
}

interface InternalDriveProps {
  forcedClienteId?: string;
}

export default function InternalDrive({ forcedClienteId }: InternalDriveProps = {}) {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(forcedClienteId || null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDriveItems = async () => {
    const token = localStorage.getItem('admin_token');
    try {
      let foldersUrl = '/api/drive/folders';
      let filesUrl = '/api/drive/files';
      if (selectedClientId) {
        foldersUrl += `?clienteId=${selectedClientId}`;
        filesUrl += `?clienteId=${selectedClientId}`;
      }
      
      const [resFolders, resFiles] = await Promise.all([
        fetch(foldersUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(filesUrl, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (resFolders.ok && resFiles.ok) {
        const dataFolders = await resFolders.json();
        const dataFiles = await resFiles.json();
        setFolders(dataFolders.folders);
        setFiles(dataFiles.files);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClients = async () => {
    if (forcedClienteId) return;
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/db/pull', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.clientes) {
          setClients(data.clientes);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDriveItems();
    setCurrentFolderId(null);
  }, [selectedClientId]);

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/drive/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolderId, clienteId: selectedClientId })
      });
      
      if (res.ok) {
        setNewFolderName('');
        setIsCreatingFolder(false);
        fetchDriveItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const token = localStorage.getItem('admin_token');
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) {
      formData.append('folderId', currentFolderId);
    }
    if (selectedClientId) {
      formData.append('clienteId', selectedClientId);
    }

    try {
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        fetchDriveItems();
      } else {
        alert('Erro no upload.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o arquivo "${name}"?`)) return;
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`/api/drive/file/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchDriveItems();
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja apagar a pasta "${name}" e TODO o seu conteúdo?`)) return;
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`/api/drive/folder/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (currentFolderId === id) setCurrentFolderId(null);
        fetchDriveItems();
      }
    } catch(err) {
      console.error(err);
    }
  };

  const currentFolders = folders.filter(f => f.parentId === currentFolderId && f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentFiles = files.filter(f => f.folderId === currentFolderId && f.originalName.toLowerCase().includes(searchTerm.toLowerCase()));

  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

  const handleNavigateUp = () => {
    if (currentFolder) {
      setCurrentFolderId(currentFolder.parentId);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentFolderId && (
            <button onClick={handleNavigateUp} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-600" />
            {currentFolderId ? currentFolder?.name : (selectedClientId ? 'Documentos do Cliente' : 'Drive Compartilhado')}
          </h3>
          
          {!forcedClienteId && !currentFolderId && (
            <div className="ml-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <select
                value={selectedClientId || ''}
                onChange={(e) => setSelectedClientId(e.target.value || null)}
                className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Drive Global (Todos)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            />
          </div>
          <button 
            onClick={() => setIsCreatingFolder(true)}
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors tooltip"
            title="Nova Pasta"
          >
            <FolderPlus className="w-5 h-5" />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isUploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </button>
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        </div>
      </div>

      {isCreatingFolder && (
        <form onSubmit={handleCreateFolder} className="p-4 bg-white border-b border-slate-200 flex gap-2 animate-in slide-in-from-top-2 duration-200">
          <input
            type="text"
            autoFocus
            placeholder="Nome da pasta"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">Criar</button>
          <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">Cancelar</button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {currentFolders.length === 0 && currentFiles.length === 0 && !searchTerm && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Folder className="w-12 h-12 mb-2 opacity-50" />
            <p>Esta pasta está vazia</p>
          </div>
        )}

        {currentFolders.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pastas</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {currentFolders.map(folder => (
                <div 
                  key={folder.id} 
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Folder className="w-6 h-6 text-indigo-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 truncate">{folder.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Excluir Pasta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentFiles.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Arquivos</h4>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Tamanho</th>
                    <th className="px-4 py-3">Enviado por</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentFiles.map(file => (
                    <tr key={file.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[200px] sm:max-w-[300px]" title={file.originalName}>
                          {file.originalName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatSize(file.size)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{file.uploadedBy}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-1">
                        <a 
                          href={`/uploads/drive/${file.filename}`}
                          download={file.originalName}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.id, file.originalName)}
                          className="inline-flex p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir Arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
