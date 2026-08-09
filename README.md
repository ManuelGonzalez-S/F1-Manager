# 🏁 Apex Manager

Juego **mobile-first** de gestión de escuderías de automovilismo. Empiezas en GT4
y tu ambición es escalar por GT3, Prototipos LMP y Hypercar/WEC. Eres el
dueño-y-team-principal entre carreras, y el ingeniero de estrategia durante ellas.

Es una **PWA** (web app instalable): funciona **offline** y se puede añadir a la
pantalla de inicio del iPhone sin App Store ni licencia de desarrollador.

## Cómo jugar

1. `npm install`
2. `npm run dev` y abre la URL en el móvil (misma red) o en el navegador.
3. En iPhone/Safari: **Compartir → Añadir a pantalla de inicio** para instalarla como app offline.

## Bucle de juego (vertical slice actual)

- **Meta-loop:** gestiona tu escudería, mejora el coche en el garaje (I+D de motor,
  aero y fiabilidad), gana premios y avanza el calendario.
- **Fin de semana:** clasificación automática → **carrera en vivo** donde decides
  el **modo de conducción** (atacar / equilibrio / cuidar) y **cuándo parar a boxes**
  y con qué neumático.
- **Economía:** premios por posición menos costes; el balance financia el desarrollo.

## Simulación

Motor por vueltas (no física real). El tiempo de vuelta combina coche, piloto,
neumático (con desgaste y "acantilado" de rendimiento), combustible, clima y azar
controlado. RNG determinista para carreras reproducibles. Ver `src/sim/`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (genera el service worker PWA) |
| `npm run preview` | Sirve el build |
| `npm test` | Tests del motor de simulación (Vitest) |

## Stack

Vite · React · TypeScript · vite-plugin-pwa. Guardado en `localStorage`.

## Roadmap

- [ ] Mercado de pilotos y contratos
- [ ] Ascensos entre categorías con requisitos
- [ ] Clima dinámico en carrera (ya modelado el neumático de lluvia)
- [ ] Patrocinadores con objetivos
- [ ] Ligas asíncronas (comparar tu carrera con otros)
- [ ] Guardado en IndexedDB para partidas más grandes
