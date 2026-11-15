El documento debe servir como especificación técnica y briefing de producción para entregárselo directamente a una IA de programación (ChatGPT, Codex, Claude Code, etc.).

He integrado las decisiones y referencias que hemos definido:

- Juego de lucha arcade inspirado en Street Fighter.
- Navegador, HTML5 y TypeScript.
- Phaser como motor.
- Dos luchadores basados en las fotografías proporcionadas.
- Plaza de la Candelaria de Cádiz como escenario.
- Pixel art de calidad arcade de 16 bits.
- Prioridad absoluta a la coherencia gráfica, animaciones y acabado visual.
- Arquitectura preparada para ampliar el juego sin rehacer el motor.

Una precisión importante: las imágenes generadas hasta ahora son láminas de referencia de personajes, no spritesheets de producción válidos. El proyecto deberá convertir esos diseños en recursos gráficos individuales, transparentes y correctamente alineados.

# STREET FIGHTER CÁDIZ

## Especificación técnica y plan de desarrollo

**Tipo de proyecto:** videojuego de lucha arcade 2D\
**Plataforma:** navegador web\
**Tecnología:** Phaser + TypeScript + Vite\
**Estética:** Pixel art arcade de 16 bits\
**Prioridad:** calidad gráfica, animaciones y experiencia de juego\
**Versión:** MVP ampliable

---

# 1. Visión del proyecto

Desarrollar un videojuego de lucha 2D inspirado en los clásicos arcade de los años 90, especialmente Street Fighter II.

El juego enfrentará a dos personajes originales basados visualmente en las fotografías proporcionadas por el usuario, utilizando como primer escenario la Plaza de la Candelaria de Cádiz.

El resultado debe transmitir la sensación de estar jugando a una recreativa clásica, pero con un acabado gráfico cuidado y una implementación web moderna.

## Objetivos principales

1. Crear dos personajes reconocibles y visualmente consistentes.
2. Conseguir animaciones fluidas y naturales.
3. Desarrollar un sistema de combate con ataques, defensas y colisiones.
4. Recrear la Plaza de la Candelaria como escenario arcade.
5. Conseguir una experiencia jugable directamente desde el navegador.
6. Diseñar una arquitectura que permita incorporar más luchadores y escenarios posteriormente.

## Principios de desarrollo

- Calidad visual antes que cantidad de contenido.
- Dos personajes bien ejecutados antes que muchos personajes mediocres.
- Animaciones consistentes antes que efectos visuales excesivos.
- Arquitectura modular.
- Separación completa entre lógica de combate y recursos gráficos.
- Sin dependencias innecesarias.
- Interfaz sencilla, inspirada en las recreativas originales.

---

# 2. Stack tecnológico

| Tecnología               | Responsabilidad                                    |
| ------------------------ | -------------------------------------------------- |
| Phaser 3                 | Motor de videojuegos 2D                            |
| TypeScript               | Programación y tipado                              |
| Vite                     | Servidor local y compilación                       |
| HTML5 Canvas / WebGL     | Renderizado                                        |
| Aseprite                 | Edición y corrección de pixel art                  |
| PixelLab                 | Generación asistida de personajes y animaciones    |
| JSON                     | Configuración de personajes, ataques y animaciones |
| Web Audio / Phaser Audio | Efectos de sonido y música                         |

## Decisiones técnicas

### Phaser

Será el responsable de:

- Renderizado de personajes y escenarios.
- Gestión de escenas.
- Animaciones.
- Cámara.
- Audio.
- Entrada de teclado y mandos.
- Gestión de efectos visuales.

No utilizar React para representar los elementos del combate. El juego se renderizará íntegramente mediante Phaser.

### TypeScript

Toda la lógica debe estar tipada.

Evitar utilizar un único archivo con toda la lógica del juego.

### Vite

Utilizar Vite para:

- Desarrollo local.
- Hot reload.
- Compilación.
- Optimización de recursos.
- Despliegue estático.

---

# 3. Dirección artística

## 3.1. Estética general

Pixel art de calidad arcade de 16 bits, inspirado en los videojuegos clásicos de lucha.

Características:

- Pixel art detallado.
- Personajes con siluetas reconocibles.
- Contornos definidos.
- Sombras y luces coherentes.
- Paletas cromáticas controladas.
- Animaciones expresivas.
- Escenarios con profundidad visual.
- Efectos de impacto visibles.

