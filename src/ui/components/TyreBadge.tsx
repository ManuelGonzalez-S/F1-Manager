import type { TyreCompound } from '../../sim/types'
import { COMPOUND_COLOR, COMPOUND_LABEL, COMPOUND_LETTER, COMPOUND_TEXT } from '../../sim/tyres'

export function TyreBadge({ tyre, size = 22 }: { tyre: TyreCompound; size?: number }) {
  return (
    <span
      className="tyre-badge"
      style={{ background: COMPOUND_COLOR[tyre], color: COMPOUND_TEXT[tyre], width: size, height: size, fontSize: size * 0.5 }}
      title={COMPOUND_LABEL[tyre]}
    >
      {COMPOUND_LETTER[tyre]}
    </span>
  )
}
