import type { CarStats, DriverStats, Track } from '../sim/types'

export interface Category {
  id: string
  name: string
  tier: number
  /** Rango aproximado de nivel de los coches rivales. */
  rivalLevel: number
  /** Premio en € por posición final (index 0 = P1). */
  prizeMoney: number[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'gt4',
    name: 'GT4 Challenge',
    tier: 1,
    rivalLevel: 45,
    prizeMoney: [120_000, 90_000, 70_000, 55_000, 45_000, 35_000, 28_000, 22_000, 18_000, 15_000],
  },
  {
    id: 'gt3',
    name: 'GT3 World Series',
    tier: 2,
    rivalLevel: 60,
    prizeMoney: [300_000, 220_000, 170_000, 130_000, 100_000, 80_000, 65_000, 52_000, 42_000, 34_000],
  },
  {
    id: 'lmp',
    name: 'Prototipos LMP',
    tier: 3,
    rivalLevel: 72,
    prizeMoney: [600_000, 440_000, 340_000, 260_000, 200_000, 160_000, 130_000, 105_000, 85_000, 70_000],
  },
  {
    id: 'wec',
    name: 'Hypercar / WEC',
    tier: 4,
    rivalLevel: 85,
    prizeMoney: [1_200_000, 900_000, 700_000, 540_000, 420_000, 330_000, 265_000, 210_000, 170_000, 140_000],
  },
]

export const TRACKS: Track[] = [
  { id: 'monza', name: 'Monza', country: '🇮🇹', laps: 18, baseLapTime: 84.5, powerBias: 0.75, pitLoss: 22, safetyCarChance: 0.05, rainChance: 0.15 },
  { id: 'spa', name: 'Spa-Francorchamps', country: '🇧🇪', laps: 15, baseLapTime: 106.0, powerBias: 0.55, pitLoss: 20, safetyCarChance: 0.09, rainChance: 0.4 },
  { id: 'monaco', name: 'Mónaco', country: '🇲🇨', laps: 24, baseLapTime: 74.0, powerBias: 0.25, pitLoss: 19, safetyCarChance: 0.16, rainChance: 0.2 },
  { id: 'silverstone', name: 'Silverstone', country: '🇬🇧', laps: 17, baseLapTime: 90.0, powerBias: 0.5, pitLoss: 21, safetyCarChance: 0.07, rainChance: 0.3 },
  { id: 'lemans', name: 'Le Mans', country: '🇫🇷', laps: 14, baseLapTime: 205.0, powerBias: 0.7, pitLoss: 26, safetyCarChance: 0.12, rainChance: 0.25 },
  { id: 'suzuka', name: 'Suzuka', country: '🇯🇵', laps: 16, baseLapTime: 92.0, powerBias: 0.45, pitLoss: 22, safetyCarChance: 0.06, rainChance: 0.35 },
  { id: 'catalunya', name: 'Barcelona-Catalunya', country: '🇪🇸', laps: 17, baseLapTime: 82.0, powerBias: 0.45, pitLoss: 21, safetyCarChance: 0.06, rainChance: 0.15 },
  { id: 'redbull', name: 'Red Bull Ring', country: '🇦🇹', laps: 21, baseLapTime: 67.0, powerBias: 0.6, pitLoss: 20, safetyCarChance: 0.1, rainChance: 0.25 },
  { id: 'hungaroring', name: 'Hungaroring', country: '🇭🇺', laps: 19, baseLapTime: 78.0, powerBias: 0.3, pitLoss: 20, safetyCarChance: 0.09, rainChance: 0.2 },
  { id: 'zandvoort', name: 'Zandvoort', country: '🇳🇱', laps: 20, baseLapTime: 72.0, powerBias: 0.4, pitLoss: 20, safetyCarChance: 0.09, rainChance: 0.3 },
  { id: 'imola', name: 'Imola', country: '🇮🇹', laps: 18, baseLapTime: 78.0, powerBias: 0.5, pitLoss: 22, safetyCarChance: 0.11, rainChance: 0.2 },
  { id: 'nurburgring', name: 'Nürburgring', country: '🇩🇪', laps: 16, baseLapTime: 90.0, powerBias: 0.5, pitLoss: 21, safetyCarChance: 0.08, rainChance: 0.35 },
  { id: 'interlagos', name: 'Interlagos', country: '🇧🇷', laps: 18, baseLapTime: 71.0, powerBias: 0.55, pitLoss: 19, safetyCarChance: 0.12, rainChance: 0.35 },
  { id: 'cota', name: 'Circuit of the Americas', country: '🇺🇸', laps: 15, baseLapTime: 97.0, powerBias: 0.5, pitLoss: 21, safetyCarChance: 0.1, rainChance: 0.2 },
]

// ---- Generación de nombres para rivales y pilotos ficticios ----
const FIRST = ['Leo', 'Max', 'Kai', 'Nico', 'Théo', 'Luca', 'Enzo', 'Alex', 'Diego', 'Yuki', 'Finn', 'Marco', 'Ivan', 'Noah', 'Sam', 'Rafa']
const LAST = ['Vetter', 'Rossi', 'Duval', 'Berg', 'Costa', 'Nakamura', 'Lindqvist', 'Moreau', 'Silva', 'Halberg', 'Marconi', 'Petrov', 'Okafor', 'Vasco', 'Reyes', 'Fenn']
const TEAMS = ['Vortex', 'Aureon', 'Meridian', 'Nordic', 'Scuderia Falco', 'Kestrel', 'Apex Rivale', 'Ígneo', 'Baltoro', 'Cobalt', 'Halcyon', 'Titan', 'Volante', 'Zephyr', 'Ardent']

export function driverName(rng: () => number): string {
  return `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`
}

export function teamName(rng: () => number): string {
  return TEAMS[Math.floor(rng() * TEAMS.length)]
}

export function randomDriver(rng: () => number, level: number): DriverStats {
  const spread = 12
  const v = (base: number) => Math.max(20, Math.min(99, Math.round(base + (rng() - 0.5) * spread)))
  return { pace: v(level), consistency: v(level), tyreManagement: v(level) }
}

export function randomCar(rng: () => number, level: number): CarStats {
  const spread = 10
  const v = (base: number) => Math.max(20, Math.min(99, Math.round(base + (rng() - 0.5) * spread)))
  return { power: v(level), aero: v(level), reliability: v(level) }
}