No debe parecer un juego de pixel art minimalista ni una ilustración convencional convertida automáticamente en píxeles.

Debe parecer un videojuego arcade diseñado por un equipo de artistas especializado en videojuegos 2D.

## 3.2. Resolución y escalado

Configuración inicial:

| Parámetro                       | Valor                     |
| ------------------------------- | ------------------------- |
| Resolución interna              | 640 × 360 px              |
| Relación de aspecto             | 16:9                      |
| Altura orientativa del luchador | 128-160 px                |
| Escalado                        | Entero cuando sea posible |
| Interpolación                   | Nearest Neighbor          |
| Fondo                           | Capas independientes      |
| Renderizado                     | Pixel perfect             |

La resolución de los personajes deberá adaptarse a su complejidad real. No forzar todos los recursos a 128 × 128 si necesitan más espacio.

En Phaser:

- `pixelArt: true`
- `roundPixels: true`
- Escalado proporcional.
- Evitar interpolaciones que produzcan desenfoque.

---

# 4. Personajes

El juego contará inicialmente con dos luchadores.

Ambos deben conservar su identidad visual respecto a las fotografías proporcionadas.

Las láminas de personajes generadas previamente son referencias de dirección artística y diseño. No deben utilizarse directamente como imágenes de juego ni como atlas de sprites.

## 4.1. Luchador 1: El Guerrero

**Referencia:** primera fotografía proporcionada.

### Características físicas

- Hombre adulto.
- Complexión fuerte y robusta.
- Cabello oscuro.
- Barba abundante.
- Cejas marcadas.
- Expresión seria.

### Vestimenta

- Chaqueta acolchada azul oscuro.
- Sudadera gris con capucha.
- Pantalones vaqueros azules.
- Zapatillas deportivas blancas.

### Personalidad de combate

Arquetipo de luchador resistente y contundente.

| Atributo    | Valor inicial |
| ----------- | ------------- |
| Fuerza      | 4/5           |
| Velocidad   | 2/5           |
| Técnica     | 3/5           |
| Resistencia | 5/5           |

### Estilo de combate

- Golpes contundentes.
- Movimientos algo más lentos.
- Patadas de media distancia.
- Gran resistencia.

## 4.2. Luchador 2: El Viajero

**Referencia:** segunda fotografía proporcionada.

### Características físicas

- Hombre adulto.
- Complexión media.
- Cabello oscuro y ligeramente despeinado.
- Rostro alargado.
- Expresión tranquila.

### Vestimenta

- Americana gris de cuadros.
- Camiseta verde turquesa.
- Pantalones vaqueros azules.
- Zapatos marrones.

### Personalidad de combate

Arquetipo de luchador técnico y ágil.

| Atributo    | Valor inicial |
| ----------- | ------------- |
| Fuerza      | 3/5           |
| Velocidad   | 4/5           |
| Técnica     | 5/5           |
| Resistencia | 3/5           |

### Estilo de combate

- Ataques rápidos.
- Movimientos técnicos.
- Patadas ágiles.
- Mayor facilidad para encadenar golpes.

Los atributos son valores iniciales de diseño, no características definitivas.

---

# 5. Producción de sprites y animaciones

Esta es una de las partes más importantes del proyecto.

La calidad de los personajes dependerá principalmente de la coherencia entre sus frames.

## 5.1. Herramientas

- PixelLab: generación de personajes y animaciones.
- Aseprite: corrección manual de sprites.
- Phaser: reproducción de animaciones.

## 5.2. Proceso de creación

Cada personaje deberá seguir exactamente el mismo proceso.

1. Crear una ilustración de referencia.
2. Aprobar anatomía, proporciones, ropa y colores.
3. Crear el sprite base en posición de reposo.
4. Establecer una escala y una línea de suelo.
5. Generar las animaciones utilizando el sprite aprobado como referencia.
6. Revisar individualmente todos los frames.
7. Corregir deformaciones y diferencias de proporciones.
8. Exportar los spritesheets.
9. Crear los metadatos de animación.
10. Probar los sprites dentro de Phaser.

### Reglas de coherencia

Todos los frames deben mantener:

