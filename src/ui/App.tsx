import { useEffect, useState } from 'react'
import type { GameState } from '../game/state'
import { hasSave, loadGame, saveGame } from '../game/state'
import { MenuScreen } from './screens/MenuScreen'
import { HomeScreen } from './screens/HomeScreen'
import { GarageScreen } from './screens/GarageScreen'
import { RaceScreen } from './screens/RaceScreen'
import type { RaceOutcome } from './screens/RaceScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { StandingsScreen } from './screens/StandingsScreen'

export type Screen = 'menu' | 'home' | 'garage' | 'standings' | 'race' | 'results'

export function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [game, setGame] = useState<GameState | null>(null)
  const [outcome, setOutcome] = useState<RaceOutcome | null>(null)

  // Auto-guardado cuando cambia el estado del juego
  useEffect(() => {
    if (game) saveGame(game)
  }, [game])

  function handleContinue() {
    const loaded = loadGame()
    if (loaded) {
      setGame(loaded)
      setScreen('home')
    }
  }

  function handleNewGame(g: GameState) {
    setGame(g)
    setScreen('home')
  }

  return (
    <div className="app">
      {screen === 'menu' && (
        <MenuScreen canContinue={hasSave()} onContinue={handleContinue} onNewGame={handleNewGame} />
      )}
      {screen === 'home' && game && (
        <HomeScreen
          game={game}
          onGarage={() => setScreen('garage')}
          onStandings={() => setScreen('standings')}
          onRace={() => setScreen('race')}
          onQuit={() => setScreen('menu')}
        />
      )}
      {screen === 'garage' && game && (
        <GarageScreen game={game} setGame={setGame} onBack={() => setScreen('home')} />
      )}
      {screen === 'standings' && game && (
        <StandingsScreen game={game} onBack={() => setScreen('home')} />
      )}
      {screen === 'race' && game && (
        <RaceScreen
          game={game}
          onFinish={(o) => {
            setOutcome(o)
            setScreen('results')
          }}
        />
      )}
      {screen === 'results' && game && outcome && (
        <ResultsScreen
          game={game}
          outcome={outcome}
          setGame={setGame}
          onContinue={() => setScreen('home')}
        />
      )}
    </div>
  )
}
