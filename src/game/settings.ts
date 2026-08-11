import type { Difficulty } from './state'

export type RaceTempo = 'slow' | 'normal' | 'fast'

export interface Settings {
  difficulty: Difficulty // dificultad por defecto para nuevas partidas
  tempo: RaceTempo // ritmo de la carrera a 1×
  radioPause: boolean // la radio del piloto pausa la carrera
  rivalDots: boolean // mostrar rivales en el minimapa
}

const KEY = 'apex-settings-v1'

const DEFAULTS: Settings = { difficulty: 'normal', tempo: 'normal', radioPause: true, rivalDots: true }

/** Milisegundos por vuelta a 1× según el ritmo elegido. */
export const TEMPO_MS: Record<RaceTempo, number> = { slow: 3200, normal: 2200, fast: 1500 }
export const TEMPO_LABEL: Record<RaceTempo, string> = { slow: 'Pausado', normal: 'Normal', fast: 'Rápido' }

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}
