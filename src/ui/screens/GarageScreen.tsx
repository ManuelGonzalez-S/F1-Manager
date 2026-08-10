import { Wrench, Gauge, Wind, ShieldCheck, ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { GameState } from '../../game/state'
import { upgradeOptions } from '../../game/weekend'
import { Money } from '../components/Money'
import { RatingBadge } from '../components/RatingBadge'

const ICONS: Record<string, LucideIcon> = {
  power: Gauge,
  aero: Wind,
  reliability: ShieldCheck,
}

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
  const overall = Math.round((game.car.power + game.car.aero + game.car.reliability) / 3)

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
          <div className="row" style={{ marginBottom: 4 }}>
            <div className="col">
              <h2 style={{ margin: 0 }}>Coche · {game.car.name}</h2>
              <span className="muted" style={{ fontSize: 12 }}>Valoración global</span>
            </div>
            <RatingBadge value={overall} />
          </div>
        </div>

        <div className="card">
          <h2>Desarrollo</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Cada mejora sube el nivel del coche y encarece la siguiente.
          </p>
          {options.map((o) => {
            const cur = game.car[o.key]
            const maxed = cur >= 99
            const afford = game.money >= o.cost && !maxed
            const projected = Math.min(99, cur + o.gain)
            const Icon = ICONS[o.key] ?? Gauge
            return (
              <div key={o.key} style={{ marginBottom: 18 }}>
                <div className="stat-label" style={{ alignItems: 'center' }}>
                  <span className="with-ico" style={{ justifyContent: 'flex-start', gap: 8, fontWeight: 600 }}>
                    <Icon size={16} color="var(--accent-2)" /> {o.label}
                  </span>
                  <b>
                    {cur}
                    {maxed ? ' · máx' : <span style={{ color: 'var(--good)' }}> → {projected}</span>}
                  </b>
                </div>
                <div className="bar gain-bar" style={{ marginBottom: 9 }}>
                  {!maxed && <span className="ghost" style={{ width: `${projected}%` }} />}
                  <span className="fill" style={{ width: `${cur}%` }} />
                </div>
                <button className="btn sm" disabled={!afford} onClick={() => buy(o.key, o.cost, o.gain)} style={{ width: '100%' }}>
                  {maxed ? 'Al máximo' : <>Mejorar +{o.gain} · <Money v={o.cost} /></>}
                </button>
              </div>
            )
          })}
        </div>

        <button className="btn ghost with-ico" onClick={onBack}>
          <ArrowLeft size={17} /> Volver
        </button>
      </div>
    </>
  )
}
