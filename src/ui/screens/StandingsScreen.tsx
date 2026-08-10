import { Trophy, TrendingUp, ArrowLeft } from 'lucide-react'
import type { GameState } from '../../game/state'
import { PROMOTION_RANK, currentCategory, nextCategory, teamStandings } from '../../game/state'

export function StandingsScreen({ game, onBack }: { game: GameState; onBack: () => void }) {
  const cat = currentCategory(game)
  const next = nextCategory(game)
  const standings = teamStandings(game)
  const raced = game.round // carreras disputadas esta temporada
  const maxPts = Math.max(1, standings[0]?.points ?? 0)

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
          <div className="standings">
            {standings.map((t, i) => {
              const promoZone = !!next && i < PROMOTION_RANK
              const rank = i + 1
              return (
                <div className={`standing-row ${t.isPlayer ? 'player' : ''} ${promoZone ? 'promo' : ''}`} key={t.teamId}>
                  <span className={`pos-badge ${rank <= 3 ? `p${rank}` : ''}`}>{rank}</span>
                  <div className="col" style={{ flex: 1, minWidth: 0, gap: 5 }}>
                    <div className="row">
                      <span style={{ fontWeight: t.isPlayer ? 700 : 600, color: t.isPlayer ? 'var(--accent-2)' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </span>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{t.points} <span className="muted" style={{ fontWeight: 400 }}>pts</span></b>
                    </div>
                    <div className="pts-bar">
                      <span style={{ width: `${(t.points / maxPts) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {next ? (
          <div className="card" style={{ borderColor: 'rgba(53, 198, 107, 0.3)' }}>
            <div className="with-ico muted" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
              <TrendingUp size={16} color="var(--good)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <b style={{ color: 'var(--good)' }}>Zona de ascenso</b>: acaba entre los <b>{PROMOTION_RANK} primeros</b> al final de la
                temporada para subir a <b>{next.name}</b>.
              </span>
            </div>
          </div>
        ) : (
          <div className="card">
            <p className="muted">Estás en la máxima categoría. ¡Pelea por el título!</p>
          </div>
        )}

        <button className="btn ghost with-ico" onClick={onBack}>
          <ArrowLeft size={17} /> Volver
        </button>
      </div>
    </>
  )
}
