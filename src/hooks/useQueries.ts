import { useQuery } from '@tanstack/react-query';
import { getAdminToken } from '../db';
import { Cliente, Embarcacao, Reserva, Chamado, Manutencao, TipoManutencao, Funcionario, Folga, Mecanico, EpiEntrega, CatalogoEpi, HistoricoEPIMensal } from '../types';

async function fetchDbFromServer() {
  const token = getAdminToken();
  if (!token) throw new Error("Não autorizado");
  const res = await fetch('/api/db/pull', { 
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("API Db Pull Falhou");
  return res.json();
}

/** Hook global que traz tudo de uma vez. O refetchInterval substitui a necessidade do front de fazer mega syncs. */
export function useMegaDb() {
  return useQuery({
    queryKey: ['db_pull'],
    queryFn: fetchDbFromServer,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5, // Atualiza silenciosamente 
  });
}

// Selectors para os componentes
export function useClientsQuery(): Cliente[] {
  const { data } = useMegaDb();
  return data?.clients || [];
}

export function useBoatsQuery(): Embarcacao[] {
  const { data } = useMegaDb();
  return data?.boats || [];
}

export function useReservationsQuery(): Reserva[] {
  const { data } = useMegaDb();
  return data?.reservations || [];
}

export function useManutencoesQuery(): Manutencao[] {
  const { data } = useMegaDb();
  return data?.manutencoes || [];
}

export function useChamadosQuery(): Chamado[] {
  const { data } = useMegaDb();
  return data?.chamados || [];
}

export function useMecanicosQuery(): Mecanico[] {
  const { data } = useMegaDb();
  return data?.mecanicos || [];
}

export function useFuncionariosQuery(): Funcionario[] {
  const { data } = useMegaDb();
  return data?.funcionarios || [];
}

export function useFolgasQuery(): Folga[] {
  const { data } = useMegaDb();
  return data?.folgas || [];
}
