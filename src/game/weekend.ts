import type { EntrantSetup, TyreCompound } from '../sim/types'
import { makeRng } from '../sim/engine'
import type { GameState } from './state'

/** Construye la parrilla: los 2 coches del jugador + los pilotos rivales persistentes. */
export function buildField(state: GameState, seed: number): EntrantSetup[] {
  const rng = makeRng(seed)
  const entrants: EntrantSetup[] = []
  const startTyre = (): TyreCompound => (rng() > 0.5 ? 'medium' : 'soft')

  // Coches del jugador
  state.drivers.forEach((d, i) => {
    entrants.push({
      id: d.id,
      name: d.name,
      team: state.teamName,
      isPlayer: true,
      driver: { pace: d.pace, consistency: d.consistency, tyreManagement: d.tyreManagement },
      car: { power: state.car.power, aero: state.car.aero, reliability: state.car.reliability },
      startTyre: i === 0 ? 'medium' : 'soft',
      grid: 0,
    })
  })

  // Rivales: dos coches por equipo, ambos con la especificación del equipo
  for (const t of state.rivals) {
    for (const d of t.drivers) {
      entrants.push({
        id: d.id,
        name: d.name,
        team: t.name,
        isPlayer: false,
        driver: { pace: d.pace, consistency: d.consistency, tyreManagement: d.tyreManagement },
        car: { power: t.car.power, aero: t.car.aero, reliability: t.car.reliability },
        startTyre: startTyre(),
        grid: 0,
      })
    }
  }
  return entrants
}

export interface UpgradePath {
  key: 'power' | 'aero' | 'reliability'
  label: string
  cost: number
  gain: number
}

export function upgradeOptions(state: GameState): UpgradePath[] {
  const cost = (v: number) => Math.round(40_000 + v * 3_000)
  return [
    { key: 'power', label: 'Motor (potencia)', cost: cost(state.car.power), gain: 3 },
    { key: 'aero', label: 'Aerodinámica', cost: cost(state.car.aero), gain: 3 },
    { key: 'reliability', label: 'Fiabilidad', cost: cost(state.car.reliability), gain: 4 },
  ]
}
