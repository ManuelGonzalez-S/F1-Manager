import { CalendarDays, ArrowLeft, X, Plus, RotateCcw, Check, Lock } from 'lucide-react'
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
  // Solo se puede editar entre temporadas (antes de correr la primera carrera).
  const editable = game.round === 0

  function removeRace(i: number) {
    if (!editable || game.calendar.length <= MIN_RACES) return
    setGame({ ...game, calendar: game.calendar.filter((_, idx) => idx !== i) })
  }
  function addRace(id: string) {
    if (!editable || game.calendar.length >= MAX_RACES || inCalendar.has(id)) return
    setGame({ ...game, calendar: [...game.calendar, id] })
  }
  function resetToCategory() {
    if (!editable) return
    setGame({ ...game, calendar: [...cat.defaultCalendar] })
  }

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
        {!editable && (
          <div className="card fade-in" style={{ borderColor: 'rgba(232, 201, 58, 0.35)' }}>
            <div className="with-ico" style={{ justifyContent: 'flex-start' }}>
              <Lock size={16} color="var(--warn)" />
              <span className="muted">
                Temporada en curso. Podrás <b>editar el calendario entre temporadas</b>.
              </span>
            </div>
          </div>
        )}

        <div className="card fade-in">
          <div className="row" style={{ marginBottom: 4 }}>
            <h2 style={{ margin: 0 }}>Tu temporada</h2>
            {editable && (
              <button className="btn sm ghost with-ico" onClick={resetToCategory}>
                <RotateCcw size={14} /> Reiniciar
              </button>
            )}
          </div>

          {game.calendar.map((id, i) => {
            const t = track(id)
            const done = i < game.round
            const isNext = i === game.round && !editable
            return (
              <div className="cal-row" key={`${id}-${i}`}>
                <span className={`pos-badge ${done ? '' : isNext ? 'p1' : ''}`} style={{ opacity: done ? 0.5 : 1 }}>{i + 1}</span>
                <div className="cal-map">
                  <TrackMap trackId={id} height={52} color={done ? 'var(--text-dim2)' : 'var(--accent-2)'} />
                </div>
                <div className="col" style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, opacity: done ? 0.6 : 1 }}>
                    {t.country} {t.name}
                  </span>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {done ? 'Disputada' : isNext ? 'Siguiente' : `${t.laps} vueltas`}
                  </span>
                </div>
                {editable && game.calendar.length > MIN_RACES && (
                  <button className="icon-btn" onClick={() => removeRace(i)} aria-label="Quitar">
                    <X size={16} />
                  </button>
                )}
                {done && <Check size={16} color="var(--good)" style={{ flexShrink: 0 }} />}
              </div>
            )
          })}
        </div>

        {editable && game.calendar.length < MAX_RACES && (
          <div className="card">
            <h2>Añadir circuito</h2>
            {fromCategory.length > 0 && (
              <>
                <div className="muted pick-label">De tu categoría</div>
                <div className="track-pick-grid">
                  {fromCategory.map((t) => (
                    <PickCard key={t.id} name={t.name} country={t.country} id={t.id} onAdd={() => addRace(t.id)} accent />
                  ))}
                </div>
              </>
            )}
            {others.length > 0 && (
              <>
                <div className="muted pick-label" style={{ marginTop: 14 }}>Otros circuitos</div>
                <div className="track-pick-grid">
                  {others.map((t) => (
                    <PickCard key={t.id} name={t.name} country={t.country} id={t.id} onAdd={() => addRace(t.id)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <button className="btn ghost with-ico" onClick={onBack}>
          <ArrowLeft size={17} /> Volver
        </button>
      </div>
    </>
  )
}

function PickCard({
  id,
  name,
  country,
  onAdd,
  accent,
}: {
  id: string
  name: string
  country: string
  onAdd: () => void
  accent?: boolean
}) {
  return (
    <button className={`track-pick ${accent ? 'accent' : ''}`} onClick={onAdd}>
      <div className="tp-map">
        <TrackMap trackId={id} height={64} color={accent ? 'var(--accent-2)' : 'var(--text-dim)'} />
      </div>
      <div className="tp-name">
        {country} {name}
      </div>
      <div className="tp-add">
        <Plus size={13} /> Añadir
      </div>
    </button>
  )
}
