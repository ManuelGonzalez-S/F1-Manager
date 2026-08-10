import type {
  DriveMode,
  EntrantSetup,
  LiveEntrant,
  RaceEvent,
  RaceState,
  Track,
  TyreCompound,
  WeatherState,
} from './types'
import { TYRES, weatherPenalty } from './tyres'

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

/** Ritmo de desgaste efectivo (multiplicador) según modo y gestión del piloto. */
export function tyreWearRate(mgmt: number, mode: DriveMode): number {
  return MODE_WEAR[mode] * (1 - (mgmt - 50) * 0.006)
}

/** Fracción de vida consumida del neumático (0 = nuevo, 1 = en el acantilado). */
export function tyreWearFraction(compound: TyreCompound, age: number, mgmt: number, mode: DriveMode): number {
  return (age * tyreWearRate(mgmt, mode)) / TYRES[compound].baseLife
}

/** Fracción de vida que se gasta por vuelta (0-1). */
export function tyreWearPerLap(compound: TyreCompound, mgmt: number, mode: DriveMode): number {
  return tyreWearRate(mgmt, mode) / TYRES[compound].baseLife
}

/** Vueltas estimadas hasta el acantilado de rendimiento. */
export function tyreLifeLaps(compound: TyreCompound, mgmt: number, mode: DriveMode): number {
  return TYRES[compound].baseLife / tyreWearRate(mgmt, mode)
}

/** Penalización por desgaste del neumático dado su edad. */
function tyreWearPenalty(compound: TyreCompound, age: number, mgmt: number, mode: DriveMode): number {
  const t = TYRES[compound]
  const frac = tyreWearFraction(compound, age, mgmt, mode)
  if (frac <= 1) {
    // desgaste lineal suave hasta el acantilado
    return frac * (t.cliff * 0.4)
  }
  // pasado el acantilado, se cae en picado
  const overLaps = (frac - 1) * t.baseLife
  return t.cliff * 0.4 + overLaps * (t.cliff * 0.5)
}

export interface QualiResult {
  setups: EntrantSetup[]
  /** Notas por coche del jugador: si clavó la vuelta o cometió un error. */
  playerNotes: Record<string, { mode: DriveMode; mistake: boolean; pos: number }>
}

export function qualify(
  setups: EntrantSetup[],
  track: Track,
  seed: number,
  playerModes?: Record<string, DriveMode>,
): QualiResult {
  const rng = makeRng(seed)
  const mistakes: Record<string, boolean> = {}
  const scored = setups.map((s) => {
    let time =
      track.baseLapTime +
      carDelta(s.car.power, s.car.aero, track.powerBias) +
      driverDelta(s.driver.pace) +
      TYRES.soft.paceDelta + // todos clasifican con blando
      (rng() - 0.5) * (1.2 - s.driver.consistency * 0.008)
    if (s.isPlayer && playerModes) {
      const mode = playerModes[s.id] ?? 'balanced'
      if (mode === 'push') {
        time -= 0.45 // vuelta de ataque: más rápida...
        const mistakeChance = Math.max(0.06, 0.3 - s.driver.consistency * 0.0025)
        if (rng() < mistakeChance) {
          time += 1.4 // ...pero con riesgo de error
          mistakes[s.id] = true
        }
      } else if (mode === 'conserve') {
        time += 0.4 // vuelta segura: más lenta pero sin riesgo
      }
    }
    return { s, time }
  })
  scored.sort((a, b) => a.time - b.time)
  const setupsOut = scored.map(({ s }, i) => ({ ...s, grid: i + 1 }))
  const playerNotes: QualiResult['playerNotes'] = {}
  for (const s of setupsOut) {
    if (s.isPlayer) {
      playerNotes[s.id] = { mode: playerModes?.[s.id] ?? 'balanced', mistake: !!mistakes[s.id], pos: s.grid }
    }
  }
  return { setups: setupsOut, playerNotes }
}

