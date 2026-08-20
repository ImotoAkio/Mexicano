import { Embarcacao } from '../types';

/**
 * Returns the standardized vessel code (Mxx, e.g., M03, M58, M99, M100).
 * Always prioritizes the boat code over its official document name for internal controls.
 */
export function getBoatCode(boat?: Partial<Embarcacao> | null | string): string {
  if (!boat) return 'N/A';
  if (typeof boat === 'string') {
    const clean = boat.trim().toUpperCase().replace(/^M/i, '');
    if (/^\d+$/.test(clean)) {
      return `M${clean.padStart(2, '0')}`;
    }
    return boat;
  }
  if (boat.numero) {
    const clean = String(boat.numero).trim().toUpperCase().replace(/^M/i, '');
    if (clean) {
      return `M${clean.padStart(2, '0')}`;
    }
  }
  if (boat.nome) {
    const match = boat.nome.match(/M\d+/i);
    if (match) return match[0].toUpperCase();
    return boat.nome;
  }
  return 'M--';
}

/**
 * Helper to format boat label for select options and displays.
 * Format: "Mxx (Modelo/Tipo)"
 */
export function getBoatLabel(boat?: Partial<Embarcacao> | null): string {
  if (!boat) return 'Embarcação N/A';
  const code = getBoatCode(boat);
  const spec = boat.modelo || (boat.tipo === 'jet' ? 'Jet Ski' : 'Lancha');
  return `${code} (${spec})`;
}
