import { describe, expect, it } from 'vitest'
import {
  facilityDiscount,
  generateRivals,
  improveRivals,
  newGame,
  nextCategory,
  playerTeamRank,
  seasonTargetFor,
  signDriver,
  signSponsor,
  switchPinnacle,
  teamStandings,
  twinCategory,
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

  it('nextCategory asciende por nivel y topa en la cumbre (WEC/F1)', () => {
    const g = newGame('Test Racing')
    expect(nextCategory(g)?.id).toBe('gt3')
    expect(nextCategory({ ...g, categoryId: 'lmp' })?.id).toBe('wec')
    expect(nextCategory({ ...g, categoryId: 'wec' })).toBeNull()
    expect(nextCategory({ ...g, categoryId: 'f1' })).toBeNull()
  })

  it('twinCategory enlaza WEC y F1, y es null en categorías bajas', () => {
    const g = newGame('Test Racing')
    expect(twinCategory({ ...g, categoryId: 'wec' })?.id).toBe('f1')
    expect(twinCategory({ ...g, categoryId: 'f1' })?.id).toBe('wec')
    expect(twinCategory(g)).toBeNull()
  })

  it('switchPinnacle alterna a la gemela con temporada nueva', () => {
    const g = { ...newGame('Test Racing'), categoryId: 'wec', season: 3, round: 4, points: { x: 50 } }
    const next = switchPinnacle(g, makeRng(1))!
    expect(next.categoryId).toBe('f1')
    expect(next.season).toBe(4)
    expect(next.round).toBe(0)
    expect(next.points).toEqual({})
    expect(next.rivals.length).toBeGreaterThan(0)
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

  it('la fábrica descuenta más a mayor nivel y el objetivo es más duro en categorías altas', () => {
    expect(facilityDiscount(1)).toBe(0)
    expect(facilityDiscount(5)).toBeGreaterThan(facilityDiscount(3))
    expect(seasonTargetFor('gt4')).toBeGreaterThan(seasonTargetFor('f1'))
    expect(newGame('T').stats.races).toBe(0)
    expect(newGame('T').ownerConfidence).toBeGreaterThan(0)
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
