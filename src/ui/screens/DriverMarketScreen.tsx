import { Users } from 'lucide-react'
import type { GameState } from '../../game/state'
import { driverOverall, signDriver } from '../../game/state'
import { Money } from '../components/Money'
import { RatingBadge } from '../components/RatingBadge'

export function DriverMarketScreen({
  game,
  setGame,
  onBack,
}: {
  game: GameState
  setGame: (g: GameState) => void
  onBack: () => void
}) {
  function sign(marketId: string, slot: 0 | 1) {
    const outgoing = game.drivers[slot]
    const incoming = game.market.find((d) => d.id === marketId)
    if (!incoming) return
    if (!confirm(`Fichar a ${incoming.name} y liberar a ${outgoing.name}?`)) return
    const next = signDriver(game, marketId, slot)
    if (next) setGame(next)
  }

  return (
    <>
      <div className="topbar">
        <h1 className="with-ico" style={{ justifyContent: 'flex-start' }}><Users size={18} color="var(--accent-2)" /> Mercado</h1>
        <span className="money-chip">
          <Money v={game.money} />
        </span>
      </div>

      <div className="screen">
        <div className="card fade-in">
          <h2>Tu alineación</h2>
          {game.drivers.map((d) => (
            <div className="driver" key={d.id}>
              <div className="avatar">{d.name.split(' ').map((n) => n[0]).join('')}</div>
              <div className="col" style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <span className="muted">
                  Salario <Money v={d.salary} />/año
                </span>
              </div>
              <RatingBadge value={driverOverall(d)} />
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Agentes libres</h2>
          {game.market.length === 0 && <p className="muted">No quedan pilotos disponibles esta temporada.</p>}
          {game.market.map((m) => {
            const afford = game.money >= m.fee
            return (
              <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                <div className="row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RatingBadge value={driverOverall(m)} />
                    <span style={{ fontWeight: 700 }}>{m.name}</span>
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: 700 }}>Prima <Money v={m.fee} /></span>
                    <span className="muted">Salario <Money v={m.salary} />/año</span>
                  </div>
                </div>
                <div className="grid2" style={{ marginTop: 8 }}>
                  <StatMini label="Ritmo" v={m.pace} />
                  <StatMini label="Gomas" v={m.tyreManagement} />
                </div>
                <div className="stat" style={{ marginTop: 4 }}>
                  <div className="stat-label">
                    <span className="muted">Consistencia</span>
                    <b>{m.consistency}</b>
                  </div>
                  <div className="bar">
                    <span style={{ width: `${m.consistency}%` }} />
                  </div>
                </div>
                <div className="btn-group" style={{ marginTop: 8 }}>
                  {game.drivers.map((d, i) => (
                    <button
                      key={d.id}
                      className="btn sm"
                      style={{ flex: 1 }}
                      disabled={!afford}
                      onClick={() => sign(m.id, i as 0 | 1)}
                    >
                      Sustituir a {d.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
                {!afford && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Fondos insuficientes para la prima.</p>}
              </div>
            )
          })}
        </div>

        <button className="btn primary" onClick={onBack}>
          ← Volver
        </button>
      </div>
    </>
  )
}

function StatMini({ label, v }: { label: string; v: number }) {
  return (
    <div className="stat" style={{ marginBottom: 0 }}>
      <div className="stat-label">
        <span className="muted">{label}</span>
        <b>{v}</b>
      </div>
      <div className="bar">
        <span style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}
