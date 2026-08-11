import { useEffect, useState } from 'react'
import type { GameState } from '../game/state'
import { deleteSave, hasSave, loadGame, saveGame, switchPinnacle, twinCategory } from '../game/state'
import { makeRng } from '../sim/engine'
import { MenuScreen } from './screens/MenuScreen'
import { HomeScreen } from './screens/HomeScreen'
import { GarageScreen } from './screens/GarageScreen'
import { RaceScreen } from './screens/RaceScreen'
import type { RaceOutcome } from './screens/RaceScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { StandingsScreen } from './screens/StandingsScreen'
import { DriverMarketScreen } from './screens/DriverMarketScreen'
import { SponsorsScreen } from './screens/SponsorsScreen'
import { CalendarScreen } from './screens/CalendarScreen'
import { StatsScreen } from './screens/StatsScreen'
import { SettingsScreen } from './screens/SettingsScreen'

export type Screen = 'menu' | 'home' | 'garage' | 'standings' | 'market' | 'sponsors' | 'calendar' | 'stats' | 'settings' | 'race' | 'results'

export function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [game, setGame] = useState<GameState | null>(null)
  const [outcome, setOutcome] = useState<RaceOutcome | null>(null)
  const [settingsReturn, setSettingsReturn] = useState<Screen>('menu')

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

  function handleSwitchChampionship() {
    if (!game) return
    const twin = twinCategory(game)
    if (!twin) return
    const ok = confirm(`¿Cambiar a ${twin.name}? Empezarás una temporada nueva en ese campeonato (se mantienen equipo, coche y dinero).`)
    if (!ok) return
    const next = switchPinnacle(game, makeRng((game.season * 7919 + 4231) >>> 0))
    if (next) setGame(next)
  }

  return (
    <div className="app">
      {screen === 'menu' && (
        <MenuScreen
          canContinue={hasSave()}
          onContinue={handleContinue}
          onNewGame={handleNewGame}
          onSettings={() => {
            setSettingsReturn('menu')
            setScreen('settings')
          }}
        />
      )}
      {screen === 'home' && game && (
        <HomeScreen
          game={game}
          onGarage={() => setScreen('garage')}
          onStandings={() => setScreen('standings')}
          onMarket={() => setScreen('market')}
          onSponsors={() => setScreen('sponsors')}
          onCalendar={() => setScreen('calendar')}
          onStats={() => setScreen('stats')}
          onSettings={() => {
            setSettingsReturn('home')
            setScreen('settings')
          }}
          onSwitchChampionship={handleSwitchChampionship}
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
      {screen === 'market' && game && (
        <DriverMarketScreen game={game} setGame={setGame} onBack={() => setScreen('home')} />
      )}
      {screen === 'sponsors' && game && (
        <SponsorsScreen game={game} setGame={setGame} onBack={() => setScreen('home')} />
      )}
      {screen === 'calendar' && game && (
        <CalendarScreen game={game} setGame={setGame} onBack={() => setScreen('home')} />
      )}
      {screen === 'stats' && game && (
        <StatsScreen game={game} onBack={() => setScreen('home')} />
      )}
      {screen === 'settings' && (
        <SettingsScreen onBack={() => setScreen(settingsReturn)} />
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
          onGameOver={() => {
            deleteSave()
            setGame(null)
            setScreen('menu')
          }}
        />
      )}
    </div>
  )
}
