import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { deleteSave, newGame } from '../../game/state'
import type { GameState } from '../../game/state'
import { CATEGORIES } from '../../game/data'

export function MenuScreen({
  canContinue,
  onContinue,
  onNewGame,
}: {
  canContinue: boolean
  onContinue: () => void
  onNewGame: (g: GameState) => void
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  function start() {
    const team = name.trim() || 'Apex Racing'
    onNewGame(newGame(team))
  }

  return (
    <div className="menu fade-in">
      <div>
        <div className="logo">
          APEX<span>·</span>MANAGER
        </div>
        <div className="logo-sub">Racing Team Manager</div>
      </div>
      <p className="tagline">De GT4 a la gloria. Tu escudería, tus decisiones.</p>

      <div className="ladder">
        {CATEGORIES.map((c, i) => (
          <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span className={`ladder-step ${i === 0 ? 'first' : ''} ${i === CATEGORIES.length - 1 ? 'goal' : ''}`}>
              {c.name.split(' ')[0]}
            </span>
            {i < CATEGORIES.length - 1 && <ChevronRight size={13} color="var(--text-dim2)" />}
          </span>
        ))}
      </div>

      {!creating ? (
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {canContinue && (
            <button className="btn primary" onClick={onContinue}>
              Continuar
            </button>
          )}
          <button className="btn" onClick={() => setCreating(true)}>
            Nueva partida
          </button>
          {canContinue && (
            <button
              className="btn ghost"
              onClick={() => {
                if (confirm('¿Borrar la partida guardada?')) deleteSave()
                location.reload()
              }}
            >
              Borrar partida
            </button>
          )}
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input"
            placeholder="Nombre de tu escudería"
            value={name}
            maxLength={22}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn primary" onClick={start}>
            Empezar en GT4
          </button>
          <button className="btn ghost" onClick={() => setCreating(false)}>
            Atrás
          </button>
        </div>
      )}
    </div>
  )
}