/** Determina el clima con el que arranca el fin de semana. */
export function rollInitialWeather(track: Track, rng: () => number): WeatherState {
  if (rng() < track.rainChance * 0.5) {
    return { raining: true, wetness: 0.5 + rng() * 0.4 }
  }
  return { raining: false, wetness: 0 }
}

export function createRace(
  setups: EntrantSetup[],
  track: Track,
  weather: WeatherState = { raining: false, wetness: 0 },
): RaceState {
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
    plan: [],
    retired: false,
    gapToLeader: 0,
    lastLapTime: 0,
    lastRadioLap: -5,
  }))
  return {
    track,
    lap: 0,
    totalLaps: track.laps,
    entrants,
    events: [],
    safetyCar: 0,
    weather,
    finished: false,
  }
}

function chooseDryTyre(lapsLeft: number): TyreCompound {
  if (lapsLeft > 26) return 'hard'
  if (lapsLeft > 13) return 'medium'
  return 'soft'
}

/** IA sencilla de estrategia: decide si un rival debe parar y con qué goma. */
function decideRivalPit(e: LiveEntrant, wetness: number, lapsLeft: number, rng: () => number): TyreCompound | null {
  const onWets = e.tyre === 'wet'
  // Reacción al clima
  if (wetness > 0.4 && !onWets) return 'wet'
  if (wetness < 0.25 && onWets) return chooseDryTyre(lapsLeft)
  if (onWets) return null // en mojado, se queda con lluvia

  // Gestión de desgaste en seco: parar cerca del acantilado
  const life = TYRES[e.tyre].baseLife
  const wearFactor = 1 - (e.driver.tyreManagement - 50) * 0.006
  const effAge = e.tyreAge * wearFactor
  const threshold = life * (0.82 + rng() * 0.18)
  if (effAge >= threshold && lapsLeft > 3) return chooseDryTyre(lapsLeft)
  return null
}

const RADIO: Record<string, string[]> = {
  pit: ['Gomas nuevas montadas, ¡a por ellos!', 'Neumáticos frescos, recuperemos posiciones.', 'Buena parada, vamos a atacar.'],
  wear: ['Las gomas están fritas, pierdo agarre.', 'No me quedan neumáticos, hay que parar ya.', 'Se me van las ruedas, necesito boxes.'],
  rainStart: ['Está empezando a llover ahí fuera.', 'Cae agua, ¿montamos lluvia?', 'La pista se moja, ojo con esto.'],
  rainStop: ['La pista se está secando.', 'Ya casi no llueve, pronto tocarán slicks.'],
  gain: ['¡Dentro! Posición ganada.', '¡Le he pasado!', 'Vamos hacia arriba, buen ritmo.'],
  lose: ['Me han adelantado, necesito más ritmo.', 'He perdido una posición ahí.', 'No puedo defender, voy justo.'],
  lastLap: ['Última vuelta, apretando al máximo.', 'Aguanto la posición hasta bandera.'],
}

