import type { CarStats, DriverStats } from '../sim/types'
import { CATEGORIES, TRACKS, driverName, randomCar, randomDriver } from './data'
import { makeRng } from '../sim/engine'

export interface Driver extends DriverStats {
  id: string
  name: string
  salary: number // por temporada
}

export interface PlayerCar extends CarStats {
  name: string
}

export interface SeasonResult {
  round: number
  trackName: string
  positions: { entrantId: string; position: number; isPlayer: boolean; name: string }[]
}

export interface GameState {
  teamName: string
  money: number
  categoryId: string
  season: number
  round: number // siguiente carrera (0-index dentro del calendario)
  calendar: string[] // ids de pistas
  car: PlayerCar
  drivers: Driver[] // exactamente 2 titulares
  points: Record<string, number> // entrantId -> puntos de campeonato (incluye rivales del año)
  history: SeasonResult[]
}

const SAVE_KEY = 'apex-manager-save-v1'

export const POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

function uid(prefix: string, rng: () => number): string {
  return `${prefix}-${Math.floor(rng() * 1e9).toString(36)}`
}

export function newGame(teamName: string): GameState {
  const rng = makeRng(Date.now() % 2147483647 || 12345)
  const cat = CATEGORIES[0]
  const drivers: Driver[] = [0, 1].map(() => {
    const s = randomDriver(rng, cat.rivalLevel - 3)
    return {
      id: uid('drv', rng),
      name: driverName(rng),
      salary: 40_000,
      ...s,
    }
  })
  const car: PlayerCar = { name: 'Apex-01', ...randomCar(rng, cat.rivalLevel - 5) }
  // Calendario: 5 pistas de las disponibles
  const calendar = TRACKS.slice(0, 5).map((t) => t.id)
  return {
    teamName,
    money: 500_000,
    categoryId: cat.id,
    season: 1,
    round: 0,
    calendar,
    car,
    drivers,
    points: {},
    history: [],
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('No se pudo guardar la partida', e)
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameState
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  return !!localStorage.getItem(SAVE_KEY)
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY)
}

export function currentCategory(state: GameState) {
  return CATEGORIES.find((c) => c.id === state.categoryId) ?? CATEGORIES[0]
}
