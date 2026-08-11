import { useState } from 'react'
import { Settings as SettingsIcon, ArrowLeft, Trash2 } from 'lucide-react'
import { DIFFICULTY } from '../../game/state'
import type { Difficulty } from '../../game/state'
import { loadSettings, saveSettings, TEMPO_LABEL } from '../../game/settings'
import type { RaceTempo, Settings } from '../../game/settings'
import { deleteSave, hasSave } from '../../game/state'

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard']
const TEMPOS: RaceTempo[] = ['slow', 'normal', 'fast']

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState<Settings>(() => loadSettings())

  function update(patch: Partial<Settings>) {
    const next = { ...s, ...patch }
    setS(next)
    saveSettings(next)
  }

  const d = DIFFICULTY[s.difficulty]

  return (
    <>
      <div className="topbar">
        <h1 className="with-ico" style={{ justifyContent: 'flex-start' }}>
          <SettingsIcon size={18} color="var(--accent-2)" /> Ajustes
        </h1>
      </div>

      <div className="screen">
        <div className="card fade-in">
          <h2>Dificultad (nueva partida)</h2>
          <div className="mode-seg">
            {DIFFS.map((k) => (
              <button key={k} className={s.difficulty === k ? 'on' : ''} onClick={() => update({ difficulty: k })}>
                {DIFFICULTY[k].label}
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Rivales {d.rivalOffset === 0 ? 'estándar' : d.rivalOffset < 0 ? 'más flojos' : 'más fuertes'} · premios ×{d.prizeMult} ·
            costes ×{d.costMult} · presupuesto inicial {(d.startMoney / 1000).toFixed(0)}k. Afecta a la próxima partida que empieces.
          </p>
        </div>

        <div className="card">
          <h2>Ritmo de carrera (1×)</h2>
          <div className="mode-seg">
            {TEMPOS.map((k) => (
              <button key={k} className={s.tempo === k ? 'on' : ''} onClick={() => update({ tempo: k })}>
                {TEMPO_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Carrera</h2>
          <ToggleRow label="La radio del piloto pausa la carrera" on={s.radioPause} onToggle={() => update({ radioPause: !s.radioPause })} />
          <ToggleRow label="Mostrar rivales en el minimapa" on={s.rivalDots} onToggle={() => update({ rivalDots: !s.rivalDots })} />
        </div>

        {hasSave() && (
          <button
            className="btn ghost with-ico"
            style={{ color: 'var(--bad)', marginBottom: 12 }}
            onClick={() => {
              if (confirm('¿Borrar la partida guardada? No se puede deshacer.')) {
                deleteSave()
                onBack()
              }
            }}
          >
            <Trash2 size={16} /> Borrar partida guardada
          </button>
        )}

        <button className="btn ghost with-ico" onClick={onBack}>
          <ArrowLeft size={17} /> Volver
        </button>
      </div>
    </>
  )
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="row" style={{ padding: '9px 0' }}>
      <span style={{ flex: 1 }}>{label}</span>
      <button className={`switch ${on ? 'on' : ''}`} onClick={onToggle} aria-label={label} role="switch" aria-checked={on}>
        <span className="knob" />
      </button>
    </div>
  )
}
