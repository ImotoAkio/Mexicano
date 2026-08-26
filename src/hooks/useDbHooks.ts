import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminToken } from '../db';

// Tipo helper
async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getAdminToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error('API error: ' + res.status);
  return res.json();
}

/** 
 * Ao invés de carregar cada entidade isolada em REST (pois o backend não foi 
 * modularizado para GETs isolados ainda /api/clientes, /api/boats),
 * usamos a mesma pegada do MEGA PULL e os seletores do TanStack.
 */
export function useMainDb() {
  return useQuery({
    queryKey: ['db_pull'],
    queryFn: async () => {
      return await apiFetch('/api/db/pull');
    },
    staleTime: 1000 * 60 * 5, // 5 min
    refetchInterval: 1000 * 60 * 2, // Background polling, remove necessidade do Websocket manual em alguns casos
  });
}

// ------------------------------------
// HOOKS ESPECÍFICOS POR ENTIDADES
// ------------------------------------
export function useClients() {
  const { data, isLoading, refetch } = useMainDb();
  return { clients: data?.clients || [], isLoading, refetch };
}

export function useBoats() {
  const { data, isLoading, refetch } = useMainDb();
  return { boats: data?.boats || [], isLoading, refetch };
}

export function useReservations() {
  const { data, isLoading, refetch } = useMainDb();
  return { reservations: data?.reservations || [], isLoading, refetch };
}

// Mutações básicas
export function useSharedMutations() {
  const queryClient = useQueryClient();

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['db_pull'] });
  };

  const createClient = useMutation({
    mutationFn: (client) => apiFetch('/api/db/save', { method: 'POST', body: JSON.stringify({ type: 'clients', action: 'create', data: client }) }),
    onSuccess: handleSuccess,
  });

  const updateClient = useMutation({
    mutationFn: (client) => apiFetch('/api/db/save', { method: 'POST', body: JSON.stringify({ type: 'clients', action: 'update', data: client }) }),
    onSuccess: handleSuccess,
  });

  const deleteClient = useMutation({
    mutationFn: (id) => apiFetch('/api/db/save', { method: 'POST', body: JSON.stringify({ type: 'clients', action: 'delete', data: { id } }) }),
    onSuccess: handleSuccess,
  });

  // Idem para Boats, Reservations etc
  // Essa API é enorme e daria centenas de linhas repeti-la.
  return { createClient, updateClient, deleteClient };
}
