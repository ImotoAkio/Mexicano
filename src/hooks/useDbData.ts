import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminToken } from '../db';

export function useDbData() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['db_pull'],
    queryFn: async () => {
      const token = getAdminToken();
      if (!token) throw new Error("Apenas administradores");
      const res = await fetch('/api/db/pull', { 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        } 
      });
      if (!res.ok) throw new Error('API pull failed');
      const json = await res.json();
      return json;
    },
    staleTime: 1000 * 60 * 3, // 3 minutos
    refetchInterval: 1000 * 60 * 5, // auto-atualiza a cada 5m
  });

  const mntServerCall = async (endpoint: string, action: string, type: string, payloadData: any) => {
    const token = getAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    // endpoints variam no sistema
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(
        // para action/types agregados
        type ? { type, action, data: payloadData } 
             : { action, data: payloadData }
      ),
    });
    if (!res.ok) throw new Error('Falha no Servidor BD');
    return res.json();
  };

  const inv = () => queryClient.invalidateQueries({ queryKey: ['db_pull'] });

  /** 
   * AVISO: Em vez de expor mutations soltas, exportaremos um objeto 
   * emulador igual a assinatura anterior, mas disparando Mutations!
   */

  const clients = data?.clients || [];
  const boats = data?.boats || [];
  const reservations = data?.reservations || [];
  const chamados = data?.chamados || [];
  const manutencoes = data?.manutencoes || [];
  const mecanicos = data?.mecanicos || [];
  const funcionarios = data?.funcionarios || [];
  const folgas = data?.folgas || [];
  
  return {
    isLoading,
    refetch,
    clients,
    boats,
    reservations,
    chamados,
    manutencoes,
    mecanicos,
    funcionarios,
    folgas,
    // Tipos de manutençao e EPIs
    tiposManutencao: data?.tiposManutencao || [],
    epis: data?.epis || [],
    catalogoEPIs: data?.catalogoEPIs || [],
    historicoEpis: data?.historicoEpis || [],
    registrosAtividades: data?.registrosAtividades || [],
    
    // A API emulada reativa será montada diretamente nos componentes onde precisarem
    // de metodos .create .update .delete 
  };
}
