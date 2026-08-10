import { describe, expect, it } from 'vitest'
import { createRace, makeRng, qualify, simulateLap, tyreLifeLaps, tyreWearPerLap } from './engine'
import { weatherPenalty } from './tyres'
import type { EntrantSetup, TyreCompound } from './types'
import { TRACKS } from '../game/data'

function mkEntrant(id: string, level: number, isPlayer = false, tyre: TyreCompound = 'medium'): EntrantSetup {
  return {
    id,
    name: id,
    team: id,
    isPlayer,
    driver: { pace: level, consistency: level, tyreManagement: level },
    car: { power: level, aero: level, reliability: 99 },
    startTyre: tyre,
    grid: 0,
  }
}

describe('motor de carrera', () => {
  const track = TRACKS[0]

  it('una carrera corre hasta la bandera a cuadros', () => {
    const field = [mkEntrant('a', 60), mkEntrant('b', 50), mkEntrant('c', 40)]
    const q = qualify(field, track, 1).setups
    const race = createRace(q, track)
    const rng = makeRng(42)
    let guard = 0
    while (!race.finished && guard++ < 500) simulateLap(race, rng)
    expect(race.finished).toBe(true)
    expect(race.lap).toBe(track.laps)
  })

  it('un coche/piloto mejor tiende a ganar', () => {
    let strongWins = 0
    const runs = 20
    for (let s = 0; s < runs; s++) {
      const field = [mkEntrant('strong', 80), mkEntrant('mid', 55), mkEntrant('weak', 35)]
      const q = qualify(field, track, s).setups
      const race = createRace(q, track)
      const rng = makeRng(s * 7 + 1)
      while (!race.finished) simulateLap(race, rng)
      const winner = race.entrants.find((e) => e.position === 1)!
      if (winner.id === 'strong') strongWins++
    }
    // No determinista, pero el fuerte debe ganar la mayoría
    expect(strongWins).toBeGreaterThan(runs * 0.6)
  })

  it('parar a boxes cambia el neumático y suma una parada', () => {
    const field = [mkEntrant('a', 60, true)]
    const q = qualify(field, track, 1).setups
    const race = createRace(q, track)
    const rng = makeRng(3)
    simulateLap(race, rng)
    const car = race.entrants[0]
    car.pendingPit = 'hard'
    simulateLap(race, rng)
    expect(car.tyre).toBe('hard')
    expect(car.pitStops).toBe(1)
    expect(car.tyreAge).toBe(1)
  })

  it('el neumático blando se degrada más rápido que el duro', () => {
    // Pista seca y coches "del jugador" (sin IA de paradas) para aislar el desgaste
    const dry = { ...track, rainChance: 0 }
    const soft = [mkEntrant('s', 60, true, 'soft')]
    const hard = [mkEntrant('h', 60, true, 'hard')]
    const rs = createRace(qualify(soft, dry, 1).setups, dry)
    const rh = createRace(qualify(hard, dry, 1).setups, dry)
    // rng independiente por carrera con la misma semilla → comparación justa
    const rngS = makeRng(9)
    const rngH = makeRng(9)
    // Rodamos más allá del "acantilado" del blando (baseLife 14)
    for (let i = 0; i < 17; i++) {
      simulateLap(rs, rngS)
      simulateLap(rh, rngH)
    }
    // Pasado su acantilado, el blando gastado debe ir claramente más lento que el duro
    expect(rs.entrants[0].lastLapTime).toBeGreaterThan(rh.entrants[0].lastLapTime)
  })

  it('una parada programada se ejecuta sola en su vuelta', () => {
    const dry = { ...track, rainChance: 0 }
    const field = [mkEntrant('a', 60, true, 'soft')]
    const race = createRace(qualify(field, dry, 1).setups, dry)
    const car = race.entrants[0]
    car.plan = [{ lap: 4, compound: 'hard' }]
    const rng = makeRng(3)
    for (let i = 0; i < 3; i++) simulateLap(race, rng) // vueltas 1-3
    expect(car.pitStops).toBe(0)
    expect(car.tyre).toBe('soft')
    simulateLap(race, rng) // vuelta 4: debe parar
    expect(car.pitStops).toBe(1)
    expect(car.tyre).toBe('hard')
    expect(car.plan).toHaveLength(0)
  })

  it('cada compuesto se gasta a un ritmo distinto (blando > medio > duro)', () => {
    const mgmt = 50
    const wSoft = tyreWearPerLap('soft', mgmt, 'balanced')
    const wMed = tyreWearPerLap('medium', mgmt, 'balanced')
    const wHard = tyreWearPerLap('hard', mgmt, 'balanced')
    expect(wSoft).toBeGreaterThan(wMed)
    expect(wMed).toBeGreaterThan(wHard)
    // Y la duración va al revés
    expect(tyreLifeLaps('hard', mgmt, 'balanced')).toBeGreaterThan(tyreLifeLaps('medium', mgmt, 'balanced'))
    expect(tyreLifeLaps('medium', mgmt, 'balanced')).toBeGreaterThan(tyreLifeLaps('soft', mgmt, 'balanced'))
  })

  it('atacar gasta más que cuidar y mejor gestión alarga la vida', () => {
    expect(tyreWearPerLap('medium', 50, 'push')).toBeGreaterThan(tyreWearPerLap('medium', 50, 'conserve'))
    expect(tyreLifeLaps('medium', 80, 'balanced')).toBeGreaterThan(tyreLifeLaps('medium', 40, 'balanced'))
  })

  it('clasificación: atacar puede fallar; segura nunca falla', () => {
    const field = [mkEntrant('p', 60, true), mkEntrant('r1', 55), mkEntrant('r2', 50)]
    let pushMistakes = 0
    let safeMistakes = 0
    for (let s = 0; s < 40; s++) {
      const push = qualify(field, track, s, { p: 'push' })
      const safe = qualify(field, track, s, { p: 'conserve' })
      if (push.playerNotes['p'].mistake) pushMistakes++
      if (safe.playerNotes['p'].mistake) safeMistakes++
    }
    expect(safeMistakes).toBe(0)
    expect(pushMistakes).toBeGreaterThan(0)
  })

  it('con lluvia el neumático de agua bate al slick; en seco es al revés', () => {
    // Pista muy mojada
    expect(weatherPenalty('wet', 1)).toBeLessThan(weatherPenalty('medium', 1))
    // Pista seca
    expect(weatherPenalty('medium', 0)).toBeLessThan(weatherPenalty('wet', 0))
  })
})
