import { TRACK_PATHS, TRACK_START } from '../../game/trackMaps'

export function TrackMap({
  trackId,
  height = 96,
  color = 'var(--accent-2)',
}: {
  trackId: string
  height?: number
  color?: string
}) {
  const d = TRACK_PATHS[trackId]
  const start = TRACK_START[trackId]
  if (!d) return null
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet" style={{ height, width: '100%', display: 'block' }}>
      {/* Asfalto (trazo ancho oscuro) */}
      <path d={d} fill="none" stroke="var(--bg-elev3)" strokeWidth={13} strokeLinejoin="round" strokeLinecap="round" />
      {/* Línea de color encima */}
      <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      {/* Marcador de salida/meta */}
      {start && <circle cx={start.x} cy={start.y} r={7} fill="#fff" stroke="var(--bg)" strokeWidth={2} />}
    </svg>
  )
}
