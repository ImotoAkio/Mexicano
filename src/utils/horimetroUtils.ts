import { Embarcacao, Manutencao, ConfiguracaoHorimetro } from '../types';
export type { ConfiguracaoHorimetro };
export type { ConfiguracaoHorimetro };

export const DEFAULT_HORIMETRO_SETTINGS: ConfiguracaoHorimetro = {
  intervaloPadraoLancha: 50,
  intervaloPadraoJet: 50,
  intervalosPorModeloJet: {
    'WAKE 170': 50,
    'VX 1100': 50,
    'RXT 300': 25,
    'GTX 230': 50,
    'GTI 130': 50
  }
};

export const STORAGE_KEY_HORIMETRO = 'horimetro_settings';

export function getHorimetroSettings(): ConfiguracaoHorimetro {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_HORIMETRO);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        intervaloPadraoLancha: Number(parsed.intervaloPadraoLancha) || DEFAULT_HORIMETRO_SETTINGS.intervaloPadraoLancha,
        intervaloPadraoJet: Number(parsed.intervaloPadraoJet) || DEFAULT_HORIMETRO_SETTINGS.intervaloPadraoJet,
        intervalosPorModeloJet: {
          ...DEFAULT_HORIMETRO_SETTINGS.intervalosPorModeloJet,
          ...(parsed.intervalosPorModeloJet || {})
        }
      };
    }
  } catch (err) {
    console.warn('Erro ao carregar configurações de horímetro:', err);
  }
  return DEFAULT_HORIMETRO_SETTINGS;
}

export function saveHorimetroSettings(settings: ConfiguracaoHorimetro): void {
  try {
    localStorage.setItem(STORAGE_KEY_HORIMETRO, JSON.stringify(settings));
    window.dispatchEvent(new Event('horimetro_settings_updated'));
  } catch (err) {
    console.error('Erro ao salvar configurações de horímetro:', err);
  }
}

export function getIntervaloRevisao(boat: Embarcacao, settings?: ConfiguracaoHorimetro): number {
  const currentSettings = settings || getHorimetroSettings();

  if (boat.tipo === 'lancha') {
    return currentSettings.intervaloPadraoLancha || 50;
  }

  // Jet Ski logic: Check model override
  const boatModeloNorm = (boat.modelo || '').trim().toLowerCase();
  const jetModels = currentSettings.intervalosPorModeloJet || {};

  for (const [modelKey, hours] of Object.entries(jetModels)) {
    if (modelKey.trim().toLowerCase() === boatModeloNorm) {
      return Number(hours) || currentSettings.intervaloPadraoJet || 50;
    }
  }

  return currentSettings.intervaloPadraoJet || 50;
}

export interface StatusRevisaoInfo {
  intervalo: number;
  horasBase: number;
  horasMotorAtual: number;
  horasRodadas: number;
  proximaRevisaoHoras: number;
  horasRestantes: number;
  status: 'vencido' | 'proximo' | 'ok';
  dataUltimaManutencao?: string;
}

export function calcularStatusRevisao(
  boat: Embarcacao,
  manutencoes: Manutencao[],
  settings?: ConfiguracaoHorimetro
): StatusRevisaoInfo {
  const intervalo = getIntervaloRevisao(boat, settings);
  
  // Find completed maintenances for this boat sorted by date desc
  const completedMaint = manutencoes
    .filter(m => m.embarcacaoId === boat.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const horasBase = completedMaint?.horasMotorAtual ?? boat.horasUltimaManutencao ?? 0;
  const horasMotorAtual = boat.horasMotor || 0;
  const horasRodadas = Math.max(0, horasMotorAtual - horasBase);
  
  // Calculate next revision engine hours target
  const proximaRevisaoHoras = completedMaint?.proximaRevisaoHoras ?? (horasBase + intervalo);
  const horasRestantes = proximaRevisaoHoras - horasMotorAtual;

  let status: 'vencido' | 'proximo' | 'ok' = 'ok';
  if (horasMotorAtual >= proximaRevisaoHoras || (horasRodadas >= intervalo && intervalo > 0)) {
    status = 'vencido';
  } else if (horasRestantes <= 10) {
    status = 'proximo';
  }

  return {
    intervalo,
    horasBase,
    horasMotorAtual,
    horasRodadas,
    proximaRevisaoHoras,
    horasRestantes,
    status,
    dataUltimaManutencao: completedMaint?.createdAt
  };
}
