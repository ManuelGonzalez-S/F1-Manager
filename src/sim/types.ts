// ---- Núcleo de la simulación de carrera (por vueltas) ----

export type TyreCompound = 'soft' | 'medium' | 'hard' | 'wet'

export interface TyreModel {
  compound: TyreCompound
  /** Segundos ganados/perdidos por vuelta respecto al medio (negativo = más rápido). */
  paceDelta: number
  /** Vida útil aproximada en vueltas antes de caerse de rendimiento. */
  baseLife: number
  /** Cuánto castiga el desgaste al ritmo (s/vuelta cuando está gastado). */
  cliff: number
}

export type DriveMode = 'push' | 'balanced' | 'conserve'

export interface DriverStats {
  /** 1-100: velocidad pura en vuelta rápida. */
  pace: number
  /** 1-100: pocos errores bajo presión. */
  consistency: number
  /** 1-100: cuida el neumático (menos desgaste). */
  tyreManagement: number
}

export interface CarStats {
  /** 1-100: potencia/velocidad punta. */
  power: number
  /** 1-100: aerodinámica/agarre en curva. */
  aero: number
  /** 1-100: menos probabilidad de fallo mecánico. */
  reliability: number
}

export interface Track {
  id: string
  name: string
  country: string
  laps: number
  /** Tiempo de vuelta base de referencia en segundos (coche/piloto medio, gomas medias). */
  baseLapTime: number
  /** Cuánto influye el motor vs. el aero en esta pista (0 = todo aero, 1 = todo motor). */
  powerBias: number
  /** Tiempo perdido en boxes (entrada+parada+salida) en segundos. */
  pitLoss: number
  /** Probabilidad por vuelta de coche de seguridad (0-1). */
  safetyCarChance: number
  /** Tendencia a la lluvia de la pista (0-1). */
  rainChance: number
}

export interface WeatherState {
  raining: boolean
  /** Nivel de agua en pista, 0 (seco) a 1 (empapado). */
  wetness: number
}

export interface EntrantSetup {
  id: string
  name: string
  team: string
  isPlayer: boolean
  driver: DriverStats
  car: CarStats
  startTyre: TyreCompound
  /** Rejilla de salida (1 = pole). Se calcula en clasificación. */
  grid: number
}

// ---- Estado en vivo durante la carrera ----

export interface LiveEntrant {
  id: string
  name: string
  team: string
  isPlayer: boolean
  driver: DriverStats
  car: CarStats
  position: number
  /** Tiempo total acumulado en segundos. */
  totalTime: number
  lap: number
  tyre: TyreCompound
  /** Vueltas rodadas con el juego de neumáticos actual. */
  tyreAge: number
  fuelLaps: number
  mode: DriveMode
  pitStops: number
  /** Órdenes pendientes del jugador para la próxima vuelta. */
  pendingPit: TyreCompound | null
  /** Paradas programadas antes de la carrera (se ejecutan solas al llegar la vuelta). */
  plan: PitPlan[]
  retired: boolean
  gapToLeader: number
  lastLapTime: number
}

export interface PitPlan {
  lap: number
  compound: TyreCompound
}

export interface RaceEvent {
  lap: number
  kind: 'pit' | 'overtake' | 'retire' | 'safetycar' | 'weather' | 'finish' | 'info'
  entrantId?: string
  message: string
}

export interface RaceState {
  track: Track
  lap: number
  totalLaps: number
  entrants: LiveEntrant[]
  events: RaceEvent[]
  safetyCar: number // vueltas restantes de SC (0 = sin SC)
  weather: WeatherState
  finished: boolean
}
