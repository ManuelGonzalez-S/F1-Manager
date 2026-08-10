import type { TyreCompound, TyreModel } from './types'

export const TYRES: Record<TyreCompound, TyreModel> = {
  soft: { compound: 'soft', paceDelta: -0.7, baseLife: 14, cliff: 2.2 },
  medium: { compound: 'medium', paceDelta: 0.0, baseLife: 22, cliff: 1.4 },
  hard: { compound: 'hard', paceDelta: 0.6, baseLife: 34, cliff: 0.9 },
  wet: { compound: 'wet', paceDelta: 1.5, baseLife: 26, cliff: 1.2 },
}

/**
 * Penalización de tiempo por la interacción neumático/agua.
 * Los slicks se vuelven inconducibles con mucha agua (cuadrático);
 * el neumático de lluvia sobrecalienta y va lento en seco.
 */
export function weatherPenalty(compound: TyreCompound, wetness: number): number {
  if (compound === 'wet') {
    return Math.max(0, 0.4 - wetness) * 8
  }
  return wetness * wetness * 14
}

export const COMPOUND_LABEL: Record<TyreCompound, string> = {
  soft: 'Blando',
  medium: 'Medio',
  hard: 'Duro',
  wet: 'Lluvia',
}

export const COMPOUND_COLOR: Record<TyreCompound, string> = {
  soft: '#e23b3b',
  medium: '#e8c93a',
  hard: '#e8e8e8',
  wet: '#3a7fe8',
}

/** Letra corta para la insignia del neumático. */
export const COMPOUND_LETTER: Record<TyreCompound, string> = {
  soft: 'B',
  medium: 'M',
  hard: 'D',
  wet: 'L',
}

/** Color del texto sobre la insignia (según el fondo del compuesto). */
export const COMPOUND_TEXT: Record<TyreCompound, string> = {
  soft: '#ffffff',
  medium: '#1a1400',
  hard: '#0b0e13',
  wet: '#ffffff',
}
