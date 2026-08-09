import type { TyreCompound, TyreModel } from './types'

export const TYRES: Record<TyreCompound, TyreModel> = {
  soft: { compound: 'soft', paceDelta: -0.7, baseLife: 14, cliff: 2.2 },
  medium: { compound: 'medium', paceDelta: 0.0, baseLife: 22, cliff: 1.4 },
  hard: { compound: 'hard', paceDelta: 0.6, baseLife: 34, cliff: 0.9 },
  wet: { compound: 'wet', paceDelta: 3.5, baseLife: 26, cliff: 1.2 },
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
