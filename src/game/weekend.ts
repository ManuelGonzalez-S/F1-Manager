import type { EntrantSetup } from '../sim/types'
import { makeRng } from '../sim/engine'
import { driverName, randomCar, randomDriver, teamName } from './data'
import type { Category } from './data'
import type { GameState } from './state'
import { currentCategory } from './state'

const FIELD_SIZE = 12

/** Construye la parrilla: los 2 coches del jugador + rivales generados. */
export function buildField(state: GameState, cat: Category, seed: number): EntrantSetup[] {
  const rng = makeRng(seed)
  const entrants: EntrantSetup[] = []

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

  // Rivales
  const rivalCount = FIELD_SIZE - entrants.length
  for (let i = 0; i < rivalCount; i++) {
    entrants.push({
      id: `rival-${i}`,
      name: driverName(rng),
      team: teamName(rng),
      isPlayer: false,
      driver: randomDriver(rng, cat.rivalLevel),
      car: randomCar(rng, cat.rivalLevel),
      startTyre: rng() > 0.5 ? 'medium' : 'soft',
      grid: 0,
    })
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

export function categoryPromotion(state: GameState) {
  const cat = currentCategory(state)
  return { canPromote: false, cat } // gestionado por el meta-loop más adelante
}
