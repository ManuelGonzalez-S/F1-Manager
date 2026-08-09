import { useMemo } from 'react'
import type { GameState } from '../../game/state'
import { POINTS_TABLE, currentCategory } from '../../game/state'
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
    // Costes de fin de semana (logística + salarios prorrateados)
    const costs = 25_000 + game.drivers.reduce((s, d) => s + Math.round(d.salary / game.calendar.length), 0)

    const nextRound = game.round + 1
    const seasonOver = nextRound >= game.calendar.length

    const newState: GameState = {
      ...game,
      money: game.money + prize - costs,
      round: seasonOver ? 0 : nextRound,
      season: seasonOver ? game.season + 1 : game.season,
      points: seasonOver ? {} : nextPoints,
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
    return { playerResults, prize, costs, newState, seasonOver }
  }, [])

  function handleContinue() {
    setGame(summary.newState)
    onContinue()
  }

  const best = Math.min(...summary.playerResults.filter((r) => !r.retired).map((r) => r.position), 99)
  const podium = best <= 3

  return (
    <>
      <div className="topbar">
        <h1>Resultado · {outcome.trackName}</h1>
      </div>

      <div className="screen">
        <div className="card fade-in" style={{ textAlign: 'center' }}>
          {best < 99 ? (
            <>
              <div className={`result-pos ${podium ? 'podium' : ''}`}>P{best}</div>
              <p className="muted">Mejor resultado del equipo{podium ? ' 🏆 ¡Podio!' : ''}</p>
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
          <div className="row" style={{ padding: '6px 0' }}>
            <span>Costes del fin de semana</span>
            <span style={{ color: 'var(--bad)' }}>-<Money v={summary.costs} /></span>
          </div>
          <div className="row" style={{ padding: '10px 0 0', borderTop: '1px solid var(--line)', marginTop: 6, fontWeight: 700 }}>
            <span>Neto</span>
            <span style={{ color: summary.prize - summary.costs >= 0 ? 'var(--good)' : 'var(--bad)' }}>
              {summary.prize - summary.costs >= 0 ? '+' : ''}
              <Money v={summary.prize - summary.costs} />
            </span>
          </div>
        </div>

        {summary.seasonOver && (
          <div className="card" style={{ borderColor: 'var(--accent)' }}>
            <h2>🏁 Fin de temporada {game.season}</h2>
            <p className="muted">¡Empieza la temporada {game.season + 1}! Los puntos se reinician.</p>
          </div>
        )}

        <button className="btn primary" onClick={handleContinue}>
          Continuar →
        </button>
      </div>
    </>
  )
}
