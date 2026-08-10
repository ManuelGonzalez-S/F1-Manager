import { Trophy } from 'lucide-react'
import type { GameState } from '../../game/state'
import { PROMOTION_RANK, currentCategory, nextCategory, teamStandings } from '../../game/state'

export function StandingsScreen({ game, onBack }: { game: GameState; onBack: () => void }) {
  const cat = currentCategory(game)
  const next = nextCategory(game)
  const standings = teamStandings(game)
  const raced = game.round // carreras disputadas esta temporada

  return (
    <>
      <div className="topbar">
        <div className="col">
          <h1 className="with-ico" style={{ justifyContent: 'flex-start' }}><Trophy size={18} color="var(--accent-2)" /> Campeonato</h1>
          <span className="muted">
            {cat.name} · Temporada {game.season} · {raced}/{game.calendar.length} carreras
          </span>
        </div>
      </div>

      <div className="screen">
        <div className="card fade-in">
          <h2>Constructores</h2>
          {standings.map((t, i) => {
            const promoZone = next && i < PROMOTION_RANK
            return (
              <div
                className="row"
                key={t.teamId}
                style={{
                  padding: '9px 0',
                  color: t.isPlayer ? 'var(--accent-2)' : undefined,
                  fontWeight: t.isPlayer ? 700 : 400,
                  borderBottom: i < standings.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <b style={{ width: 30, color: promoZone ? 'var(--good)' : undefined }}>{i + 1}</b>
                <span style={{ flex: 1 }}>{t.name}</span>
                <span>{t.points} pts</span>
              </div>
            )
          })}
        </div>

        {next ? (
          <div className="card">
            <p className="muted">
              <span style={{ color: 'var(--good)' }}>■</span> Zona de ascenso: acaba entre los{' '}
              <b>{PROMOTION_RANK} primeros</b> al final de la temporada para subir a <b>{next.name}</b>.
            </p>
          </div>
        ) : (
          <div className="card">
            <p className="muted">Estás en la máxima categoría. ¡Pelea por el título!</p>
          </div>
        )}

        <button className="btn primary" onClick={onBack}>
          ← Volver
        </button>
      </div>
    </>
  )
}
