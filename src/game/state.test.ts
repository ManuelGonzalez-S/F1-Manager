import { describe, expect, it } from 'vitest'
import { generateRivals, improveRivals, newGame, nextCategory, playerTeamRank, teamStandings } from './state'
import { makeRng } from '../sim/engine'

describe('meta-juego: campeonato y ascenso', () => {
  it('newGame crea 2 pilotos y rivales persistentes con 2 pilotos cada uno', () => {
    const g = newGame('Test Racing')
    expect(g.drivers).toHaveLength(2)
    expect(g.rivals.length).toBeGreaterThan(0)
    for (const t of g.rivals) expect(t.drivers).toHaveLength(2)
  })

  it('teamStandings incluye a todos los equipos y suma puntos por equipo', () => {
    const g = newGame('Test Racing')
    // Dar puntos a los 2 pilotos del jugador y a un rival
    g.points[g.drivers[0].id] = 25
    g.points[g.drivers[1].id] = 18
    g.points[g.rivals[0].drivers[0].id] = 25
    const standings = teamStandings(g)
    expect(standings).toHaveLength(g.rivals.length + 1)
    const player = standings.find((t) => t.isPlayer)!
    expect(player.points).toBe(43)
  })

  it('el jugador líder queda 1º en la clasificación', () => {
    const g = newGame('Test Racing')
    g.points[g.drivers[0].id] = 100
    g.points[g.drivers[1].id] = 100
    expect(playerTeamRank(g)).toBe(1)
  })

  it('nextCategory devuelve la siguiente y null en la máxima', () => {
    const g = newGame('Test Racing')
    expect(nextCategory(g)?.id).toBe('gt3')
    const top = { ...g, categoryId: 'wec' }
    expect(nextCategory(top)).toBeNull()
  })

  it('improveRivals sube las stats del coche sin bajarlas', () => {
    const rng = makeRng(5)
    const rivals = generateRivals(rng, 60)
    const improved = improveRivals(makeRng(6), rivals)
    for (let i = 0; i < rivals.length; i++) {
      expect(improved[i].car.power).toBeGreaterThanOrEqual(rivals[i].car.power)
      expect(improved[i].car.aero).toBeGreaterThanOrEqual(rivals[i].car.aero)
    }
  })
})
