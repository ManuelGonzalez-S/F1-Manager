import type { CarStats, DriverStats } from '../sim/types'
import { CATEGORIES, TRACKS, driverName, randomCar, randomDriver, teamName } from './data'
import { makeRng } from '../sim/engine'

export interface Driver extends DriverStats {
  id: string
  name: string
  salary: number // por temporada
}

export interface PlayerCar extends CarStats {
  name: string
}

export interface RivalDriver extends DriverStats {
  id: string
  name: string
}

export interface RivalTeam {
  id: string
  name: string
  car: CarStats
  drivers: RivalDriver[] // 2 pilotos por equipo
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
  rivals: RivalTeam[] // equipos rivales persistentes de la temporada
  points: Record<string, number> // entrantId -> puntos de campeonato (pilotos)
  history: SeasonResult[]
}

const SAVE_KEY = 'apex-manager-save-v1'

export const POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
export const PLAYER_TEAM_ID = 'player'
export const RIVAL_TEAMS = 5 // 5 rivales × 2 pilotos + 2 del jugador = 12 coches
export const PROMOTION_RANK = 3 // acabar top-3 de constructores asciende

function uid(prefix: string, rng: () => number): string {
  return `${prefix}-${Math.floor(rng() * 1e9).toString(36)}`
}

export function generateRivals(rng: () => number, level: number, teamCount = RIVAL_TEAMS): RivalTeam[] {
  const teams: RivalTeam[] = []
  const usedNames = new Set<string>()
  for (let i = 0; i < teamCount; i++) {
    let name = teamName(rng)
    let guard = 0
    while (usedNames.has(name) && guard++ < 20) name = teamName(rng)
    usedNames.add(name)
    teams.push({
      id: uid('team', rng),
      name,
      car: randomCar(rng, level),
      drivers: [0, 1].map(() => ({ id: uid('drv', rng), name: driverName(rng), ...randomDriver(rng, level) })),
    })
  }
  return teams
}

/** Los rivales desarrollan su coche entre temporadas (guerra de desarrollo). */
export function improveRivals(rng: () => number, rivals: RivalTeam[]): RivalTeam[] {
  const bump = (v: number) => Math.min(99, v + 1 + Math.floor(rng() * 2))
  return rivals.map((t) => ({
    ...t,
    car: { power: bump(t.car.power), aero: bump(t.car.aero), reliability: bump(t.car.reliability) },
  }))
}

export function newGame(teamName: string): GameState {
  const rng = makeRng(Date.now() % 2147483647 || 12345)
  const cat = CATEGORIES[0]
  const drivers: Driver[] = [0, 1].map(() => {
    const s = randomDriver(rng, cat.rivalLevel - 3)
    return { id: uid('drv', rng), name: driverName(rng), salary: 40_000, ...s }
  })
  const car: PlayerCar = { name: 'Apex-01', ...randomCar(rng, cat.rivalLevel - 5) }
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
    rivals: generateRivals(rng, cat.rivalLevel),
    points: {},
    history: [],
  }
}

// ---- Clasificación de constructores ----
export interface TeamStanding {
  teamId: string
  name: string
  isPlayer: boolean
  points: number
}

/** Mapa entrantId(piloto) -> {teamId, teamName, isPlayer}. */
export function driverTeamMap(state: GameState) {
  const map = new Map<string, { teamId: string; name: string; isPlayer: boolean }>()
  for (const d of state.drivers) {
    map.set(d.id, { teamId: PLAYER_TEAM_ID, name: state.teamName, isPlayer: true })
  }
  for (const t of state.rivals) {
    for (const d of t.drivers) map.set(d.id, { teamId: t.id, name: t.name, isPlayer: false })
  }
  return map
}

export function teamStandings(state: GameState): TeamStanding[] {
  const map = driverTeamMap(state)
  const totals = new Map<string, TeamStanding>()
  // Sembrar todos los equipos aunque tengan 0 puntos
  totals.set(PLAYER_TEAM_ID, { teamId: PLAYER_TEAM_ID, name: state.teamName, isPlayer: true, points: 0 })
  for (const t of state.rivals) totals.set(t.id, { teamId: t.id, name: t.name, isPlayer: false, points: 0 })
  for (const [driverId, pts] of Object.entries(state.points)) {
    const info = map.get(driverId)
    if (!info) continue
    const cur = totals.get(info.teamId)
    if (cur) cur.points += pts
  }
  return [...totals.values()].sort((a, b) => b.points - a.points)
}

export function playerTeamRank(state: GameState): number {
  return teamStandings(state).findIndex((t) => t.isPlayer) + 1
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
    const state = JSON.parse(raw) as GameState
    // Migración: partidas antiguas sin rivales persistentes
    if (!state.rivals || state.rivals.length === 0) {
      const cat = CATEGORIES.find((c) => c.id === state.categoryId) ?? CATEGORIES[0]
      state.rivals = generateRivals(makeRng(state.season * 9973 + 1), cat.rivalLevel)
    }
    return state
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

export function nextCategory(state: GameState) {
  const idx = CATEGORIES.findIndex((c) => c.id === state.categoryId)
  return idx >= 0 && idx < CATEGORIES.length - 1 ? CATEGORIES[idx + 1] : null
}