- Misma anatomía.
- Mismo tamaño de cabeza.
- Mismas proporciones corporales.
- Misma vestimenta.
- Misma paleta cromática.
- Misma iluminación.
- Mismo estilo de pixel art.
- Misma orientación.
- Misma línea de suelo.

No aceptar animaciones en las que el personaje cambie de aspecto entre frames.

## 5.3. Animaciones obligatorias

Cada personaje tendrá las siguientes animaciones:

| Animación   | Frames orientativos | Reproducción      |
| ----------- | ------------------- | ----------------- |
| Idle        | 6-8                 | Loop              |
| Walk        | 6-8                 | Loop              |
| Jump        | 6-8                 | Una vez           |
| Crouch      | 2-3                 | Estática          |
| Punch       | 5-7                 | Una vez           |
| Heavy Punch | 6-8                 | Una vez           |
| Kick        | 6-8                 | Una vez           |
| Heavy Kick  | 7-9                 | Una vez           |
| Jump Kick   | 6-8                 | Una vez           |
| Block       | 2-4                 | Mientras defiende |
| Hit         | 3-5                 | Una vez           |
| Knockdown   | 5-7                 | Una vez           |
| KO          | 6-8                 | Una vez           |
| Victory     | 5-8                 | Loop o una vez    |

Los números son orientativos. La animación debe tener los frames necesarios para resultar fluida.

## 5.4. Especificaciones de exportación

- Formato PNG.
- Fondo transparente.
- Spritesheets organizados por animación.
- Tamaño de celda consistente por personaje.
- Punto de origen definido.
- Sin sombras de fondo incorporadas artificialmente.
- Sin texto ni etiquetas dentro de los sprites.
- Sin márgenes innecesarios.
- Metadatos JSON.

Ejemplo:

```
assets/fighters/warrior/
├── portrait.png
├── idle.png
├── walk.png
├── jump.png
├── crouch.png
├── punch.png
├── heavy-punch.png
├── kick.png
├── heavy-kick.png
├── jump-kick.png
├── block.png
├── hit.png
├── knockdown.png
├── ko.png
├── victory.png
└── animations.json
```

El segundo personaje utilizará exactamente la misma estructura.

## 5.5. Control de calidad gráfico

Antes de aprobar un spritesheet:

- Revisar que no existan deformaciones.
- Comprobar que los pies no cambien de altura sin justificación.
- Comprobar la continuidad del movimiento.
- Revisar las transiciones entre frames.
- Verificar que no aparezcan píxeles aislados.
- Confirmar que el personaje conserva su identidad.
- Comprobar la transparencia real del PNG.

**No utilizar una lámina de presentación como spritesheet. Cada animación debe exportarse como recurso independiente.**

---

# 6. Escenario: Plaza de la Candelaria de Cádiz

## 6.1. Referencia visual

Utilizar la fotografía proporcionada por el usuario de la Plaza de la Candelaria.

La referencia principal es el edificio histórico de Correos y su entorno.

El escenario debe ser reconocible como la plaza real, pero adaptado a una perspectiva lateral de videojuego arcade.

## 6.2. Dirección artística

- Pixel art arcade de 16 bits.
- Colores cálidos.
- Cielo azul intenso.
- Edificio de ladrillo rojizo y piedra clara.
- Plaza adoquinada.
- Farolas ornamentales.
- Floristerías.
- Terrazas.
- Árboles.
- Arquitectura gaditana.

No convertir el escenario en una ilustración genérica de una ciudad.

La identidad de la Plaza de la Candelaria debe conservarse.

## 6.3. Composición

El escenario tendrá tres planos:

**Plano 1: fondo**

- Cielo.
- Edificios secundarios.
- Elementos arquitectónicos lejanos.

**Plano 2: escenario principal**

- Edificio de Correos.
- Farolas.
- Comercios.
- Floristerías.
- Terrazas.
- Árboles.

**Plano 3: primer plano**

- Suelo adoquinado.
- Sombras.
- Elementos decorativos cercanos.

Los personajes deben tener suficiente espacio para desplazarse y luchar.

## 6.4. Especificaciones

| Parámetro          | Valor                  |
| ------------------ | ---------------------- |
| Resolución interna | 640 × 360              |
| Formato            | PNG                    |
| Orientación        | Horizontal             |
| Capas              | Independientes         |
| Profundidad        | Parallax opcional      |
| Suelo              | Línea horizontal común |
| Personajes         | Primer plano           |

