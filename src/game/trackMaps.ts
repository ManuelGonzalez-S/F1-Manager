// Trazados estilizados (no exactos) de cada circuito, en viewBox 0 0 200 120.
export const TRACK_PATHS: Record<string, string> = {
  monza:
    'M40,100 L40,35 Q40,25 52,25 L150,25 Q165,25 165,40 L165,80 Q165,92 150,88 L70,72 Q52,68 55,85 Q57,98 40,100 Z',
  spa:
    'M30,85 Q22,55 45,52 Q68,50 58,35 Q52,25 72,25 L150,32 Q172,34 168,58 Q164,80 135,80 L75,80 Q45,82 30,85 Z',
  monaco:
    'M40,95 L40,45 L62,45 L62,28 L110,28 L110,50 L150,50 L150,72 L128,72 L128,92 L85,92 L85,68 L60,68 L60,95 Z',
  silverstone:
    'M35,70 Q35,40 65,42 Q95,44 100,30 Q105,20 130,25 Q170,32 168,60 Q166,85 130,82 Q95,80 85,90 Q70,100 55,92 Q35,82 35,70 Z',
  lemans:
    'M30,90 L30,60 Q30,48 45,48 L110,42 Q178,38 180,55 Q182,72 150,74 L120,76 Q100,78 95,88 Q88,98 70,92 Q45,92 30,90 Z',
  suzuka:
    'M45,35 Q80,20 105,42 Q135,68 165,55 Q185,47 180,72 Q175,92 150,85 Q118,74 100,55 Q82,36 55,60 Q35,78 32,55 Q30,38 45,35 Z',
}

// Punto de salida/meta (primer punto del trazado) para dibujar el marcador.
export const TRACK_START: Record<string, { x: number; y: number }> = {
  monza: { x: 40, y: 100 },
  spa: { x: 30, y: 85 },
  monaco: { x: 40, y: 95 },
  silverstone: { x: 35, y: 70 },
  lemans: { x: 30, y: 90 },
  suzuka: { x: 45, y: 35 },
}
