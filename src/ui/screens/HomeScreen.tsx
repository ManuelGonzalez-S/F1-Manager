import type { GameState } from '../../game/state'
import { currentCategory, driverOverall } from '../../game/state'
import { TRACKS } from '../../game/data'
import { Money } from '../components/Money'
import { RatingBadge } from '../components/RatingBadge'

export function HomeScreen({
  game,
  onGarage,
  onStandings,
  onMarket,
  onSponsors,
  onRace,
  onQuit,
}: {
  game: GameState
  onGarage: () => void
  onStandings: () => void
  onMarket: () => void
  onSponsors: () => void
  onRace: () => void
  onQuit: () => void
}) {
  const cat = currentCategory(game)
  const seasonOver = game.round >= game.calendar.length
  const nextTrack = seasonOver ? null : TRACKS.find((t) => t.id === game.calendar[game.round])

  return (
    <>
      <div className="topbar">
        <div className="col">
          <h1>{game.teamName}</h1>
          <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span className="pill tier">{cat.name}</span> Temporada {game.season}
          </span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 6 }}>
          <span className="money-chip">
            <Money v={game.money} />
          </span>
          <button className="btn ghost sm" onClick={onQuit}>
            ☰ Menú
          </button>
        </div>
      </div>

      <div className="screen">
        <div className="card fade-in">
          <h2>Próxima carrera</h2>
          {nextTrack ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {nextTrack.country} {nextTrack.name}
              </div>
              <span className="muted">
                Carrera {game.round + 1} de {game.calendar.length} · {nextTrack.laps} vueltas
              </span>
              <button className="btn primary" style={{ marginTop: 16 }} onClick={onRace}>
                Ir al fin de semana →
              </button>
            </>
          ) : (
            <div className="muted">Temporada completada.</div>
          )}
        </div>

        {!game.sponsor && (
          <div className="card" style={{ borderColor: 'rgba(232, 201, 58, 0.4)' }}>
            <div className="row">
              <div className="col">
                <div style={{ fontWeight: 700 }}>🎯 Sin patrocinador</div>
                <span className="muted">Firma uno esta temporada y cobra la prima.</span>
              </div>
              <button className="btn accent sm" onClick={onSponsors}>
                Elegir
              </button>
            </div>
          </div>
        )}

        <div className="nav-grid">
          <button className="nav-tile" onClick={onStandings}><span className="ic">🏆</span> Campeonato</button>
          <button className="nav-tile" onClick={onMarket}><span className="ic">👥</span> Mercado</button>
          <button className="nav-tile" onClick={onSponsors}><span className="ic">🎯</span> Patrocinadores</button>
          <button className="nav-tile" onClick={onGarage}><span className="ic">🔧</span> Garaje / I+D</button>
        </div>

        <div className="card">
          <h2>Pilotos</h2>
          {game.drivers.map((d) => (
            <div className="driver" key={d.id}>
              <div className="avatar">{d.name.split(' ').map((n) => n[0]).join('')}</div>
              <div className="col" style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <span className="muted">
                  Ritmo {d.pace} · Consist. {d.consistency} · Gomas {d.tyreManagement}
                </span>
              </div>
              <RatingBadge value={driverOverall(d)} />
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Coche · {game.car.name}</h2>
          <StatMini label="Motor" v={game.car.power} />
          <StatMini label="Aerodinámica" v={game.car.aero} />
          <StatMini label="Fiabilidad" v={game.car.reliability} />
        </div>
      </div>
    </>
  )
}

function StatMini({ label, v }: { label: string; v: number }) {
  return (
    <div className="stat">
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
