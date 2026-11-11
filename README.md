# Street Cai

Juego de lucha arcade 2D en el navegador (escritorio y móvil), ambientado en la Plaza de las Flores de Cádiz.
Dos luchadores: **Chapa** (El Guerrero) y **Ares** (El Viajero).

## Arrancar

```bash
npm install
npm run dev      # servidor en http://localhost:5173 y en la IP de la red local (para el móvil)
npm run build    # typecheck + build estático en dist/
npm run preview  # sirve dist/
npm test         # simulación headless IA contra IA
npx tsx tests/balance.ts   # estadística de equilibrio entre personajes
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

También hay soporte básico de mando (Gamepad API). `M` silencia en los menús, `F2` muestra hitboxes/hurtboxes.

Parámetros de URL para pruebas: `?demo=1&ff=600` (IA contra IA avanzando 600 frames), `?debug=1` (cajas), `?touch=1` (fuerza controles táctiles), `?screen=select`.

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
tools/extract_sprites.py  recorta las láminas -> atlas transparente + JSON por luchador
public/assets/            atlas, retratos y escenario generados
src/game/                 simulación pura (sin DOM): data, fighter, match, ai
src/engine/               assets, input (teclado/táctil/mando), audio sintetizado
src/render/               renderer de combate y HUD
src/ui/                   pantallas de menú y controles táctiles
tests/                    simulación IA vs IA
```

Añadir un luchador: lámina nueva + entrada en `tools/extract_sprites.py` + entrada en `FIGHTERS` (`src/game/data.ts`).

## Decisiones respecto al plan técnico

- **Canvas 2D propio en lugar de Phaser**: menos peso en móvil, simulación determinista a 60 Hz testeable en Node y cero dependencias de runtime. La arquitectura (escenas, luchador, combate, sistemas, UI) sigue la del plan.
- **Sprites recortados de las láminas**: el plan pedía no usar las láminas como spritesheet, pero son el único arte disponible. Se recortan frame a frame con transparencia real, ancla en los pies y escala normalizada.

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
