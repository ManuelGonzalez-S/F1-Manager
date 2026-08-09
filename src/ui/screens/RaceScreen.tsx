import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../../game/state'
import { currentCategory } from '../../game/state'
import { TRACKS } from '../../game/data'
import type { DriveMode, LiveEntrant, RaceState, TyreCompound } from '../../sim/types'
import { createRace, formatGap, makeRng, qualify, simulateLap } from '../../sim/engine'
import { buildField } from '../../game/weekend'
import { COMPOUND_COLOR, COMPOUND_LABEL } from '../../sim/tyres'

export interface RaceOutcome {
  trackName: string
  results: { entrantId: string; name: string; team: string; isPlayer: boolean; position: number; retired: boolean }[]
}

const MODES: { key: DriveMode; label: string }[] = [
  { key: 'push', label: 'Atacar' },
  { key: 'balanced', label: 'Equilibrio' },
  { key: 'conserve', label: 'Cuidar' },
]
const TYRE_OPTIONS: TyreCompound[] = ['soft', 'medium', 'hard']

export function RaceScreen({ game, onFinish }: { game: GameState; onFinish: (o: RaceOutcome) => void }) {
  const track = TRACKS.find((t) => t.id === game.calendar[game.round])!
  const cat = currentCategory(game)

  const raceRef = useRef<RaceState | null>(null)
  const rngRef = useRef<() => number>(() => 0)
  const [phase, setPhase] = useState<'grid' | 'racing' | 'done'>('grid')
  const [speed, setSpeed] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [, forceTick] = useState(0)
  const rerender = () => forceTick((n) => n + 1)

  // Inicialización única: parrilla + clasificación
  if (!raceRef.current) {
    const seed = (game.season * 1000 + game.round * 37 + track.name.length * 13) >>> 0
    const field = buildField(game, seed)
    const qualified = qualify(field, track, seed + 1)
    raceRef.current = createRace(qualified, track)
    rngRef.current = makeRng(seed + 2)
  }

  const race = raceRef.current

  // Bucle de simulación
  useEffect(() => {
    if (phase !== 'racing' || !playing) return
    const interval = setInterval(() => {
      const r = raceRef.current!
      simulateLap(r, rngRef.current)
      if (r.finished) {
        setPlaying(false)
        setPhase('done')
      }
      rerender()
    }, 750 / speed)
    return () => clearInterval(interval)
  }, [phase, playing, speed])

  function startRace() {
    setPhase('racing')
    setPlaying(true)
  }

  function skipToEnd() {
    const r = raceRef.current!
    setPlaying(false)
    while (!r.finished) simulateLap(r, rngRef.current)
    setPhase('done')
    rerender()
  }

  function setMode(id: string, mode: DriveMode) {
    const e = race.entrants.find((x) => x.id === id)
    if (e) {
      e.mode = mode
      rerender()
    }
  }

  function requestPit(id: string, tyre: TyreCompound) {
    const e = race.entrants.find((x) => x.id === id)
    if (e && !e.retired) {
      e.pendingPit = e.pendingPit === tyre ? null : tyre
      rerender()
    }
  }

  function finish() {
    onFinish({
      trackName: track.name,
      results: race.entrants
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((e) => ({
          entrantId: e.id,
          name: e.name,
          team: e.team,
          isPlayer: e.isPlayer,
          position: e.position,
          retired: e.retired,
        })),
    })
  }

  const players = race.entrants.filter((e) => e.isPlayer)
  const recentEvents = race.events.slice(-4).reverse()

  return (
    <>
      <div className="topbar">
        <div className="col">
          <h1>
            {track.country} {track.name}
          </h1>
          <span className="muted">{cat.name}</span>
        </div>
        {phase === 'racing' && race.safetyCar > 0 && <span className="sc-flag">SAFETY CAR</span>}
      </div>

      <div className="screen">
        {phase === 'grid' && (
          <div className="card fade-in">
            <h2>Parrilla de salida</h2>
            <p className="muted" style={{ marginBottom: 12 }}>
              Clasificación completada. Tus coches saldrán desde:
            </p>
            {players.map((p) => (
              <div key={p.id} className="row" style={{ marginBottom: 8 }}>
                <b>P{p.position}</b>
                <span>{p.name}</span>
                <TyrePill tyre={p.tyre} />
              </div>
            ))}
            <p className="muted" style={{ marginTop: 12 }}>
              Durante la carrera decides <b>modo de conducción</b> y <b>cuándo parar</b>. ¡Buena suerte!
            </p>
          </div>
        )}

        <div className="race-hud">
          <div className="lap-counter">
            {race.lap}/{race.totalLaps}
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> vueltas</span>
          </div>
        </div>

        {recentEvents.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {recentEvents.map((ev, i) => (
              <div className="event-flash" key={`${ev.lap}-${i}`}>
                <span className="muted">V{ev.lap}</span> {ev.message}
              </div>
            ))}
          </div>
        )}

        {/* Paneles de control del jugador */}
        {phase !== 'grid' &&
          players.map((p) => <PlayerControl key={p.id} e={p} onMode={setMode} onPit={requestPit} disabled={phase === 'done'} />)}

        {/* Torre de tiempos */}
        <div className="card">
          <h2>Clasificación en vivo</h2>
          <div className="timing">
            {race.entrants
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((e) => (
                <div className={`timing-row ${e.isPlayer ? 'player' : ''} ${e.retired ? 'retired' : ''}`} key={e.id}>
                  <span className="pos">{e.retired ? 'DNF' : e.position}</span>
                  <span className="nm">
                    {e.name}
                    <small>{e.team}</small>
                  </span>
                  <span className="tyre-dot" style={{ background: COMPOUND_COLOR[e.tyre] }} title={COMPOUND_LABEL[e.tyre]} />
                  <span className="gap">{e.position === 1 || e.retired ? (e.retired ? '' : 'Líder') : formatGap(e.gapToLeader)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Controles de simulación */}
      <div className="sim-controls">
        {phase === 'grid' && (
          <button className="btn primary" onClick={startRace}>
            🚦 Empezar carrera
          </button>
        )}
        {phase === 'racing' && (
          <>
            <button className="btn sm" style={{ flex: 1 }} onClick={() => setPlaying((p) => !p)}>
              {playing ? '⏸ Pausa' : '▶ Seguir'}
            </button>
            <button
              className="btn sm"
              style={{ flex: 1 }}
              onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
            >
              {speed}×
            </button>
            <button className="btn sm ghost" style={{ flex: 1 }} onClick={skipToEnd}>
              ⏭ Al final
            </button>
          </>
        )}
        {phase === 'done' && (
          <button className="btn primary" onClick={finish}>
            Ver resultados →
          </button>
        )}
      </div>
    </>
  )
}

function PlayerControl({
  e,
  onMode,
  onPit,
  disabled,
}: {
  e: LiveEntrant
  onMode: (id: string, m: DriveMode) => void
  onPit: (id: string, t: TyreCompound) => void
  disabled: boolean
}) {
  const wearPct = Math.min(100, Math.round((e.tyreAge / 22) * 100))
  return (
    <div className="pit-panel">
      <div className="row">
        <h3>
          P{e.retired ? '—' : e.position} · {e.name}
        </h3>
        <TyrePill tyre={e.tyre} age={e.tyreAge} />
      </div>

      {e.retired ? (
        <p className="muted" style={{ marginTop: 8 }}>Fuera de carrera 💥</p>
      ) : (
        <>
          <div className="stat" style={{ margin: '10px 0' }}>
            <div className="stat-label">
              <span className="muted">Desgaste neumático</span>
              <b>{wearPct}%</b>
            </div>
            <div className="bar">
              <span style={{ width: `${wearPct}%`, background: wearPct > 75 ? 'var(--bad)' : wearPct > 45 ? 'var(--warn)' : 'var(--good)' }} />
            </div>
          </div>

          <div className="mode-seg">
            {MODES.map((m) => (
              <button key={m.key} className={e.mode === m.key ? 'on' : ''} disabled={disabled} onClick={() => onMode(e.id, m.key)}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="muted" style={{ fontSize: 12, margin: '6px 0 4px' }}>
            {e.pendingPit ? `🔧 Boxes solicitado: ${COMPOUND_LABEL[e.pendingPit]}` : 'Parar a boxes con:'}
          </div>
          <div className="tyre-choices">
            {TYRE_OPTIONS.map((t) => (
              <button
                key={t}
                disabled={disabled}
                style={e.pendingPit === t ? { borderColor: COMPOUND_COLOR[t], background: 'var(--bg-elev)' } : undefined}
                onClick={() => onPit(e.id, t)}
              >
                <span className="tyre-dot" style={{ background: COMPOUND_COLOR[t] }} />
                {COMPOUND_LABEL[t]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TyrePill({ tyre, age }: { tyre: TyreCompound; age?: number }) {
  return (
    <span className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span className="tyre-dot" style={{ background: COMPOUND_COLOR[tyre] }} />
      {COMPOUND_LABEL[tyre]}
      {age !== undefined ? ` · ${age}v` : ''}
    </span>
  )
}
