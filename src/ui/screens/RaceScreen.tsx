import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../../game/state'
import { currentCategory } from '../../game/state'
import { TRACKS } from '../../game/data'
import type { DriveMode, LiveEntrant, PitPlan, RaceState, TyreCompound, WeatherState } from '../../sim/types'
import { createRace, formatGap, makeRng, qualify, rollInitialWeather, simulateLap } from '../../sim/engine'
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
const TYRE_OPTIONS: TyreCompound[] = ['soft', 'medium', 'hard', 'wet']
const ROW_H = 46 // altura de fila de la torre de tiempos (px)
const TICK_MS = 1200 // duración de la animación de una vuelta a 1×

interface RowInfo {
  rank: number
  gap: number
  leader: boolean
  retired: boolean
}

export function RaceScreen({ game, onFinish }: { game: GameState; onFinish: (o: RaceOutcome) => void }) {
  const track = TRACKS.find((t) => t.id === game.calendar[game.round])!
  const cat = currentCategory(game)

  const raceRef = useRef<RaceState | null>(null)
  const rngRef = useRef<() => number>(() => 0)
  const orderRef = useRef<string[]>([]) // orden estable de filas en el DOM
  const prevTotalsRef = useRef<Record<string, number>>({})
  const progressRef = useRef(0) // 0..1 dentro de la vuelta actual
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
    const weather = rollInitialWeather(track, makeRng(seed + 3))
    const race = createRace(qualified, track, weather)
    raceRef.current = race
    rngRef.current = makeRng(seed + 2)
    orderRef.current = race.entrants.map((e) => e.id)
    prevTotalsRef.current = Object.fromEntries(race.entrants.map((e) => [e.id, e.totalTime]))
  }

  const race = raceRef.current

  // Bucle de animación en tiempo real (requestAnimationFrame)
  useEffect(() => {
    if (phase !== 'racing' || !playing) return
    let raf = 0
    let last: number | null = null
    const step = (ts: number) => {
      const r = raceRef.current!
      if (last == null) last = ts
      const dt = ts - last
      last = ts
      progressRef.current += dt / (TICK_MS / speed)
      while (progressRef.current >= 1 && !r.finished) {
        prevTotalsRef.current = Object.fromEntries(r.entrants.map((e) => [e.id, e.totalTime]))
        simulateLap(r, rngRef.current)
        progressRef.current -= 1
      }
      if (r.finished) {
        progressRef.current = 1
        setPlaying(false)
        setPhase('done')
      }
      rerender()
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase, playing, speed])

  function startRace() {
    setPhase('racing')
    setPlaying(true)
  }

  function skipToEnd() {
    const r = raceRef.current!
    setPlaying(false)
    prevTotalsRef.current = Object.fromEntries(r.entrants.map((e) => [e.id, e.totalTime]))
    while (!r.finished) simulateLap(r, rngRef.current)
    progressRef.current = 1
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

  // ---- Edición de estrategia en la parrilla ----
  function setStartTyre(id: string, tyre: TyreCompound) {
    const e = race.entrants.find((x) => x.id === id)
    if (e) {
      e.tyre = tyre
      rerender()
    }
  }
  function addStop(id: string) {
    const e = race.entrants.find((x) => x.id === id)
    if (!e || e.plan.length >= 3) return
    const used = new Set(e.plan.map((p) => p.lap))
    let lap = Math.round(race.totalLaps / (e.plan.length + 2))
    while (used.has(lap) && lap < race.totalLaps - 1) lap++
    const stop: PitPlan = { lap: Math.max(1, Math.min(race.totalLaps - 1, lap)), compound: 'medium' }
    e.plan = [...e.plan, stop].sort((a, b) => a.lap - b.lap)
    rerender()
  }
  function changeStopLap(id: string, idx: number, delta: number) {
    const e = race.entrants.find((x) => x.id === id)
    if (!e) return
    const p = e.plan[idx]
    if (!p) return
    const next = Math.max(1, Math.min(race.totalLaps - 1, p.lap + delta))
    if (e.plan.some((q, i) => i !== idx && q.lap === next)) return
    p.lap = next
    e.plan = [...e.plan].sort((a, b) => a.lap - b.lap)
    rerender()
  }
  function cycleStopCompound(id: string, idx: number) {
    const e = race.entrants.find((x) => x.id === id)
    if (!e || !e.plan[idx]) return
    const order: TyreCompound[] = ['soft', 'medium', 'hard', 'wet']
    const cur = order.indexOf(e.plan[idx].compound)
    e.plan[idx].compound = order[(cur + 1) % order.length]
    rerender()
  }
  function removeStop(id: string, idx: number) {
    const e = race.entrants.find((x) => x.id === id)
    if (!e) return
    e.plan = e.plan.filter((_, i) => i !== idx)
    rerender()
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

  // ---- Cálculo del estado visual interpolado ----
  const t = Math.max(0, Math.min(1, progressRef.current))
  const rows = race.entrants.map((e) => {
    const prev = prevTotalsRef.current[e.id]
    const cur = e.totalTime
    return { e, dispTime: prev == null ? cur : prev + (cur - prev) * t }
  })
  const activeRows = rows.filter((r) => !r.e.retired).sort((a, b) => a.dispTime - b.dispTime)
  const retiredRows = rows.filter((r) => r.e.retired).sort((a, b) => a.e.position - b.e.position)
  const leaderTime = activeRows.length ? activeRows[0].dispTime : 0
  const info = new Map<string, RowInfo>()
  activeRows.forEach((r, i) => info.set(r.e.id, { rank: i, gap: r.dispTime - leaderTime, leader: i === 0, retired: false }))
  retiredRows.forEach((r, i) => info.set(r.e.id, { rank: activeRows.length + i, gap: 0, leader: false, retired: true }))

  const players = race.entrants.filter((e) => e.isPlayer)
  const recentEvents = race.events.slice(-4).reverse()
  const currentLap = race.finished ? race.totalLaps : Math.min(race.totalLaps, race.lap + 1)

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
            <h2>Estrategia de salida</h2>
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="muted">Parte meteorológico</span>
              <WeatherBadge weather={race.weather} />
            </div>
            <p className="muted" style={{ marginBottom: 12 }}>
              Elige el <b>neumático de salida</b> y planifica tus <b>paradas</b>. Podrás cambiar todo en vivo durante la carrera.
            </p>
            {players.map((p) => (
              <GridStrategy
                key={p.id}
                e={p}
                totalLaps={race.totalLaps}
                onStartTyre={setStartTyre}
                onAddStop={addStop}
                onChangeLap={changeStopLap}
                onCycleCompound={cycleStopCompound}
                onRemoveStop={removeStop}
              />
            ))}
          </div>
        )}

        <div className="race-hud">
          <div className="col" style={{ gap: 6, flex: 1 }}>
            <div className="lap-counter">
              {currentLap}/{race.totalLaps}
              <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> vueltas</span>
            </div>
            <div className="lap-progress">
              <span style={{ width: `${phase === 'grid' ? 0 : t * 100}%` }} />
            </div>
          </div>
          <WeatherBadge weather={race.weather} />
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
          players.map((p) => (
            <PlayerControl key={p.id} e={p} pos={(info.get(p.id)?.rank ?? 0) + 1} t={t} onMode={setMode} onPit={requestPit} disabled={phase === 'done'} />
          ))}

        {/* Torre de tiempos (animada) */}
        <div className="card">
          <h2>Clasificación en vivo</h2>
          <div className="live-tower" style={{ height: race.entrants.length * ROW_H }}>
            {orderRef.current.map((id) => {
              const e = race.entrants.find((x) => x.id === id)!
              const ri = info.get(id)!
              return (
                <div
                  className={`timing-row ${e.isPlayer ? 'player' : ''} ${ri.retired ? 'retired' : ''}`}
                  key={id}
                  style={{ transform: `translateY(${ri.rank * ROW_H}px)` }}
                >
                  <span className="pos">{ri.retired ? 'DNF' : ri.rank + 1}</span>
                  <span className="nm">
                    {e.name}
                    <small>{e.team}</small>
                  </span>
                  <span className="tyre-dot" style={{ background: COMPOUND_COLOR[e.tyre] }} title={COMPOUND_LABEL[e.tyre]} />
                  <span className="gap">{ri.retired ? '' : ri.leader ? 'Líder' : formatGap(ri.gap)}</span>
                </div>
              )
            })}
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
            <button className="btn sm" style={{ flex: 1 }} onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}>
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

