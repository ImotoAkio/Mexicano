import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminToken } from '../db';
import { Cliente, Embarcacao, Chamado } from '../types';

export function useDbMutations() {
  const queryClient = useQueryClient();

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['db_pull'] });
  };

  const genericSave = async ({ endpoint, type, action, data }: any) => {
    const token = getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body = type ? { type, action, data } : { action, data };
    const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Falha ${action} no backend`);
    return res.json();
  };

  // CLIENTS
  const createClient = useMutation({
    mutationFn: (data: Cliente) => genericSave({ endpoint: '/api/db/save', type: 'clients', action: 'create', data }),
    onSuccess: handleSuccess
  });
  const updateClient = useMutation({
    mutationFn: (data: Partial<Cliente>) => genericSave({ endpoint: '/api/db/save', type: 'clients', action: 'update', data }),
    onSuccess: handleSuccess
  });
  const deleteClient = useMutation({
    mutationFn: (id: string) => genericSave({ endpoint: '/api/db/save', type: 'clients', action: 'delete', data: { id } }),
    onSuccess: handleSuccess
  });

  // BOATS 
  const createBoat = useMutation({
    mutationFn: (data: Embarcacao) => genericSave({ endpoint: '/api/db/save', type: 'boats', action: 'create', data }),
    onSuccess: handleSuccess
  });
  const updateBoat = useMutation({
    mutationFn: (data: Partial<Embarcacao>) => genericSave({ endpoint: '/api/db/save', type: 'boats', action: 'update', data }),
    onSuccess: handleSuccess
  });
  const deleteBoat = useMutation({
    mutationFn: (id: string) => genericSave({ endpoint: '/api/db/save', type: 'boats', action: 'delete', data: { id } }),
    onSuccess: handleSuccess
  });

  return {
    createClient: createClient.mutateAsync,
    updateClient: updateClient.mutateAsync,
    deleteClient: deleteClient.mutateAsync,
    
    createBoat: createBoat.mutateAsync,
    updateBoat: updateBoat.mutateAsync,
    deleteBoat: deleteBoat.mutateAsync,
  };
}
