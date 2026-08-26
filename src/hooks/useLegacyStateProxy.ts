import { useClientsQuery, useBoatsQuery, useReservationsQuery, useManutencoesQuery, useChamadosQuery, useMecanicosQuery, useFolgasQuery, useFuncionariosQuery } from './useQueries';

// Fake setState to suppress type errors on legacy components
const noopSet = (val: any) => {};

export function useLegacyClientsProxy(): [any, any] {
  return [useClientsQuery(), noopSet];
}
export function useLegacyBoatsProxy(): [any, any] {
  return [useBoatsQuery(), noopSet];
}
export function useLegacyReservationsProxy(): [any, any] {
  return [useReservationsQuery(), noopSet];
}
export function useLegacyManutencoesProxy(): [any, any] {
  return [useManutencoesQuery(), noopSet];
}
export function useLegacyChamadosProxy(): [any, any] {
  return [useChamadosQuery(), noopSet];
}
export function useLegacyMecanicosProxy(): [any, any] {
  return [useMecanicosQuery(), noopSet];
}
export function useLegacyFolgasProxy(): [any, any] {
  return [useFolgasQuery(), noopSet];
}
export function useLegacyFuncionariosProxy(): [any, any] {
  return [useFuncionariosQuery(), noopSet];
}
