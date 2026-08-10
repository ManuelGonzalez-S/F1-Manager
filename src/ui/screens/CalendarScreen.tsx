import { CalendarDays, ArrowLeft, X, Plus, RotateCcw, Check, Flag } from 'lucide-react'
import type { GameState } from '../../game/state'
import { currentCategory } from '../../game/state'
import { TRACKS } from '../../game/data'
import { TrackMap } from '../components/TrackMap'

const MIN_RACES = 3
const MAX_RACES = 10

export function CalendarScreen({
  game,
  setGame,
  onBack,
}: {
  game: GameState
  setGame: (g: GameState) => void
  onBack: () => void
}) {
  const cat = currentCategory(game)
  const track = (id: string) => TRACKS.find((t) => t.id === id)!
  const inCalendar = new Set(game.calendar)
  const catSet = new Set(cat.defaultCalendar)

  function removeRace(i: number) {
    if (i < game.round) return
    if (game.calendar.length - game.round <= 1) return
    setGame({ ...game, calendar: game.calendar.filter((_, idx) => idx !== i) })
  }
  function addRace(id: string) {
    if (game.calendar.length >= MAX_RACES || inCalendar.has(id)) return
    setGame({ ...game, calendar: [...game.calendar, id] })
  }
  function resetToCategory() {
    const done = game.calendar.slice(0, game.round)
    const rest = cat.defaultCalendar.filter((id) => !done.includes(id))
    setGame({ ...game, calendar: [...done, ...rest] })
  }

  const canEdit = game.calendar.length - game.round // upcoming count
  const available = TRACKS.filter((t) => !inCalendar.has(t.id))
  const fromCategory = available.filter((t) => catSet.has(t.id))
  const others = available.filter((t) => !catSet.has(t.id))

  return (
    <>
      <div className="topbar">
        <div className="col">
          <h1 className="with-ico" style={{ justifyContent: 'flex-start' }}>
            <CalendarDays size={18} color="var(--accent-2)" /> Calendario
          </h1>
          <span className="muted">
            {cat.name} · Temporada {game.season} · {game.calendar.length} carreras
          </span>
        </div>
      </div>

      <div className="screen">
        <div className="card fade-in">
          <div className="row" style={{ marginBottom: 4 }}>
            <h2 style={{ margin: 0 }}>Tu temporada</h2>
            <button className="btn sm ghost with-ico" onClick={resetToCategory}>
              <RotateCcw size={14} /> Reiniciar
            </button>
          </div>
          <p className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
            Quita carreras futuras o añade circuitos abajo (incluso de otras categorías). Las ya disputadas quedan fijadas.
          </p>

          {game.calendar.map((id, i) => {
            const t = track(id)
            const done = i < game.round
            const isNext = i === game.round
            return (
              <div className="cal-row" key={`${id}-${i}`}>
                <span className={`pos-badge ${done ? '' : isNext ? 'p1' : ''}`} style={{ opacity: done ? 0.5 : 1 }}>{i + 1}</span>
                <div className="cal-map">
                  <TrackMap trackId={id} height={44} color={done ? 'var(--text-dim2)' : 'var(--accent-2)'} />
                </div>
                <div className="col" style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, opacity: done ? 0.6 : 1 }}>
                    {t.country} {t.name}
                  </span>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {done ? 'Disputada' : isNext ? 'Siguiente' : `${t.laps} vueltas`}
                  </span>
                </div>
                {!done && canEdit > 1 && (
                  <button className="icon-btn" onClick={() => removeRace(i)} aria-label="Quitar">
                    <X size={16} />
                  </button>
                )}
                {done && <Check size={16} color="var(--good)" style={{ flexShrink: 0 }} />}
              </div>
            )
          })}
        </div>

        {game.calendar.length < MAX_RACES && (
          <div className="card">
            <h2>Añadir circuito</h2>
            {fromCategory.length > 0 && (
              <>
                <div className="muted" style={{ fontSize: 12, margin: '2px 0 8px' }}>De tu categoría</div>
                <div className="track-chips">
                  {fromCategory.map((t) => (
                    <button key={t.id} className="track-chip" onClick={() => addRace(t.id)}>
                      <Plus size={14} /> {t.country} {t.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {others.length > 0 && (
              <>
                <div className="muted" style={{ fontSize: 12, margin: '14px 0 8px' }}>Otros circuitos</div>
                <div className="track-chips">
                  {others.map((t) => (
                    <button key={t.id} className="track-chip alt" onClick={() => addRace(t.id)}>
                      <Plus size={14} /> {t.country} {t.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {game.calendar.length <= MIN_RACES && (
          <p className="muted with-ico" style={{ justifyContent: 'flex-start', fontSize: 12, marginBottom: 12 }}>
            <Flag size={13} /> Mínimo {MIN_RACES} carreras por temporada.
          </p>
        )}

        <button className="btn ghost with-ico" onClick={onBack}>
          <ArrowLeft size={17} /> Volver
        </button>
      </div>
    </>
  )
}