function radioLine(kind: keyof typeof RADIO, rng: () => number): string {
  const pool = RADIO[kind]
  return pool[Math.floor(rng() * pool.length)]
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
    events.push({ lap, kind: 'safetycar', message: '¡Coche de seguridad en pista!' })
  }

  // Evolución del clima
  const weather: WeatherState = { ...state.weather }
  let rainStarted = false
  let rainStopped = false
  if (weather.raining) {
    if (rng() < 0.07) {
      weather.raining = false
      rainStopped = true
      events.push({ lap, kind: 'weather', message: 'Deja de llover, la pista se seca.' })
    }
  } else if (rng() < track.rainChance * 0.12) {
    weather.raining = true
    rainStarted = true
    events.push({ lap, kind: 'weather', message: '¡Empieza a llover!' })
  }
  const wetTarget = weather.raining ? 1 : 0
  weather.wetness += (wetTarget - weather.wetness) * (weather.raining ? 0.25 : 0.18)
  weather.wetness = Math.max(0, Math.min(1, weather.wetness))

  const lapsLeft = state.totalLaps - lap
  const prevPositions = new Map(state.entrants.map((e) => [e.id, e.position]))
  const pitted = new Set<string>()

  for (const e of state.entrants) {
    if (e.retired) continue

    // Fallo mecánico (menos probable con buena fiabilidad)
    const failChance = (1 - e.car.reliability / 100) * 0.004
    if (rng() < failChance) {
      e.retired = true
      events.push({ lap, kind: 'retire', entrantId: e.id, message: `${e.name} abandona (fallo mecánico).` })
      continue
    }

    // Parada programada por el jugador para esta vuelta
    if (e.plan.length && !e.pendingPit) {
      const idx = e.plan.findIndex((p) => p.lap === lap)
      if (idx >= 0) {
        e.pendingPit = e.plan[idx].compound
        e.plan = e.plan.filter((_, i) => i !== idx)
      }
    }

    // IA de estrategia de los rivales (el jugador decide sus propias paradas)
    if (!e.isPlayer && !e.pendingPit && lapsLeft > 1) {
      const want = decideRivalPit(e, weather.wetness, lapsLeft, rng)
      if (want) e.pendingPit = want
    }

    // ¿Entra a boxes esta vuelta?
    if (e.pendingPit) {
      const newTyre = e.pendingPit
      e.tyre = newTyre
      e.tyreAge = 0
      e.pitStops += 1
      e.pendingPit = null
      e.totalTime += track.pitLoss * (underSC ? 0.55 : 1) // parar con SC cuesta menos
      pitted.add(e.id)
      events.push({ lap, kind: 'pit', entrantId: e.id, message: `${e.name} para a boxes.` })
    }

    // Tiempo de vuelta
    let lapTime =
      track.baseLapTime +
      carDelta(e.car.power, e.car.aero, track.powerBias) +
      driverDelta(e.driver.pace) +
      TYRES[e.tyre].paceDelta +
      tyreWearPenalty(e.tyre, e.tyreAge, e.driver.tyreManagement, e.mode) +
      weatherPenalty(e.tyre, weather.wetness) +
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
        events.push({ lap, kind: 'overtake', entrantId: e.id, message: `${e.name} sube a P${e.position}.` })
      }
    }
  })
  retired.forEach((e, i) => {
    e.position = active.length + i + 1
  })

  // Radio del piloto (solo coches del jugador)
  for (const e of state.entrants) {
    if (!e.isPlayer || e.retired) continue
    const throttled = lap - e.lastRadioLap < 2
    const wearFrac = tyreWearFraction(e.tyre, e.tyreAge, e.driver.tyreManagement, e.mode)
    const dropped = (prevPositions.get(e.id) ?? e.position) - e.position < 0
    let kind: keyof typeof RADIO | null = null
    let forced = false
    if (pitted.has(e.id)) {
      kind = 'pit'
      forced = true
    } else if (rainStarted) {
      kind = 'rainStart'
      forced = true
    } else if (rainStopped) {
      kind = 'rainStop'
      forced = true
    } else if (throttled) {
      kind = null
    } else if (wearFrac >= 0.9) {
      kind = 'wear'
    } else if (lap === state.totalLaps && e.position <= 5) {
      kind = 'lastLap'
    } else if (dropped && rng() < 0.5) {
      kind = 'lose'
    }
    if (kind && (forced || kind === 'wear' || rng() < 0.7)) {
      events.push({ lap, kind: 'radio', entrantId: e.id, message: `${e.name.split(' ')[0]}: ${radioLine(kind, rng)}` })
      e.lastRadioLap = lap
    }
  }

  state.entrants = [...active, ...retired]
  state.lap = lap
  state.safetyCar = safetyCar
  state.weather = weather
  state.events = [...state.events, ...events]

  if (lap >= state.totalLaps) {
    state.finished = true
    state.events.push({ lap, kind: 'finish', message: '¡Bandera a cuadros!' })
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
