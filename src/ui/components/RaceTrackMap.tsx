import { useEffect, useRef, useState } from 'react'
import { TRACK_PATHS } from '../../game/trackMaps'

export interface CarDot {
  id: string
  /** Posición alrededor de la vuelta, 0..1. */
  frac: number
  color: string
  size: number
  /** z-order: mayor se dibuja encima. */
  z: number
}

export function RaceTrackMap({ trackId, dots, height = 150 }: { trackId: string; dots: CarDot[]; height?: number }) {
  const pathRef = useRef<SVGPathElement>(null)
  const [len, setLen] = useState(0)
  const d = TRACK_PATHS[trackId]

  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength())
  }, [trackId])

  if (!d) return null
  const path = pathRef.current
  const ordered = [...dots].sort((a, b) => a.z - b.z)

  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet" style={{ height, width: '100%', display: 'block' }}>
      {/* Asfalto */}
      <path ref={pathRef} d={d} fill="none" stroke="var(--bg-elev3)" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
      {/* Línea de color */}
      <path d={d} fill="none" stroke="var(--line)" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* Coches */}
      {len > 0 && path &&
        ordered.map((dot) => {
          const p = path.getPointAtLength((((dot.frac % 1) + 1) % 1) * len)
          return <circle key={dot.id} cx={p.x} cy={p.y} r={dot.size} fill={dot.color} stroke="#090c11" strokeWidth={1.6} />
        })}
    </svg>
  )
}
