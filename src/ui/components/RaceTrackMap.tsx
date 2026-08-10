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
  /** Número de posición a mostrar sobre el punto (solo destacados). */
  label?: string
  /** Color del texto del número. */
  labelColor?: string
}

export function RaceTrackMap({
  trackId,
  dots,
  height = 150,
  wetness = 0,
}: {
  trackId: string
  dots: CarDot[]
  height?: number
  wetness?: number
}) {
  const pathRef = useRef<SVGPathElement>(null)
  const [len, setLen] = useState(0)
  const d = TRACK_PATHS[trackId]

  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength())
  }, [trackId])

  if (!d) return null
  const path = pathRef.current
  const ordered = [...dots].sort((a, b) => a.z - b.z)
  const rain = wetness > 0.15

  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet" style={{ height, width: '100%', display: 'block' }} className={rain ? 'track-rain' : ''}>
      {/* Asfalto */}
      <path ref={pathRef} d={d} fill="none" stroke="var(--bg-elev3)" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
      {/* Línea de color */}
      <path d={d} fill="none" stroke="var(--line)" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* Coches */}
      {len > 0 && path &&
        ordered.map((dot) => {
          const p = path.getPointAtLength((((dot.frac % 1) + 1) % 1) * len)
          return (
            <g key={dot.id}>
              <circle cx={p.x} cy={p.y} r={dot.size} fill={dot.color} stroke="#090c11" strokeWidth={1.6} />
              {dot.label && (
                <text
                  x={p.x}
                  y={p.y + 2.3}
                  textAnchor="middle"
                  fontSize={6}
                  fontWeight={800}
                  fill={dot.labelColor ?? '#090c11'}
                  style={{ pointerEvents: 'none' }}
                >
                  {dot.label}
                </text>
              )}
            </g>
          )
        })}
    </svg>
  )
}
