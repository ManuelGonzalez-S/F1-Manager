import { useMemo } from 'react'
import type { GameState, TeamStanding } from '../../game/state'
import {
  POINTS_TABLE,
  PROMOTION_RANK,
  currentCategory,
  facilityDev,
  generateMarket,
  generateRivals,
  generateSponsorOffers,
  improveRivals,
  nextCategory,
  seasonTargetFor,
  teamStandings,
} from '../../game/state'
import type { PlayerCar } from '../../game/state'
import { Trophy, Crown, ChevronsUp, Handshake, Flag, ChevronRight, Target, Ban } from 'lucide-react'
import { makeRng } from '../../sim/engine'
import { Money } from '../components/Money'
import { TyreBadge } from '../components/TyreBadge'
import type { RaceOutcome } from './RaceScreen'

export function ResultsScreen({
  game,
  outcome,
  setGame,
  onContinue,
  onGameOver,
}: {
  game: GameState
  outcome: RaceOutcome
  setGame: (g: GameState) => void
  onContinue: () => void
  onGameOver: () => void
}) {
  const cat = currentCategory(game)

  // Calcular premios/puntos una sola vez y aplicar al estado.
  const summary = useMemo(() => {
    const playerResults = outcome.results.filter((r) => r.isPlayer)
    let prize = 0
    const nextPoints = { ...game.points }
    for (const r of outcome.results) {
      if (!r.retired) {
        const pts = POINTS_TABLE[r.position - 1] ?? 0
        nextPoints[r.entrantId] = (nextPoints[r.entrantId] ?? 0) + pts
      }
      if (r.isPlayer && !r.retired) {
        prize += cat.prizeMoney[r.position - 1] ?? 5_000
      }
    }
    const costs = 25_000 + game.drivers.reduce((s, d) => s + Math.round(d.salary / game.calendar.length), 0)

    // Bono de patrocinador por carrera (si el mejor coche cumple el objetivo)
    const bestFinish = Math.min(...outcome.results.filter((r) => r.isPlayer && !r.retired).map((r) => r.position), 99)
    const sponsor = game.sponsor
    const sponsorRacePayout = sponsor && bestFinish <= sponsor.perRaceObjective ? sponsor.perRacePayout : 0

    // Estadísticas de trayectoria (por carrera)
    const racePoints = playerResults
      .filter((r) => !r.retired)
      .reduce((s, r) => s + (POINTS_TABLE[r.position - 1] ?? 0), 0)
    const statsAfterRace = {
      ...game.stats,
      races: game.stats.races + 1,
      wins: game.stats.wins + (bestFinish === 1 ? 1 : 0),
      podiums: game.stats.podiums + (bestFinish <= 3 ? 1 : 0),
      points: game.stats.points + racePoints,
      bestFinish: Math.min(game.stats.bestFinish, bestFinish),
    }

    const nextRound = game.round + 1
    const seasonOver = nextRound >= game.calendar.length

    // Estado base tras la carrera
    let newState: GameState = {
      ...game,
      money: game.money + prize - costs + sponsorRacePayout,
      round: nextRound,
      points: nextPoints,
      stats: statsAfterRace,
      history: [
        ...game.history,
        {
          round: game.round,
          trackName: outcome.trackName,
          positions: outcome.results.map((r) => ({
            entrantId: r.entrantId,
            position: r.position,
            isPlayer: r.isPlayer,
            name: r.name,
          })),
        },
      ],
    }

    let finalStandings: TeamStanding[] = []
    let finalRank = 0
    let promoted = false
    let nextCatName: string | null = null
    let sponsorSeasonBonus = 0
    let objectiveMet = false
    let objectiveBonus = 0
    let confidenceDelta = 0
    let newConfidence = game.ownerConfidence
    let fired = false

    if (seasonOver) {
      finalStandings = teamStandings({ ...game, points: nextPoints })
      finalRank = finalStandings.findIndex((t) => t.isPlayer) + 1
      const next = nextCategory(game)
      const rng = makeRng((game.season * 9973 + game.calendar.length * 131 + 7) >>> 0)

      // Bono de fin de temporada del patrocinador
      if (sponsor && finalRank > 0 && finalRank <= sponsor.seasonObjective) {
        sponsorSeasonBonus = sponsor.seasonBonus
      }

      // Objetivo de la propiedad
      objectiveMet = finalRank > 0 && finalRank <= game.seasonTarget
      objectiveBonus = objectiveMet ? Math.round(cat.prizeMoney[0] * 0.6) : 0
      confidenceDelta = objectiveMet ? 15 : -25
      newConfidence = Math.max(0, Math.min(100, game.ownerConfidence + confidenceDelta))
      fired = newConfidence <= 0

      let newCat = cat
      let newRivals = game.rivals
      if (next && finalRank > 0 && finalRank <= PROMOTION_RANK) {
        promoted = true
        newCat = next
        nextCatName = next.name
        newRivals = generateRivals(rng, next.rivalLevel)
      } else {
        newRivals = improveRivals(rng, game.rivals)
      }

      // Desarrollo pasivo de la fábrica
      let devCar: PlayerCar = { ...game.car }
      const devPts = facilityDev(game.facility)
      const keys: (keyof PlayerCar)[] = ['power', 'aero', 'reliability']
      for (let i = 0; i < devPts; i++) {
        const k = keys[i % 3] as 'power' | 'aero' | 'reliability'
        devCar[k] = Math.min(99, devCar[k] + 1)
      }

      newState = {
        ...newState,
        money: newState.money + sponsorSeasonBonus + objectiveBonus,
        season: game.season + 1,
        round: 0,
        points: {},
        categoryId: newCat.id,
        calendar: promoted ? [...newCat.defaultCalendar] : [...game.calendar],
        rivals: newRivals,
        market: generateMarket(rng, newCat.rivalLevel),
        sponsor: null,
        sponsorOffers: generateSponsorOffers(rng, newCat.prizeMoney[0]),
        car: devCar,
        ownerConfidence: newConfidence,
        seasonTarget: seasonTargetFor(newCat.id),
        stats: {
          ...statsAfterRace,
          seasonsPlayed: statsAfterRace.seasonsPlayed + 1,
          titles: statsAfterRace.titles + (finalRank === 1 ? 1 : 0),
          promotions: statsAfterRace.promotions + (promoted ? 1 : 0),
        },
      }
    }

    return {
      playerResults,
      prize,
      costs,
      sponsorRacePayout,
      sponsorSeasonBonus,
      objectiveMet,
      objectiveBonus,
      confidenceDelta,
      newConfidence,
      fired,
      newState,
      seasonOver,
      finalStandings,
      finalRank,
      promoted,
      nextCatName,
    }
  }, [])

  function handleContinue() {
    if (summary.fired) {
      onGameOver()
      return
    }
    setGame(summary.newState)
    onContinue()
  }

  const best = Math.min(...summary.playerResults.filter((r) => !r.retired).map((r) => r.position), 99)
  const podium = best <= 3
  const net = summary.prize + summary.sponsorRacePayout - summary.costs
  const isChampion = summary.seasonOver && summary.finalRank === 1

  return (
    <>
      <div className="topbar">
        <h1>Resultado · {outcome.trackName}</h1>
      </div>

      <div className="screen">
        <div className={`card fade-in result-hero ${podium ? 'podium' : ''}`}>
          {best < 99 ? (
            <>
              {podium && (
                <div className={`medallion p${best}`}>
                  <Trophy size={30} />
                </div>
              )}
              <div className={`result-pos ${podium ? 'podium' : ''}`} style={{ fontSize: podium ? 34 : 52, marginTop: podium ? 10 : 0 }}>
                P{best}
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                {podium ? (best === 1 ? '¡Victoria del equipo!' : '¡Podio del equipo!') : 'Mejor resultado del equipo'}
              </p>
            </>
          ) : (
            <>
              <div className="medallion dnf"><Flag size={26} /></div>
              <div className="result-pos" style={{ fontSize: 34, marginTop: 10 }}>DNF</div>
            </>
          )}
        </div>

        <div className="card">
          <h2>Tus coches</h2>
          {summary.playerResults.map((r) => (
            <div className="driver" key={r.entrantId}>
              <span className={`pos-badge ${!r.retired && r.position <= 3 ? `p${r.position}` : ''} ${r.retired ? 'dnf' : ''}`}>
                {r.retired ? 'DNF' : r.position}
              </span>
              <div className="col" style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{r.name}</span>
                <span className="with-ico muted" style={{ justifyContent: 'flex-start', gap: 6, fontSize: 12 }}>
                  <TyreBadge tyre={r.tyre} size={16} /> {r.stops} {r.stops === 1 ? 'parada' : 'paradas'}
                </span>
              </div>
              {!r.retired && <span className="pill" style={{ background: 'rgba(56,189,248,0.14)', color: 'var(--accent-2)' }}>+{POINTS_TABLE[r.position - 1] ?? 0} pts</span>}
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Balance</h2>
          <div className="row" style={{ padding: '6px 0' }}>
            <span>Premios</span>
            <span className="money">+<Money v={summary.prize} /></span>
          </div>
          {summary.sponsorRacePayout > 0 && (
            <div className="row" style={{ padding: '6px 0' }}>
              <span className="with-ico" style={{ justifyContent: 'flex-start' }}>
                <Handshake size={15} color="var(--accent-2)" /> Bono de patrocinador
              </span>
              <span className="money">+<Money v={summary.sponsorRacePayout} /></span>
            </div>
          )}
          <div className="row" style={{ padding: '6px 0' }}>
            <span>Costes del fin de semana</span>
            <span style={{ color: 'var(--bad)' }}>-<Money v={summary.costs} /></span>
          </div>
          <div className="row" style={{ padding: '10px 0 0', borderTop: '1px solid var(--line)', marginTop: 6, fontWeight: 700 }}>
            <span>Neto</span>
            <span style={{ color: net >= 0 ? 'var(--good)' : 'var(--bad)' }}>
              {net >= 0 ? '+' : ''}
              <Money v={net} />
            </span>
          </div>
        </div>

        {summary.seasonOver && (
          <>
            <div className="card" style={{ borderColor: summary.promoted ? 'var(--good)' : isChampion ? 'var(--warn)' : 'var(--accent)' }}>
              <h2 className="with-ico" style={{ justifyContent: 'flex-start' }}>
                <Flag size={13} /> Fin de temporada {game.season} · {cat.name}
              </h2>
              <div className="result-pos" style={{ fontSize: 30 }}>
                {summary.finalRank}º en constructores
              </div>
              {summary.promoted ? (
                <p className="with-ico" style={{ color: 'var(--good)', fontWeight: 700, marginTop: 8 }}>
                  <ChevronsUp size={18} /> ¡ASCENSO! Subes a {summary.nextCatName}
                </p>
              ) : isChampion && !nextCategory(game) ? (
                <p className="with-ico" style={{ color: 'var(--gold)', fontWeight: 700, marginTop: 8 }}>
                  <Crown size={18} /> ¡Campeones en la máxima categoría!
                </p>
              ) : (
                <p className="muted" style={{ textAlign: 'center', marginTop: 6 }}>
                  {nextCategory(game)
                    ? `Necesitas acabar top-${PROMOTION_RANK} para ascender. Los rivales mejorarán su coche.`
                    : 'Sigue peleando por el título.'}
                </p>
              )}
              {summary.sponsorSeasonBonus > 0 && (
                <p className="with-ico" style={{ color: 'var(--good)', marginTop: 8 }}>
                  <Handshake size={15} /> Objetivo de patrocinador cumplido: +<Money v={summary.sponsorSeasonBonus} />
                </p>
              )}
            </div>

            <div className="card" style={{ borderColor: summary.fired ? 'var(--bad)' : summary.objectiveMet ? 'var(--good)' : 'var(--warn)' }}>
              <h2 className="with-ico" style={{ justifyContent: 'flex-start' }}>
                <Target size={13} /> Objetivo de la propiedad
              </h2>
              <div className="row">
                <span>Meta: acabar {game.seasonTarget}º o mejor</span>
                <span style={{ color: summary.objectiveMet ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>
                  {summary.objectiveMet ? 'Cumplido' : 'No cumplido'}
                </span>
              </div>
              {summary.objectiveBonus > 0 && (
                <div className="row" style={{ marginTop: 6 }}>
                  <span className="muted">Bonus</span>
                  <span className="money">+<Money v={summary.objectiveBonus} /></span>
                </div>
              )}
              <div className="stat" style={{ marginTop: 12 }}>
                <div className="stat-label">
                  <span className="muted">Confianza de la propiedad ({summary.confidenceDelta >= 0 ? '+' : ''}{summary.confidenceDelta})</span>
                  <b>{summary.newConfidence}%</b>
                </div>
                <div className="bar">
                  <span style={{ width: `${summary.newConfidence}%`, background: summary.newConfidence > 50 ? 'var(--good)' : summary.newConfidence > 25 ? 'var(--warn)' : 'var(--bad)' }} />
                </div>
              </div>
              {summary.fired ? (
                <p className="with-ico" style={{ color: 'var(--bad)', fontWeight: 700, marginTop: 10 }}>
                  <Ban size={16} /> Estás despedido. Fin de la partida.
                </p>
              ) : summary.newConfidence <= 30 ? (
                <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>⚠ En la cuerda floja. Otra temporada así y estás fuera.</p>
              ) : null}
            </div>

            <div className="card">
              <h2>Campeonato de constructores</h2>
              {summary.finalStandings.map((t, i) => (
                <div
                  className="row"
                  key={t.teamId}
                  style={{
                    padding: '7px 0',
                    color: t.isPlayer ? 'var(--accent-2)' : undefined,
                    fontWeight: t.isPlayer ? 700 : 400,
                    borderBottom: i < summary.finalStandings.length - 1 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  <b style={{ width: 28 }}>{i + 1}</b>
                  <span style={{ flex: 1 }}>{t.name}</span>
                  <span>{t.points} pts</span>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn primary with-ico" onClick={handleContinue}>
          {summary.fired ? 'Volver al menú' : 'Continuar'} <ChevronRight size={18} />
        </button>
      </div>
    </>
  )
}