El escenario no debe contener barras de vida, temporizadores ni otros elementos de interfaz. Estos pertenecen al HUD.

La imagen generada anteriormente con la interfaz arcade servirá como referencia visual, pero debe separarse el escenario de la interfaz.

## 6.5. Animaciones ambientales

Opcionales para la primera versión:

- Hojas moviéndose.
- Luces ambientales.
- Público en segundo plano.
- Movimiento sutil de elementos de las terrazas.
- Pequeñas animaciones de ambiente.

No sacrificar rendimiento ni legibilidad por estos efectos.

---

# 7. Arquitectura del videojuego

La arquitectura debe separar los sistemas de combate, personajes, animaciones, controles y escenarios.

## 7.1. Diagrama general

```
GAME
│
├── SCENES
│   ├── BootScene
│   ├── PreloadScene
│   ├── MenuScene
│   ├── FightScene
│   └── ResultScene
│
├── FIGHTERS
│   ├── Fighter
│   ├── FighterState
│   ├── FighterController
│   └── FighterAI
│
├── COMBAT
│   ├── CombatEngine
│   ├── Hitbox
│   ├── Hurtbox
│   ├── MoveData
│   └── DamageCalculator
│
├── SYSTEMS
│   ├── InputManager
│   ├── AnimationManager
│   ├── AudioManager
│   ├── CameraManager
│   └── RoundManager
│
├── STAGES
│   └── PlazaCandelaria
│
└── UI
    ├── HUD
    ├── HealthBar
    ├── Timer
    ├── Score
    └── RoundMessage
```

## 7.2. Máquina de estados

Cada luchador tendrá una máquina de estados independiente.

Estados:

```
IDLE
WALK_FORWARD
WALK_BACKWARD
JUMP
CROUCH
ATTACK
BLOCK
HIT
STUNNED
KNOCKDOWN
GET_UP
KO
VICTORY
```

Reglas:

- No permitir ejecutar cualquier acción desde cualquier estado.
- Los ataques tendrán prioridad sobre movimientos incompatibles.
- El personaje no podrá caminar durante determinadas animaciones.
- El bloqueo tendrá restricciones.
- Los estados de daño y KO bloquearán acciones.
- Las transiciones deben estar centralizadas.

## 7.3. Sistema de orientación

Los personajes siempre deberán mirar hacia el adversario.

Implementar:

- Detección de posición relativa.
- Cambio de orientación automático.
- Inversión horizontal del sprite.
- Corrección de hitboxes según orientación.

Evitar duplicar todos los sprites para izquierda y derecha cuando Phaser pueda resolver la inversión horizontal.

---

# 8. Motor de combate

El sistema de combate será independiente de los recursos gráficos.

## 8.1. Movimiento

Movimientos básicos:

- Avanzar.
- Retroceder.
- Saltar.
- Agacharse.
- Bloquear.

Los personajes estarán limitados a una zona horizontal del escenario.

No podrán abandonar los límites de la arena.

## 8.2. Ataques

Ataques iniciales:

| Ataque          | Tipo   | Potencia |
| --------------- | ------ | -------- |
| Puñetazo        | Ligero | 5        |
| Puñetazo fuerte | Pesado | 10       |
| Patada          | Ligero | 7        |
| Patada fuerte   | Pesado | 12       |
| Patada en salto | Aéreo  | 10       |

Valores iniciales de equilibrio, configurables mediante JSON.

## 8.3. Hitboxes y hurtboxes

No utilizar el tamaño completo del sprite para determinar los impactos.

Implementar dos tipos de áreas:

**Hurtbox**

Zona del personaje que puede recibir golpes.

**Hitbox**

Zona activa del ataque que puede producir daño.

Las hitboxes deben:

- Activarse únicamente durante los frames de impacto.
- Seguir el movimiento del personaje.
- Respetar su orientación.
- Desactivarse al terminar el ataque.
- Evitar contabilizar varias veces el mismo impacto.

Las hurtboxes deben poder variar durante las animaciones.

## 8.4. Frame data

Cada movimiento tendrá:

- Startup: preparación del golpe.
- Active: frames durante los que impacta.
- Recovery: recuperación.
- Damage: daño.
- Range: alcance.
- Hitstun: reacción del rival.
- Blockstun: reacción al bloqueo.

Ejemplo:

