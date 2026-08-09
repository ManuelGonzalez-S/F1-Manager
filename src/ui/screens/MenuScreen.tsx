import { useState } from 'react'
import { deleteSave, newGame } from '../../game/state'
import type { GameState } from '../../game/state'

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
      <div className="logo">
        APEX<span>·</span>MANAGER
      </div>
      <p className="tagline">De GT4 a la gloria. Tu escudería, tus decisiones.</p>

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
