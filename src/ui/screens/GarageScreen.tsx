import { Wrench } from 'lucide-react'
import type { GameState } from '../../game/state'
import { upgradeOptions } from '../../game/weekend'
import { Money } from '../components/Money'

export function GarageScreen({
  game,
  setGame,
  onBack,
}: {
  game: GameState
  setGame: (g: GameState) => void
  onBack: () => void
}) {
  const options = upgradeOptions(game)

  function buy(key: 'power' | 'aero' | 'reliability', cost: number, gain: number) {
    if (game.money < cost) return
    if (game.car[key] >= 99) return
    setGame({
      ...game,
      money: game.money - cost,
      car: { ...game.car, [key]: Math.min(99, game.car[key] + gain) },
    })
  }

  return (
    <>
      <div className="topbar">
        <h1 className="with-ico" style={{ justifyContent: 'flex-start' }}><Wrench size={18} color="var(--accent-2)" /> Garaje · I+D</h1>
        <span className="money-chip">
          <Money v={game.money} />
        </span>
      </div>

      <div className="screen">
        <div className="card fade-in">
          <h2>Desarrollo del coche</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            Invierte en mejoras. Cada upgrade sube el nivel del coche y encarece el siguiente.
          </p>
          {options.map((o) => {
            const cur = game.car[o.key]
            const maxed = cur >= 99
            const afford = game.money >= o.cost && !maxed
            return (
              <div key={o.key} style={{ marginBottom: 16 }}>
                <div className="stat-label">
                  <span>{o.label}</span>
                  <b>{cur}{maxed ? ' (máx)' : ` → ${Math.min(99, cur + o.gain)}`}</b>
                </div>
                <div className="bar" style={{ marginBottom: 8 }}>
                  <span style={{ width: `${cur}%` }} />
                </div>
                <button className="btn sm" disabled={!afford} onClick={() => buy(o.key, o.cost, o.gain)} style={{ width: '100%' }}>
                  {maxed ? 'Al máximo' : <>Mejorar · <Money v={o.cost} /></>}
                </button>
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
