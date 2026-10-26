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

/**
 * Helper to check if a boat (and optional reservation/client) matches a search query.
 * Correctly matches "m99", "99", "M03", "3", boat name, vaga, client name, etc.
 */
export function matchesBoatSearch(
  query: string,
  boat?: Partial<Embarcacao> | null | any,
  client?: any,
  reservation?: any
): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;

  // 1. Número limpo sem M (ex: "m99" -> "99", "m-99" -> "99", "99" -> "99")
  const qCleanNoM = q.replace(/^m[\s\-_]*/i, '');
  const isQNumeric = /^\d+$/.test(qCleanNoM);
  const qNumInt = isQNumeric ? parseInt(qCleanNoM, 10) : null;
  const qPad = isQNumeric ? `m${qCleanNoM.padStart(2, '0')}` : '';

  // 2. Código oficial da embarcação (ex: M99)
  const boatCode = getBoatCode(boat || reservation?.barcoNome || reservation?.embarcacaoId).toLowerCase();
  if (boatCode && boatCode !== 'n/a' && boatCode !== 'm--') {
    if (boatCode.includes(q)) return true;
    if (qPad && boatCode.includes(qPad)) return true;
    if (isQNumeric && boatCode.includes(qCleanNoM)) return true;
  }

  // 3. Número do barco
  const rawNum = String(boat?.numero || '').trim().toLowerCase().replace(/^m/i, '');
  const isBoatNumNumeric = /^\d+$/.test(rawNum);
  const boatNumInt = isBoatNumNumeric ? parseInt(rawNum, 10) : null;

  if (isQNumeric && isBoatNumNumeric && qNumInt !== null && boatNumInt !== null) {
    if (qNumInt === boatNumInt) return true;
  }
  if (rawNum) {
    if (rawNum.includes(q) || q.includes(rawNum)) return true;
    if (qCleanNoM && rawNum.includes(qCleanNoM)) return true;
    const boatCodeFormatted = `m${rawNum.padStart(2, '0')}`;
    if (boatCodeFormatted.includes(q) || q.includes(boatCodeFormatted)) return true;
  }

  // 4. Nome da embarcação / modelo / id
  const boatName = String(boat?.nome || reservation?.barcoNome || reservation?.embarcacaoNome || '').toLowerCase();
  if (boatName.includes(q)) return true;
  if (isQNumeric && boatName.includes(qCleanNoM)) return true;

  const boatModel = String(boat?.modelo || reservation?.modeloAvulso || '').toLowerCase();
  if (boatModel.includes(q)) return true;

  const boatId = String(boat?.id || reservation?.embarcacaoId || '').toLowerCase();
  if (boatId.includes(q) || (isQNumeric && boatId.includes(qCleanNoM))) return true;

  // 5. Vaga
  const boatVaga = String(boat?.vaga || reservation?.embarcacaoVaga || '').toLowerCase();
  if (boatVaga && (boatVaga.includes(q) || (isQNumeric && boatVaga.includes(qCleanNoM)))) return true;

  // 6. Nome do cliente
  const clientName = String(client?.nome || reservation?.clienteNome || reservation?.nomeAvulso || '').toLowerCase();
  if (clientName.includes(q)) return true;

  // 7. Observações
  const obs = String(reservation?.observacoes || reservation?.observacoesDescida || '').toLowerCase();
  if (obs.includes(q)) return true;

  return false;
}

/**
 * Checks if a boat matches a client reference (which can be a boat ID, boat code like 'M16', or boat name).
 */
export function matchClientBoat(rawRef?: string | null, boat?: Embarcacao | null): boolean {
  if (!rawRef || !boat) return false;
  const ref = rawRef.trim().toLowerCase();
  if (boat.id && boat.id.toLowerCase() === ref) return true;
  if (boat.nome && boat.nome.toLowerCase() === ref) return true;
  if (boat.numero && String(boat.numero).toLowerCase() === ref) return true;

  const boatCode = getBoatCode(boat).toLowerCase();
  const refCode = getBoatCode(rawRef).toLowerCase();
  if (boatCode && refCode && boatCode !== 'n/a' && refCode !== 'n/a' && boatCode !== 'm--' && refCode !== 'm--') {
    if (boatCode === refCode) return true;
  }
  return false;
}

/**
 * Returns all boat IDs that belong to a client based on primary embarcacaoId and multiple embarcacoes.
 */
export function getClientAllBoatIds(client?: any, boats: Embarcacao[] = []): Set<string> {
  const matched = new Set<string>();
  if (!client) return matched;

  const refs = [];
  if (client.embarcacaoId) refs.push(String(client.embarcacaoId));
  if (Array.isArray(client.embarcacoes)) {
    client.embarcacoes.forEach((eb) => {
      if (eb && eb.embarcacaoId) refs.push(String(eb.embarcacaoId));
    });
  }

  boats.forEach(b => {
    if (refs.some(ref => matchClientBoat(ref, b))) {
      matched.add(b.id);
    }
  });

  return matched;
}