```
{
  "id": "heavy_punch",
  "damage": 10,
  "startup": 5,
  "active": 3,
  "recovery": 12,
  "hitstun": 15,
  "blockstun": 8,
  "range": 52
}
```

Estos valores son ilustrativos. Deberán ajustarse mediante pruebas de juego.

## 8.5. Sistemas adicionales

Implementar:

- Input buffer.
- Bloqueo.
- Daño.
- Empuje al recibir impactos.
- Aturdimiento.
- Combos básicos.
- Recuperación.
- KO.
- Control de rondas.

El juego debe evitar que los personajes puedan ejecutar ataques infinitos o bloquear indefinidamente sin consecuencias.

---

# 9. Controles

## Jugador 1

| Acción     | Tecla |
| ---------- | ----- |
| Avanzar    | D     |
| Retroceder | A     |
| Saltar     | W     |
| Agacharse  | S     |
| Puñetazo   | F     |
| Patada     | G     |
| Bloquear   | R     |

## Jugador 2

En la primera versión, el segundo jugador estará controlado por una IA básica.

Preparar la arquitectura para incorporar posteriormente un segundo jugador humano.

## Gamepad

Dejar preparado soporte para mandos mediante Gamepad API o el sistema de entrada de Phaser.

No es obligatorio para el primer MVP.

---

# 10. Inteligencia artificial del rival

El segundo luchador tendrá una IA básica.

No necesita utilizar modelos de inteligencia artificial generativa.

Debe funcionar mediante reglas y estados.

Comportamientos:

- Acercarse al jugador.
- Mantener una distancia de combate.
- Atacar cuando exista oportunidad.
- Bloquear ataques previsibles.
- Retroceder cuando tenga poca vida.
- Saltar ocasionalmente.
- Ejecutar combinaciones sencillas.

Niveles iniciales:

1. Fácil: movimientos lentos y ataques poco frecuentes.
2. Normal: alterna ataques y defensas.
3. Difícil: detecta distancias, aprovecha aperturas y castiga errores.

La dificultad debe ser configurable.

La IA no debe conocer directamente las pulsaciones del usuario ni reaccionar de forma instantánea a ellas.

---

# 11. HUD e interfaz

La interfaz estará inspirada en los juegos arcade clásicos.

## Elementos obligatorios

- Barra de vida del jugador 1.
- Barra de vida del jugador 2.
- Nombre de cada luchador.
- Temporizador central.
- Indicador de ronda.
- Marcador de victorias.
- Mensajes de inicio.
- Mensajes de victoria y derrota.

## Diseño

- Tipografía pixel art legible.
- Barras de vida horizontales.
- Colores contrastados.
- Diseño simétrico.
- Elementos colocados en la parte superior.
- No tapar la zona de combate.

## Pantallas

**Menú inicial**

- Título.
- Jugar.
- Instrucciones.

**Pantalla de combate**

- Escenario.
- Personajes.
- HUD.

**Pantalla de resultado**

- Ganador.
- Marcador.
- Revancha.

No sobrecargar la interfaz con menús innecesarios.

---

# 12. Efectos visuales y sonido

Los pequeños detalles deben aportar sensación de impacto.

## Efectos visuales

- Flash al recibir un golpe.
- Partículas de impacto.
- Pequeña sacudida de cámara.
- Efectos de polvo al caminar o aterrizar.
- Efectos especiales en ataques fuertes.
- Animaciones de transición.
- Hit stop.

El hit stop debe ser breve y configurable. No debe congelar permanentemente la lógica del juego.

## Audio

Sonidos necesarios:

- Puñetazo.
- Patada.
- Golpe recibido.
- Bloqueo.
- Salto.
- Aterrizaje.
- KO.
- Victoria.
- Inicio de combate.

Añadir música arcade en segundo plano.

Utilizar recursos originales o con licencias compatibles con el proyecto.

---

# 13. Estructura completa del proyecto

