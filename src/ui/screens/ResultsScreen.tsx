import { useMemo } from 'react'
import type { GameState, TeamStanding } from '../../game/state'
import {
  POINTS_TABLE,
  PROMOTION_RANK,
  currentCategory,
  generateMarket,
  generateRivals,
  generateSponsorOffers,
  improveRivals,
  nextCategory,
  teamStandings,
} from '../../game/state'
import { makeRng } from '../../sim/engine'
import { Money } from '../components/Money'
import type { RaceOutcome } from './RaceScreen'

export function ResultsScreen({
  game,
  outcome,
  setGame,
  onContinue,
}: {
  game: GameState
  outcome: RaceOutcome
  setGame: (g: GameState) => void
  onContinue: () => void
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

    const nextRound = game.round + 1
    const seasonOver = nextRound >= game.calendar.length

    // Estado base tras la carrera
    let newState: GameState = {
      ...game,
      money: game.money + prize - costs + sponsorRacePayout,
      round: nextRound,
      points: nextPoints,
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

    if (seasonOver) {
      finalStandings = teamStandings({ ...game, points: nextPoints })
      finalRank = finalStandings.findIndex((t) => t.isPlayer) + 1
      const next = nextCategory(game)
      const rng = makeRng((game.season * 9973 + game.calendar.length * 131 + 7) >>> 0)

      // Bono de fin de temporada del patrocinador
      if (sponsor && finalRank > 0 && finalRank <= sponsor.seasonObjective) {
        sponsorSeasonBonus = sponsor.seasonBonus
      }

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

      newState = {
        ...newState,
        money: newState.money + sponsorSeasonBonus,
        season: game.season + 1,
        round: 0,
        points: {},
        categoryId: newCat.id,
        rivals: newRivals,
        market: generateMarket(rng, newCat.rivalLevel),
        sponsor: null,
        sponsorOffers: generateSponsorOffers(rng, newCat.prizeMoney[0]),
      }
    }

    return {
      playerResults,
      prize,
      costs,
      sponsorRacePayout,
      sponsorSeasonBonus,
      newState,
      seasonOver,
      finalStandings,
      finalRank,
      promoted,
      nextCatName,
    }
  }, [])

  function handleContinue() {
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
              <div className={`result-pos ${podium ? 'podium' : ''}`}>P{best}</div>
              <p className="muted" style={{ marginTop: 6 }}>Mejor resultado del equipo{podium ? ' 🏆 ¡Podio!' : ''}</p>
            </>
          ) : (
            <div className="result-pos">DNF</div>
          )}
        </div>

        <div className="card">
          <h2>Tus coches</h2>
          {summary.playerResults.map((r) => (
            <div className="row" key={r.entrantId} style={{ padding: '8px 0' }}>
              <b style={{ width: 42 }}>{r.retired ? 'DNF' : `P${r.position}`}</b>
              <span style={{ flex: 1 }}>{r.name}</span>
              <span className="muted">{r.retired ? '—' : `${POINTS_TABLE[r.position - 1] ?? 0} pts`}</span>
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
              <span>Bono de patrocinador 🎯</span>
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
              <h2>🏁 Fin de temporada {game.season} · {cat.name}</h2>
              <div className="result-pos" style={{ fontSize: 30 }}>
                {summary.finalRank}º en constructores
              </div>
              {summary.promoted ? (
                <p style={{ color: 'var(--good)', fontWeight: 700, textAlign: 'center', marginTop: 6 }}>
                  ⬆️ ¡ASCENSO! Subes a {summary.nextCatName}
                </p>
              ) : isChampion && !nextCategory(game) ? (
                <p style={{ color: 'var(--warn)', fontWeight: 700, textAlign: 'center', marginTop: 6 }}>
                  👑 ¡Campeones en la máxima categoría!
                </p>
              ) : (
                <p className="muted" style={{ textAlign: 'center', marginTop: 6 }}>
                  {nextCategory(game)
                    ? `Necesitas acabar top-${PROMOTION_RANK} para ascender. Los rivales mejorarán su coche.`
                    : 'Sigue peleando por el título.'}
                </p>
              )}
              {summary.sponsorSeasonBonus > 0 && (
                <p style={{ color: 'var(--good)', textAlign: 'center', marginTop: 8 }}>
                  🎯 Objetivo de patrocinador cumplido: +<Money v={summary.sponsorSeasonBonus} />
                </p>
              )}
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

        <button className="btn primary" onClick={handleContinue}>
          Continuar →
        </button>
      </div>
    </>
  )
}