function GridStrategy({
  e,
  totalLaps,
  onStartTyre,
  onAddStop,
  onChangeLap,
  onCycleCompound,
  onRemoveStop,
}: {
  e: LiveEntrant
  totalLaps: number
  onStartTyre: (id: string, t: TyreCompound) => void
  onAddStop: (id: string) => void
  onChangeLap: (id: string, idx: number, delta: number) => void
  onCycleCompound: (id: string, idx: number) => void
  onRemoveStop: (id: string, idx: number) => void
}) {
  return (
    <div className="strat-block">
      <div className="row" style={{ marginBottom: 8 }}>
        <b>P{e.position} · {e.name}</b>
      </div>

      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Neumático de salida</div>
      <div className="tyre-choices" style={{ marginBottom: 12 }}>
        {TYRE_OPTIONS.map((tc) => (
          <button
            key={tc}
            className={e.tyre === tc ? 'on' : ''}
            style={e.tyre === tc ? { borderColor: COMPOUND_COLOR[tc], background: 'var(--bg-elev2)' } : undefined}
            onClick={() => onStartTyre(e.id, tc)}
          >
            <span className="tyre-dot" style={{ background: COMPOUND_COLOR[tc] }} />
            {COMPOUND_LABEL[tc]}
          </button>
        ))}
      </div>

      <div className="row" style={{ marginBottom: 6 }}>
        <span className="muted" style={{ fontSize: 12 }}>Plan de paradas ({e.plan.length})</span>
        <button className="btn sm ghost" disabled={e.plan.length >= 3} onClick={() => onAddStop(e.id)}>
          + Añadir parada
        </button>
      </div>

      {e.plan.length === 0 && <p className="muted" style={{ fontSize: 12 }}>Sin paradas planeadas (a una parada mínima; puedes parar en vivo).</p>}

      {e.plan.map((p, idx) => (
        <div className="stop-row" key={idx}>
          <span className="muted" style={{ fontSize: 12, width: 30 }}>#{idx + 1}</span>
          <button className="btn sm ghost" onClick={() => onChangeLap(e.id, idx, -1)}>−</button>
          <span style={{ minWidth: 58, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>V{p.lap}/{totalLaps}</span>
          <button className="btn sm ghost" onClick={() => onChangeLap(e.id, idx, 1)}>+</button>
          <button className="tyre-chip" onClick={() => onCycleCompound(e.id, idx)}>
            <span className="tyre-dot" style={{ background: COMPOUND_COLOR[p.compound] }} />
            {COMPOUND_LABEL[p.compound]}
          </button>
          <button className="btn sm ghost" onClick={() => onRemoveStop(e.id, idx)}>✕</button>
        </div>
      ))}
    </div>
  )
}

function PlayerControl({
  e,
  pos,
  t,
  onMode,
  onPit,
  disabled,
}: {
  e: LiveEntrant
  pos: number
  t: number
  onMode: (id: string, m: DriveMode) => void
  onPit: (id: string, t: TyreCompound) => void
  disabled: boolean
}) {
  const displayAge = Math.max(0, e.tyreAge - (1 - t))
  const wearPct = Math.min(100, Math.round((displayAge / 22) * 100))
  return (
    <div className="pit-panel">
      <div className="row">
        <h3>
          P{e.retired ? '—' : pos} · {e.name}
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

          {e.plan.length > 0 && (
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Plan: {e.plan.map((p) => `V${p.lap} ${COMPOUND_LABEL[p.compound]}`).join(' · ')}
            </div>
          )}

          <div className="mode-seg">
            {MODES.map((m) => (
              <button key={m.key} className={e.mode === m.key ? 'on' : ''} disabled={disabled} onClick={() => onMode(e.id, m.key)}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="muted" style={{ fontSize: 12, margin: '6px 0 4px' }}>
            {e.pendingPit ? `🔧 Boxes solicitado: ${COMPOUND_LABEL[e.pendingPit]}` : 'Parar a boxes ya con:'}
          </div>
          <div className="tyre-choices">
            {TYRE_OPTIONS.map((tc) => (
              <button
                key={tc}
                disabled={disabled}
                className={e.pendingPit === tc ? 'on' : ''}
                style={e.pendingPit === tc ? { borderColor: COMPOUND_COLOR[tc], background: 'var(--bg-elev)' } : undefined}
                onClick={() => onPit(e.id, tc)}
              >
                <span className="tyre-dot" style={{ background: COMPOUND_COLOR[tc] }} />
                {COMPOUND_LABEL[tc]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function WeatherBadge({ weather }: { weather: WeatherState }) {
  const w = weather.wetness
  let icon = '☀️'
  let label = 'Seco'
  if (weather.raining && w > 0.6) {
    icon = '🌧️'
    label = 'Lluvia fuerte'
  } else if (weather.raining || w > 0.35) {
    icon = '🌦️'
    label = 'Lluvia'
  } else if (w > 0.1) {
    icon = '🌤️'
    label = 'Secándose'
  }
  return (
    <div className="col" style={{ alignItems: 'flex-end', gap: 3 }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>
        {icon} {label}
      </span>
      {w > 0.05 && (
        <div className="bar" style={{ width: 88 }}>
          <span style={{ width: `${Math.round(w * 100)}%`, background: 'var(--accent-2)' }} />
        </div>
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
