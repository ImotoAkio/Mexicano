import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminToken } from '../db';
import { Cliente, Embarcacao, Reserva, Manutencao, Chamado, Funcionario, Mecanico } from '../types';

async function fetchRemoteData() {
  const token = getAdminToken();
  if (!token) throw new Error("Sem autorização");
  
  const res = await fetch('/api/db/pull', { 
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export const useAppQuery = () => {
  return useQuery({
    queryKey: ['db_pull'],
    queryFn: fetchRemoteData,
    staleTime: 1000 * 60 * 3, // 3 minutes
    refetchInterval: 1000 * 60 * 5, // Background refetch every 5m
  });
};

export const useClients = () => {
  const { data, ...rest } = useAppQuery();
  return { clients: (data?.clients || []) as Cliente[], ...rest };
};

export const useBoats = () => {
  const { data, ...rest } = useAppQuery();
  return { boats: (data?.boats || []) as Embarcacao[], ...rest };
};

export const useReservations = () => {
  const { data, ...rest } = useAppQuery();
  return { reservations: (data?.reservations || []) as Reserva[], ...rest };
};

// Similar hooks for other entities
