import { describe, expect, it } from 'vitest'
import {
  generateRivals,
  improveRivals,
  newGame,
  nextCategory,
  playerTeamRank,
  signDriver,
  signSponsor,
  teamStandings,
} from './state'
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

  it('fichar un piloto lo pone en el slot, cobra la prima y lo saca del mercado', () => {
    const g = newGame('Test Racing')
    const target = g.market[0]
    const slot = 0
    const before = g.money
    const next = signDriver(g, target.id, slot)!
    expect(next).not.toBeNull()
    expect(next.drivers[slot].id).toBe(target.id)
    expect(next.money).toBe(before - target.fee)
    expect(next.market.find((d) => d.id === target.id)).toBeUndefined()
  })

  it('no se puede fichar sin dinero suficiente', () => {
    const g = { ...newGame('Test Racing'), money: 0 }
    const next = signDriver(g, g.market[0].id, 0)
    expect(next).toBeNull()
  })

  it('firmar patrocinador cobra la prima, fija contrato y vacía las ofertas', () => {
    const g = newGame('Test Racing')
    const offer = g.sponsorOffers[0]
    const before = g.money
    const next = signSponsor(g, offer.id)!
    expect(next.sponsor?.id).toBe(offer.id)
    expect(next.money).toBe(before + offer.signingBonus)
    expect(next.sponsorOffers).toHaveLength(0)
  })
})
