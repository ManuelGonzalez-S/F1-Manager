import { Award, ArrowLeft, Trophy, Flag, ChevronsUp, Medal, CircleGauge, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { GameState } from '../../game/state'
import { currentCategory } from '../../game/state'

export function StatsScreen({ game, onBack }: { game: GameState; onBack: () => void }) {
  const cat = currentCategory(game)
  const s = game.stats
  const winRate = s.races > 0 ? Math.round((s.wins / s.races) * 100) : 0
  const recent = game.history.slice(-6).reverse()

  const tiles: { icon: LucideIcon; label: string; value: string; color: string }[] = [
    { icon: Trophy, label: 'Títulos', value: `${s.titles}`, color: 'var(--gold)' },
    { icon: Flag, label: 'Victorias', value: `${s.wins}`, color: 'var(--accent-2)' },
    { icon: Medal, label: 'Podios', value: `${s.podiums}`, color: 'var(--bronze)' },
    { icon: ChevronsUp, label: 'Ascensos', value: `${s.promotions}`, color: 'var(--good)' },
    { icon: CircleGauge, label: 'Carreras', value: `${s.races}`, color: 'var(--text)' },
    { icon: Star, label: 'Mejor resultado', value: s.bestFinish < 99 ? `P${s.bestFinish}` : '—', color: 'var(--warn)' },
  ]

  return (
    <>
      <div className="topbar">
        <div className="col">
          <h1 className="with-ico" style={{ justifyContent: 'flex-start' }}>
            <Award size={18} color="var(--accent-2)" /> Palmarés
          </h1>
          <span className="muted">
            {game.teamName} · {s.seasonsPlayed} temporada{s.seasonsPlayed === 1 ? '' : 's'} · {cat.name}
          </span>
        </div>
      </div>

      <div className="screen">
        <div className="stat-tiles fade-in">
          {tiles.map((tstat) => (
            <div className="stat-tile" key={tstat.label}>
              <tstat.icon size={20} color={tstat.color} />
              <div className="st-value">{tstat.value}</div>
              <div className="st-label">{tstat.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Trayectoria</h2>
          <div className="row" style={{ padding: '6px 0' }}>
            <span className="muted">Puntos de campeonato acumulados</span>
            <b>{s.points}</b>
          </div>
          <div className="row" style={{ padding: '6px 0' }}>
            <span className="muted">Ratio de victorias</span>
            <b>{winRate}%</b>
          </div>
          <div className="row" style={{ padding: '6px 0' }}>
            <span className="muted">Nivel de fábrica</span>
            <b>{game.facility}/5</b>
          </div>
          <div className="row" style={{ padding: '6px 0' }}>
            <span className="muted">Confianza de la propiedad</span>
            <b>{game.ownerConfidence}%</b>
          </div>
        </div>

        {recent.length > 0 && (
          <div className="card">
            <h2>Últimas carreras</h2>
            {recent.map((h, i) => {
              const best = Math.min(...h.positions.filter((p) => p.isPlayer).map((p) => p.position), 99)
              return (
                <div className="row" key={i} style={{ padding: '8px 0', borderBottom: i < recent.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <span style={{ flex: 1 }}>{h.trackName}</span>
                  <span className={`pos-badge ${best <= 3 ? `p${best}` : ''}`} style={{ width: 28, height: 28, fontSize: 13 }}>
                    {best < 99 ? best : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <button className="btn ghost with-ico" onClick={onBack}>
          <ArrowLeft size={17} /> Volver
        </button>
      </div>
    </>
  )
}
