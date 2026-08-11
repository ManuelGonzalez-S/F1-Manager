import { useState } from 'react'
import { ChevronRight, Settings as SettingsIcon } from 'lucide-react'
import { newGame, DIFFICULTY } from '../../game/state'
import type { GameState, Difficulty } from '../../game/state'
import { CATEGORIES } from '../../game/data'
import { loadSettings, saveSettings } from '../../game/settings'

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard']

export function MenuScreen({
  canContinue,
  onContinue,
  onNewGame,
  onSettings,
}: {
  canContinue: boolean
  onContinue: () => void
  onNewGame: (g: GameState) => void
  onSettings: () => void
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>(() => loadSettings().difficulty)

  function start() {
    const team = name.trim() || 'Apex Racing'
    saveSettings({ ...loadSettings(), difficulty }) // recuerda la elección
    onNewGame(newGame(team, difficulty))
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
            <span className={`ladder-step ${i === 0 ? 'first' : ''} ${c.tier === 4 ? 'goal' : ''}`}>
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
          <button className="btn ghost with-ico" onClick={onSettings}>
            <SettingsIcon size={16} /> Ajustes
          </button>
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
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6, textAlign: 'left' }}>Dificultad</div>
            <div className="mode-seg">
              {DIFFS.map((k) => (
                <button key={k} className={difficulty === k ? 'on' : ''} onClick={() => setDifficulty(k)}>
                  {DIFFICULTY[k].label}
                </button>
              ))}
            </div>
          </div>
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
