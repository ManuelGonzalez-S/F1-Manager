import type { GameState } from '../../game/state'
import { signSponsor } from '../../game/state'
import { Money } from '../components/Money'

export function SponsorsScreen({
  game,
  setGame,
  onBack,
}: {
  game: GameState
  setGame: (g: GameState) => void
  onBack: () => void
}) {
  function sign(id: string) {
    const next = signSponsor(game, id)
    if (next) setGame(next)
  }

  return (
    <>
      <div className="topbar">
        <h1>Patrocinadores</h1>
        <span className="money">
          <Money v={game.money} />
        </span>
      </div>

      <div className="screen">
        {game.sponsor ? (
          <div className="card fade-in" style={{ borderColor: 'var(--good)' }}>
            <h2>Contrato activo · Temporada {game.season}</h2>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{game.sponsor.name}</div>
            <Objective
              label="Por carrera"
              detail={`Acaba entre los ${game.sponsor.perRaceObjective} primeros`}
              payout={game.sponsor.perRacePayout}
            />
            <Objective
              label="Fin de temporada"
              detail={`Termina ${game.sponsor.seasonObjective}º o mejor en constructores`}
              payout={game.sponsor.seasonBonus}
            />
            <p className="muted" style={{ marginTop: 10 }}>
              El contrato dura toda la temporada. Podrás elegir un nuevo patrocinador la próxima.
            </p>
          </div>
        ) : (
          <>
            <div className="card fade-in">
              <h2>Elige patrocinador principal</h2>
              <p className="muted">
                Cada oferta paga una <b>prima al firmar</b>, un <b>bono por carrera</b> si cumples el objetivo y un
                <b> bono de fin de temporada</b>. Más ambición = más dinero pero objetivos más duros. Solo puedes firmar uno.
              </p>
            </div>

            {game.sponsorOffers.map((s) => (
              <div className="card" key={s.id}>
                <div className="row" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{s.name}</div>
                  <span className="pill tier">Prima <Money v={s.signingBonus} /></span>
                </div>
                <Objective
                  label="Por carrera"
                  detail={`Top ${s.perRaceObjective}`}
                  payout={s.perRacePayout}
                />
                <Objective
                  label="Temporada"
                  detail={`${s.seasonObjective}º o mejor`}
                  payout={s.seasonBonus}
                />
                <button className="btn primary" style={{ marginTop: 10 }} onClick={() => sign(s.id)}>
                  Firmar (+<Money v={s.signingBonus} />)
                </button>
              </div>
            ))}
          </>
        )}

        <button className="btn" onClick={onBack}>
          ← Volver
        </button>
      </div>
    </>
  )
}

function Objective({ label, detail, payout }: { label: string; detail: string; payout: number }) {
  return (
    <div className="row" style={{ padding: '6px 0' }}>
      <div className="col">
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="muted">{detail}</span>
      </div>
      <span className="money">+<Money v={payout} /></span>
    </div>
  )
}
