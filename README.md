# Street Cai

Juego de lucha arcade 2D en el navegador (escritorio y móvil), ambientado en Cádiz.

- **Luchadores:** Chapa (El Guerrero), Ares (El Viajero), Alba (El Marinero) y Martín (El Veterano).
- **Escenarios:** el barrio de cada luchador (Candelaria, Santa María, La Caleta y Teatro Falla) y la Plaza de las Flores. En la selección: "BARRIO RIVAL" (se lucha en el barrio del rival, como en las recreativas) o "AL AZAR" (cualquiera, incluida la Plaza).

## Modo demo

Tras 20 s sin tocar nada en la portada arranca un combate de exhibición CPU contra CPU (luchadores y escenario al azar). Cualquier tecla o toque vuelve a la portada. `?screen=demo` lo abre directamente.

## Portada

Puerta de Tierra de fondo. La primera vez se ve una intro de unos 3 s: la cámara se abre desde la torre, las letras de STREET caen una a una, CAI se estampa con destello, onda y explosión de papelillos, y un brillo recorre el título. Después queda el balanceo en bucle y el botón INSERT COIN (ranura de 25¢): Enter o un toque echan la moneda, suena, aparece CREDIT 1 y pasa a la selección. Durante la intro, Enter (o un toque) la salta; `?introAt=N` la congela en el frame N para pruebas.

## Selección de luchador

Al estilo de las recreativas: arriba el mapa de Cádiz con el barrio de cada luchador (Chapa en el Baluarte de la Candelaria, Ares en la playa de Santa María del Mar, Alba en La Caleta y Martín en el Teatro Falla). El cursor 1P (y 2P) se desliza por el mapa al cambiar de luchador. Abajo, el retrato grande del elegido y la fila de caras; las opciones de modo, dificultad y escenario van en la esquina del mar. Se puede elegir tocando la cara o el barrio en el mapa.

## Modos

- **1P Arcade:** eliges luchador y te enfrentas a los otros tres en orden aleatorio, con pantalla de VS antes de cada combate. Si pierdes, CONTINUE repite el mismo rival; si ganas a los tres, eres campeón.
- **2 jugadores:** cada uno elige su luchador (no puede repetirse) y combaten en el mismo teclado.

## Arrancar

```bash
npm install
npm run dev      # servidor en http://localhost:5173 y en la IP de la red local (para el móvil)
npm run build    # typecheck + build estático en dist/
npm run preview  # sirve dist/
npm test         # simulación headless IA contra IA
npx tsx tests/balance.ts 40   # equilibrio todos contra todos (40 partidas por cruce)
```

Para jugar en el móvil: mismo wifi, abrir `http://<IP-del-PC>:5173`. Se puede añadir a la pantalla de inicio (PWA).

## Controles

| Acción | J1 | J1 alternativo (solo 1P) | J2 (modo 2 jugadores) | Táctil |
|---|---|---|---|---|
| Mover / saltar / agacharse | WASD | Flechas | Flechas | Joystick |
| Puño flojo / fuerte | F / T | Z / C | J / U | P / PF |
| Patada floja / fuerte | G / Y | X / V | K / I | K / KF |
| Bloquear | R (o mantener atrás) | Espacio | O | BLQ |
| Especial | H (o abajo, abajo-adelante, adelante + puño) | B | L | SP |
| Súper | Especial con la barra SUPER llena | | | SP |
| Dash | Doble toque adelante / atrás | | | Doble toque |
| Pausa | Esc / P | | | botón II |

En la selección: A/D (o flechas en 1P) mueven el cursor del J1, las flechas el del J2 en modo 2 jugadores, arriba/abajo cambian la dificultad, `E` cambia el escenario y Enter empieza. Con ratón o táctil, en 2 jugadores cada toque en un retrato o barrio elige alternando J1 y J2. La ayuda de controles aparece en la pantalla de VS antes de cada combate.

También hay soporte básico de mando (Gamepad API). `M` silencia en los menús, `F2` muestra hitboxes/hurtboxes.

