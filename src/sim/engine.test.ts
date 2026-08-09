import { describe, expect, it } from 'vitest'
import { createRace, makeRng, qualify, simulateLap } from './engine'
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
    const q = qualify(field, track, 1)
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
      const q = qualify(field, track, s)
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
    const q = qualify(field, track, 1)
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
    const soft = [mkEntrant('s', 60, false, 'soft')]
    const hard = [mkEntrant('h', 60, false, 'hard')]
    const rng = makeRng(9)
    const rs = createRace(qualify(soft, track, 1), track)
    const rh = createRace(qualify(hard, track, 1), track)
    // Rodamos más allá del "acantilado" del blando (baseLife 14)
    for (let i = 0; i < 17; i++) {
      simulateLap(rs, rng)
      simulateLap(rh, rng)
    }
    // Pasado su acantilado, el blando gastado debe ir claramente más lento que el duro
    expect(rs.entrants[0].lastLapTime).toBeGreaterThan(rh.entrants[0].lastLapTime)
  })
})
