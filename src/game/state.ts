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

export interface MarketDriver extends DriverStats {
  id: string
  name: string
  salary: number // coste por temporada si lo fichas
  fee: number // prima de fichaje (pago único)
}

export interface Sponsor {
  id: string
  name: string
  signingBonus: number // pago único al firmar
  perRaceObjective: number // el mejor coche debe acabar en este puesto o mejor
  perRacePayout: number // pago por carrera si se cumple el objetivo
  seasonObjective: number // puesto de constructores o mejor al final de temporada
  seasonBonus: number // bono de fin de temporada si se cumple
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
  market: MarketDriver[] // pilotos libres disponibles para fichar
  sponsor: Sponsor | null // patrocinador principal de la temporada
  sponsorOffers: Sponsor[] // ofertas disponibles a elegir
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

// ---- Patrocinadores ----
const SPONSOR_NAMES = ['Meridian Bank', 'NovaTech', 'Volt Energy', 'AeroDyne', 'Kestrel Oil', 'Lumen', 'Orbita Telecom', 'Ferro Steel']

export function generateSponsorOffers(rng: () => number, prizeP1: number): Sponsor[] {
  const pick = () => SPONSOR_NAMES[Math.floor(rng() * SPONSOR_NAMES.length)]
  const jitter = () => 0.9 + rng() * 0.2
  const archetypes = [
    { tag: 'Conservador', signing: 0.6, perObj: 8, perPay: 0.1, seasonObj: 4, seasonBonus: 0.4 },
    { tag: 'Equilibrado', signing: 0.4, perObj: 5, perPay: 0.18, seasonObj: 3, seasonBonus: 0.9 },
    { tag: 'Ambicioso', signing: 0.2, perObj: 3, perPay: 0.3, seasonObj: 1, seasonBonus: 1.8 },
  ]
  return archetypes.map((a) => ({
    id: uid('spo', rng),
    name: `${pick()} · ${a.tag}`,
    signingBonus: Math.round(prizeP1 * a.signing * jitter()),
    perRaceObjective: a.perObj,
    perRacePayout: Math.round(prizeP1 * a.perPay * jitter()),
    seasonObjective: a.seasonObj,
    seasonBonus: Math.round(prizeP1 * a.seasonBonus * jitter()),
  }))
}

/** Firma un patrocinador: cobra la prima y fija el contrato de la temporada. */
export function signSponsor(state: GameState, sponsorId: string): GameState | null {
  const s = state.sponsorOffers.find((o) => o.id === sponsorId)
  if (!s) return null
  return { ...state, money: state.money + s.signingBonus, sponsor: s, sponsorOffers: [] }
}

// ---- Mercado de pilotos ----
export function driverOverall(d: DriverStats): number {
  return Math.round((d.pace + d.consistency + d.tyreManagement) / 3)
}
export function driverSalary(d: DriverStats): number {
  return Math.round(driverOverall(d) * 700)
}
export function driverFee(d: DriverStats): number {
  const o = driverOverall(d)
  return Math.round(o * o * 45)
}

export function generateMarket(rng: () => number, level: number, count = 4): MarketDriver[] {
  return Array.from({ length: count }, () => {
    // Variedad: algunos por debajo del nivel, alguna joven promesa por encima
    const bias = level + (rng() - 0.4) * 22
    const s = randomDriver(rng, bias)
    return { id: uid('mkt', rng), name: driverName(rng), ...s, salary: driverSalary(s), fee: driverFee(s) }
  })
}

/** Ficha un piloto del mercado en el slot indicado (0 o 1). Devuelve el nuevo estado o null si no hay dinero. */
export function signDriver(state: GameState, marketId: string, slot: 0 | 1): GameState | null {
  const m = state.market.find((d) => d.id === marketId)
  if (!m || state.money < m.fee) return null
  const newDriver: Driver = {
    id: m.id,
    name: m.name,
    pace: m.pace,
    consistency: m.consistency,
    tyreManagement: m.tyreManagement,
    salary: m.salary,
  }
  const drivers = [...state.drivers]
  drivers[slot] = newDriver
  return {
    ...state,
    money: state.money - m.fee,
    drivers,
    market: state.market.filter((d) => d.id !== marketId),
  }
}

export const CALENDAR_SIZE = 6

/** Calendario aleatorio de la temporada a partir del pool de circuitos. */
export function generateCalendar(rng: () => number, size = CALENDAR_SIZE): string[] {
  const ids = TRACKS.map((t) => t.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids.slice(0, Math.min(size, ids.length))
}

export function newGame(teamName: string): GameState {
  const rng = makeRng(Date.now() % 2147483647 || 12345)
  const cat = CATEGORIES[0]
  const drivers: Driver[] = [0, 1].map(() => {
    const s = randomDriver(rng, cat.rivalLevel - 3)
    return { id: uid('drv', rng), name: driverName(rng), salary: 40_000, ...s }
  })
  const car: PlayerCar = { name: 'Apex-01', ...randomCar(rng, cat.rivalLevel - 5) }
  const calendar = [...cat.defaultCalendar]
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
    market: generateMarket(rng, cat.rivalLevel),
    sponsor: null,
    sponsorOffers: generateSponsorOffers(rng, cat.prizeMoney[0]),
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

export interface DriverStanding {
  id: string
  name: string
  team: string
  isPlayer: boolean
  points: number
}

export function driverStandings(state: GameState): DriverStanding[] {
  const list: DriverStanding[] = []
  for (const d of state.drivers) {
    list.push({ id: d.id, name: d.name, team: state.teamName, isPlayer: true, points: state.points[d.id] ?? 0 })
  }
  for (const t of state.rivals) {
    for (const d of t.drivers) {
      list.push({ id: d.id, name: d.name, team: t.name, isPlayer: false, points: state.points[d.id] ?? 0 })
    }
  }
  return list.sort((a, b) => b.points - a.points)
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
    // Migración: partidas antiguas sin rivales persistentes / mercado
    const cat = CATEGORIES.find((c) => c.id === state.categoryId) ?? CATEGORIES[0]
    if (!state.rivals || state.rivals.length === 0) {
      state.rivals = generateRivals(makeRng(state.season * 9973 + 1), cat.rivalLevel)
    }
    if (!state.market) {
      state.market = generateMarket(makeRng(state.season * 7919 + 3), cat.rivalLevel)
    }
    if (state.sponsor === undefined) state.sponsor = null
    if (!state.sponsorOffers) {
      state.sponsorOffers = state.sponsor ? [] : generateSponsorOffers(makeRng(state.season * 6151 + 5), cat.prizeMoney[0])
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
