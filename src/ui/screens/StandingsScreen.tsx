import { useState } from 'react'
import { Trophy, TrendingUp, ArrowLeft } from 'lucide-react'
import type { GameState } from '../../game/state'
import { PROMOTION_RANK, currentCategory, driverStandings, nextCategory, teamStandings } from '../../game/state'

export function StandingsScreen({ game, onBack }: { game: GameState; onBack: () => void }) {
  const cat = currentCategory(game)
  const next = nextCategory(game)
  const raced = game.round
  const [tab, setTab] = useState<'teams' | 'drivers'>('teams')

  const teams = teamStandings(game)
  const drivers = driverStandings(game)
  const rows = tab === 'teams'
    ? teams.map((t) => ({ key: t.teamId, name: t.name, sub: undefined as string | undefined, isPlayer: t.isPlayer, points: t.points }))
    : drivers.map((d) => ({ key: d.id, name: d.name, sub: d.team, isPlayer: d.isPlayer, points: d.points }))
  const maxPts = Math.max(1, rows[0]?.points ?? 0)

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
        <div className="mode-seg" style={{ marginBottom: 14 }}>
          <button className={tab === 'teams' ? 'on' : ''} onClick={() => setTab('teams')}>Constructores</button>
          <button className={tab === 'drivers' ? 'on' : ''} onClick={() => setTab('drivers')}>Pilotos</button>
        </div>

        <div className="card fade-in">
          <div className="standings">
            {rows.map((r, i) => {
              const rank = i + 1
              const promoZone = tab === 'teams' && !!next && i < PROMOTION_RANK
              return (
                <div className={`standing-row ${r.isPlayer ? 'player' : ''} ${promoZone ? 'promo' : ''}`} key={r.key}>
                  <span className={`pos-badge ${rank <= 3 ? `p${rank}` : ''}`}>{rank}</span>
                  <div className="col" style={{ flex: 1, minWidth: 0, gap: 5 }}>
                    <div className="row">
                      <div className="col" style={{ minWidth: 0, gap: 1 }}>
                        <span style={{ fontWeight: r.isPlayer ? 700 : 600, color: r.isPlayer ? 'var(--accent-2)' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.name}
                        </span>
                        {r.sub && <span className="muted" style={{ fontSize: 11 }}>{r.sub}</span>}
                      </div>
                      <b style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{r.points} <span className="muted" style={{ fontWeight: 400 }}>pts</span></b>
                    </div>
                    <div className="pts-bar">
                      <span style={{ width: `${(r.points / maxPts) * 100}%` }} />
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
                <b style={{ color: 'var(--good)' }}>Zona de ascenso</b>: acaba entre los <b>{PROMOTION_RANK} primeros</b> de constructores
                al final de la temporada para subir a <b>{next.name}</b>.
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
