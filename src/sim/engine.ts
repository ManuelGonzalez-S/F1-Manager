import type {
  DriveMode,
  EntrantSetup,
  LiveEntrant,
  RaceEvent,
  RaceState,
  Track,
  TyreCompound,
} from './types'
import { TYRES } from './tyres'

// ---- RNG determinista (mulberry32) para carreras reproducibles ----
export function makeRng(seed: number) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MODE_PACE: Record<DriveMode, number> = {
  push: -0.35, // más rápido
  balanced: 0,
  conserve: 0.45, // más lento
}
const MODE_WEAR: Record<DriveMode, number> = {
  push: 1.35, // más desgaste
  balanced: 1.0,
  conserve: 0.65,
}

/** Contribución del coche al tiempo de vuelta (segundos, negativo = mejor). */
function carDelta(power: number, aero: number, powerBias: number): number {
  const combined = power * powerBias + aero * (1 - powerBias)
  // 50 = medio (0s). Cada punto vale ~0.03s.
  return (50 - combined) * 0.03
}

/** Contribución del piloto (segundos, negativo = mejor). */
function driverDelta(pace: number): number {
  return (50 - pace) * 0.025
}

/** Penalización por desgaste del neumático dado su edad. */
function tyreWearPenalty(compound: TyreCompound, age: number, mgmt: number, mode: DriveMode): number {
  const t = TYRES[compound]
  const wearRate = MODE_WEAR[mode] * (1 - (mgmt - 50) * 0.006)
  const effectiveAge = age * wearRate
  const life = t.baseLife
  if (effectiveAge <= life) {
    // desgaste lineal suave hasta el acantilado
    return (effectiveAge / life) * (t.cliff * 0.4)
  }
  // pasado el acantilado, se cae en picado
  const over = effectiveAge - life
  return t.cliff * 0.4 + over * (t.cliff * 0.5)
}

export function qualify(setups: EntrantSetup[], track: Track, seed: number): EntrantSetup[] {
  const rng = makeRng(seed)
  const scored = setups.map((s) => {
    const base =
      track.baseLapTime +
      carDelta(s.car.power, s.car.aero, track.powerBias) +
      driverDelta(s.driver.pace) +
      TYRES.soft.paceDelta + // todos clasifican con blando
      (rng() - 0.5) * (1.2 - s.driver.consistency * 0.008)
    return { s, time: base }
  })
  scored.sort((a, b) => a.time - b.time)
  return scored.map(({ s }, i) => ({ ...s, grid: i + 1 }))
}

export function createRace(setups: EntrantSetup[], track: Track): RaceState {
  const ordered = [...setups].sort((a, b) => a.grid - b.grid)
  const entrants: LiveEntrant[] = ordered.map((s, i) => ({
    id: s.id,
    name: s.name,
    team: s.team,
    isPlayer: s.isPlayer,
    driver: s.driver,
    car: s.car,
    position: i + 1,
    totalTime: i * 0.3, // separación inicial de rejilla
    lap: 0,
    tyre: s.startTyre,
    tyreAge: 0,
    fuelLaps: track.laps + 1,
    mode: 'balanced',
    pitStops: 0,
    pendingPit: null,
    retired: false,
    gapToLeader: 0,
    lastLapTime: 0,
  }))
  return {
    track,
    lap: 0,
    totalLaps: track.laps,
    entrants,
    events: [],
    safetyCar: 0,
    finished: false,
  }
}

/** Avanza la carrera una vuelta. Muta y devuelve un nuevo RaceState. */
export function simulateLap(state: RaceState, rng: () => number): RaceState {
  if (state.finished) return state
  const track = state.track
  const lap = state.lap + 1
  const events: RaceEvent[] = []

  const underSC = state.safetyCar > 0

  // Posible aparición de coche de seguridad
  let safetyCar = Math.max(0, state.safetyCar - 1)
  if (!underSC && safetyCar === 0 && rng() < track.safetyCarChance && lap < state.totalLaps - 1) {
    safetyCar = 3
    events.push({ lap, kind: 'safetycar', message: '🟡 ¡Coche de seguridad en pista!' })
  }

  for (const e of state.entrants) {
    if (e.retired) continue

    // Fallo mecánico (menos probable con buena fiabilidad)
    const failChance = (1 - e.car.reliability / 100) * 0.004
    if (rng() < failChance) {
      e.retired = true
      events.push({ lap, kind: 'retire', entrantId: e.id, message: `💥 ${e.name} abandona (fallo mecánico).` })
      continue
    }

    // ¿Entra a boxes esta vuelta?
    if (e.pendingPit) {
      const newTyre = e.pendingPit
      e.tyre = newTyre
      e.tyreAge = 0
      e.pitStops += 1
      e.pendingPit = null
      e.totalTime += track.pitLoss * (underSC ? 0.55 : 1) // parar con SC cuesta menos
      events.push({ lap, kind: 'pit', entrantId: e.id, message: `🔧 ${e.name} para a boxes.` })
    }

    // Tiempo de vuelta
    let lapTime =
      track.baseLapTime +
      carDelta(e.car.power, e.car.aero, track.powerBias) +
      driverDelta(e.driver.pace) +
      TYRES[e.tyre].paceDelta +
      tyreWearPenalty(e.tyre, e.tyreAge, e.driver.tyreManagement, e.mode) +
      MODE_PACE[e.mode]

    // Efecto combustible: más ligero al final = más rápido
    const fuelWeight = (e.fuelLaps / (track.laps + 1)) * 1.2
    lapTime += fuelWeight

    // Ruido / error del piloto (menor cuanto mayor consistencia)
    const errorBand = 0.9 - e.driver.consistency * 0.007
    lapTime += (rng() - 0.5) * errorBand

    if (underSC || safetyCar > 0) {
      // Ritmo neutralizado: todos ~igual y lento, se comprimen los gaps
      lapTime = track.baseLapTime * 1.35
    }

    e.lap = lap
    e.tyreAge += 1
    e.fuelLaps = Math.max(0, e.fuelLaps - 1)
    e.lastLapTime = lapTime
    e.totalTime += lapTime
  }

  // Recalcular posiciones por tiempo total (los no retirados primero)
  const active = state.entrants.filter((e) => !e.retired).sort((a, b) => a.totalTime - b.totalTime)
  const retired = state.entrants.filter((e) => e.retired)

  const leaderTime = active.length ? active[0].totalTime : 0
  active.forEach((e, i) => {
    const prevPos = e.position
    e.position = i + 1
    e.gapToLeader = e.totalTime - leaderTime
    if (prevPos > e.position && prevPos !== 0 && lap > 1) {
      // adelantamiento (solo lo anotamos para el jugador para no spamear)
      if (e.isPlayer) {
        events.push({ lap, kind: 'overtake', entrantId: e.id, message: `⬆️ ${e.name} sube a P${e.position}.` })
      }
    }
  })
  retired.forEach((e, i) => {
    e.position = active.length + i + 1
  })

  state.entrants = [...active, ...retired]
  state.lap = lap
  state.safetyCar = safetyCar
  state.events = [...state.events, ...events]

  if (lap >= state.totalLaps) {
    state.finished = true
    state.events.push({ lap, kind: 'finish', message: '🏁 ¡Bandera a cuadros!' })
  }

  return state
}

export function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toFixed(3).padStart(6, '0')}` : s.toFixed(3)
}

export function formatGap(seconds: number): string {
  if (seconds <= 0) return '—'
  return `+${seconds.toFixed(1)}`
}