Parámetros de URL para pruebas: `?demo=alba&vs=martin&ff=600` (IA contra IA avanzando 600 frames), `?stage=caleta`, `?debug=1` (cajas), `?touch=1` (fuerza controles táctiles), `?screen=select&2p=1`, `?screen=versus&vst=80` (VS congelado), `?screen=result&final=1`, `?screen=continue&lose=martin`.

## Mecánicas

- Frame data por movimiento (startup / active / recovery / hitstun / blockstun) en `src/game/data.ts`.
- Hitboxes y hurtboxes separadas del sprite; los puños altos fallan contra un rival agachado.
- Combos por cancelación: flojo → fuerte → especial, con escalado de daño.
- Bloqueo manteniendo atrás o con el botón; barra de guardia que se rompe si se abusa (aturdimiento).
- Barra de súper que se llena al pegar y recibir: con ella llena el especial sale reforzado (más daño, derriba).
- Dash con doble toque; el dash hacia delante se puede cancelar en un ataque.
- Proyectil especial por personaje (uno en pantalla), patada en salto, derribos, hit stop, cámara lenta en el KO.
- Rondas al mejor de 3 con temporizador; IA por reglas con 3 dificultades y tiempo de reacción.

## Estructura

```
documentacion/            láminas originales y plan técnico
tools/extract_sprites.py  recorta las láminas -> atlas transparente + JSON por luchador, y los fondos
tools/extract_defeated.py retratos de derrota (pantalla de CONTINUE)
tools/extract_map.py      mapa de Cádiz de la selección (borra el cursor pintado; requiere opencv-python-headless)
public/assets/            atlas, retratos y escenarios generados
src/game/                 simulación pura (sin DOM): data, fighter, match, ai
src/engine/               assets, input (teclado/táctil/mando), audio sintetizado
src/render/               renderer de combate y HUD
src/ui/                   pantallas de menú y controles táctiles
tests/                    simulación IA vs IA
```

Añadir un luchador: lámina nueva + entrada en `tools/extract_sprites.py` y `tools/extract_defeated.py` + entrada en `FIGHTER_IDS`/`FIGHTERS` (`src/game/data.ts`). La selección, el título y el arcade se adaptan solos.

Añadir un escenario: imagen en `documentacion/` + entrada en `STAGES` de `tools/extract_sprites.py` (con su recorte: los pies quedan ~60 px de imagen sobre el borde inferior) + entrada en `STAGE_IDS`/`STAGES` (`src/game/data.ts`) y, si es el barrio de alguien, en `HOME_STAGE`.

## Decisiones respecto al plan técnico

- **Canvas 2D propio en lugar de Phaser**: menos peso en móvil, simulación determinista a 60 Hz testeable en Node y cero dependencias de runtime. La arquitectura (escenas, luchador, combate, sistemas, UI) sigue la del plan.
- **Sprites recortados de las láminas**: el plan pedía no usar las láminas como spritesheet, pero son el único arte disponible. Se recortan frame a frame con transparencia real, ancla en los pies y escala normalizada. Chapa sale entero de la lámina con croma verde (`fighter-chapa-chroma.png`). De la lámina croma de Ares solo se usan idle, walk y el retrato: en el resto de filas el personaje lleva otra ropa, así que esas siguen saliendo de la lámina original. Las láminas de Alba y Martín usan croma verde puro: se recortan con un modo más estricto que además quita la sombra pintada bajo los pies, los rótulos pegados y cualquier verde derramado sobre el personaje. Martín sale de `fighter-martin-optimo.png` (lámina regenerada con colores coherentes); en ella la fila de caminar está dibujada más grande que la de reposo y su escala lo compensa.

## Recursos gráficos pendientes

Las láminas no traen estas animaciones, así que se reutilizan frames existentes:

| Animación | Sustituto actual |
|---|---|
| Agacharse | primer frame del salto |
| Bloqueo | pose de guardia del puñetazo |
| Puño / patada fuerte | mismos frames que los flojos con otro ritmo |
| Victoria | idle con saltitos |
| Ataques agachado | no existen |

Los frames de "hit" llevan la chispa de impacto dibujada en la propia lámina.