```
street-fighter-cadiz/
│
├── public/
│   └── assets/
│       ├── fighters/
│       │   ├── warrior/
│       │   └── traveler/
│       │
│       ├── stages/
│       │   └── plaza-candelaria/
│       │
│       ├── effects/
│       ├── audio/
│       ├── fonts/
│       └── ui/
│
├── src/
│   ├── main.ts
│   │
│   ├── game/
│   │   ├── config/
│   │   ├── scenes/
│   │   ├── fighters/
│   │   ├── combat/
│   │   ├── systems/
│   │   ├── stages/
│   │   └── ui/
│   │
│   ├── data/
│   │   ├── fighters/
│   │   ├── moves/
│   │   └── stages/
│   │
│   └── utils/
│
├── tests/
│   ├── combat/
│   ├── fighters/
│   └── systems/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

La estructura debe permitir incorporar personajes y escenarios adicionales mediante configuración y recursos, sin modificar el motor de combate.

---

# 14. Fases de desarrollo

## Fase 1. Preparación del proyecto

- Configurar Phaser.
- Configurar TypeScript.
- Configurar Vite.
- Crear escenas.
- Preparar resolución interna.
- Configurar escalado.
- Preparar carga de recursos.

**Resultado:** proyecto ejecutándose en navegador.

## Fase 2. Prototipo de combate

- Crear dos personajes provisionales.
- Movimiento.
- Orientación.
- Salto.
- Ataques.
- Hitboxes.
- Hurtboxes.
- Barras de vida.

**Resultado:** dos personajes capaces de luchar.

## Fase 3. Producción de personajes

- Diseño definitivo del Guerrero.
- Diseño definitivo del Viajero.
- Generación de sprites.
- Animaciones.
- Corrección manual.
- Exportación.
- Integración.

**Resultado:** dos personajes visualmente completos.

## Fase 4. Escenario

- Recreación pixel art de la Plaza de la Candelaria.
- Capas.
- Suelo.
- Elementos ambientales.
- Integración de personajes.

**Resultado:** escenario arcade completo.

## Fase 5. Combate avanzado

- Bloqueos.
- Combos.
- Frame data.
- Reacciones.
- IA del rival.
- Dificultad.
- Equilibrado.

**Resultado:** juego de lucha funcional.

## Fase 6. Pulido

- Efectos visuales.
- Sonido.
- HUD.
- Menús.
- Transiciones.
- Optimización.
- Pruebas.

**Resultado:** primera versión publicable.

---

# 15. Rendimiento y compatibilidad

El juego debe funcionar en navegadores modernos.

Objetivos:

- 60 FPS estables en equipos de escritorio compatibles.
- Carga inicial optimizada.
- Spritesheets comprimidos y organizados.
- Evitar cargar recursos innecesarios.
- No generar objetos continuamente dentro del bucle principal.
- Reutilizar partículas cuando sea conveniente.
- Controlar la memoria.
- Mantener el renderizado independiente de la lógica de combate.

## Responsive

El juego debe adaptarse a distintas dimensiones.

En pantallas estrechas:

- Mantener proporciones.
- No deformar personajes.
- No cortar el escenario.
- Mostrar controles táctiles si se incorpora soporte móvil.

La primera versión estará optimizada principalmente para escritorio.

---

# 16. Pruebas y control de calidad

## Calidad gráfica

- Los dos personajes conservan sus rasgos originales.
- Las animaciones no presentan deformaciones.
- Los sprites tienen transparencia real.
- Las proporciones son consistentes.
- Los personajes comparten escala.
- No hay saltos visuales entre frames.
- El escenario es reconocible como la Plaza de la Candelaria.
- El pixel art no aparece borroso.

## Calidad de combate

- Los controles responden correctamente.
- Los personajes no atraviesan los límites.
- Las hitboxes funcionan correctamente.
- Las hurtboxes siguen el personaje.
- Los ataques producen el daño correcto.
- El bloqueo funciona.
- El salto funciona.
- Las animaciones corresponden a los estados.
- El KO termina correctamente la ronda.
- La IA no ejecuta acciones imposibles.

## Calidad técnica

- No existen errores de consola.
- No hay recursos faltantes.
- El juego mantiene una tasa de frames estable.
- La ventana del navegador se redimensiona correctamente.
- Los controles funcionan en los navegadores objetivo.

---

# 17. Criterios de aceptación del MVP

El proyecto no se considerará terminado hasta cumplir estos requisitos:

1. El juego se ejecuta directamente en navegador.
2. Aparecen los dos luchadores definitivos.
3. Los personajes tienen sus animaciones principales.
4. El escenario de la Plaza de la Candelaria está integrado.
5. Se puede mover, saltar, atacar y bloquear.
6. Existe un sistema funcional de daño.
7. El rival dispone de una IA básica.
8. El HUD muestra vida y temporizador.
9. Existe una condición de victoria y derrota.
10. El juego mantiene un rendimiento adecuado.
11. Los recursos gráficos están organizados y documentados.
12. El proyecto puede ampliarse sin rehacer su arquitectura.

---

# 18. Instrucciones para la IA desarrolladora

La IA que implemente este proyecto debe respetar las siguientes instrucciones.

## Forma de trabajar

- No desarrollar todo en un único archivo.
- No utilizar recursos gráficos genéricos si existen referencias específicas.
- No sustituir los personajes por figuras geométricas en la versión final.
- No utilizar las láminas de presentación como spritesheets.
- No inventar frames faltantes mediante estiramientos o deformaciones.
- No generar animaciones independientes sin respetar el diseño original.
- No mezclar lógica de combate con lógica de representación gráfica.
- No duplicar código entre personajes.
- No añadir dependencias innecesarias.

## Gestión de recursos gráficos

Si los sprites definitivos no están disponibles:

1. Preparar la estructura de carga.
2. Crear placeholders claramente identificados.
3. Definir los formatos y metadatos necesarios.
4. No fingir que las animaciones están terminadas.
5. Documentar los recursos pendientes.

La IA puede asistir en la producción gráfica, pero debe validar cada recurso antes de integrarlo.

## Entregas incrementales

Cada fase debe dejar el proyecto ejecutable.

Al finalizar cada fase:

- Ejecutar el proyecto.
- Comprobar errores.
- Validar el resultado.
- Actualizar README.
- Documentar decisiones técnicas.

No avanzar ocultando errores de fases anteriores.

---

# 19. Orden de prioridades

| Prioridad | Elemento                               |
| --------- | -------------------------------------- |
| P0        | Calidad y coherencia de los personajes |
| P0        | Animaciones de combate                 |
| P0        | Motor de combate                       |
| P0        | Escenario de Cádiz                     |
| P1        | Hitboxes y frame data                  |
| P1        | HUD arcade                             |
| P1        | IA del rival                           |
| P1        | Efectos de impacto                     |
| P2        | Música y sonidos                       |
| P2        | Menú y selección de personajes         |
| P3        | Más personajes                         |
| P3        | Más escenarios                         |
| P3        | Multijugador online                    |

---

# 20. Resultado esperado

Un videojuego de lucha arcade en navegador con:

- Dos luchadores originales basados en las fotografías proporcionadas.
- Pixel art de calidad 16 bits.
- Animaciones fluidas y consistentes.
- Escenario de la Plaza de la Candelaria de Cádiz.
- Sistema de combate completo para el MVP.
- Rival controlado por IA.
- HUD inspirado en las recreativas clásicas.
- Arquitectura modular y ampliable.
- Código mantenible y documentado.

**La prioridad no es hacer un juego grande. Es conseguir que los dos personajes, sus animaciones y el escenario tengan suficiente calidad como para que el resultado parezca un auténtico juego arcade.**

---

# 21. Primera tarea que debe ejecutar la IA

No comenzar implementando todo el juego.

El primer objetivo es producir y validar los recursos gráficos de los dos personajes.

Orden de ejecución:

1. Analizar las dos fotografías originales.
2. Analizar las dos láminas de referencia generadas.
3. Definir la guía gráfica compartida.
4. Crear el sprite base definitivo del Guerrero.
5. Crear el sprite base definitivo del Viajero.
6. Validar ambos diseños juntos para comprobar escala, proporciones y estilo.
7. Producir una animación Idle completa para cada personaje.
8. Validar visualmente las animaciones.
9. Continuar con las animaciones de combate.
10. Preparar la exportación final para Phaser.

**Condición para avanzar:** no producir todas las animaciones hasta que los dos sprites base y sus animaciones Idle hayan sido aprobados visualmente.

El primer entregable será un paquete gráfico funcional de ambos luchadores, no una demostración estática ni una lámina de presentación.

## Orden recomendado de ejecución

Mi recomendación es entregar este documento a la IA de programación y darle primero únicamente la tarea 21.

No le pediría implementar simultáneamente los gráficos, el motor de combate y el escenario. El mayor riesgo del proyecto está en la consistencia gráfica. Es preferible validar primero los dos personajes antes de invertir tiempo en el resto.