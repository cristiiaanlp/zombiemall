# Zombie Mall Tycoon Survivor 🧟🏬🔫

Juego de navegador HTML5: **Vampire Survivors × Tycoon × gestión de centro comercial**.
Sobrevives a oleadas de zombis mientras reconstruyes un mall: cada tienda da **ingresos
pasivos** y un **bonus de combate**. Sin dependencias, optimizado para **CrazyGames**
(móvil + escritorio, SDK + anuncios recompensados, mute, responsive).

## Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | Punto de entrada. Carga el SDK de CrazyGames, el CSS y el juego. |
| `style.css` | Estilos de UI/HUD/menús (responsive, tap targets grandes). |
| `game.js` | Motor completo: combate, economía, tiendas, oleadas, meta, SDK, audio. |
| `GDD.md` | Documento de diseño completo (sistemas, árboles, economía, enemigos, UI). |
| `_smoketest.js` | **Solo desarrollo.** Test headless en Node (no se sirve al jugador). |

## Cómo ejecutarlo en local
El juego necesita servirse por HTTP (no abras `index.html` con `file://`, el SDK y algunos
navegadores bloquean recursos). Desde la carpeta del proyecto:

```bash
# opción A: Python
python -m http.server 8080

# opción B: Node
npx serve .      # o:  npx http-server -p 8080
```

Abre `http://localhost:8080`. Si el SDK de CrazyGames no carga (estás fuera de su iframe),
el juego **funciona igual**: los anuncios recompensados conceden la recompensa directamente
en modo standalone para que puedas probar revive / x2 / boost.

## Controles
- **Mover:** `WASD` / flechas (escritorio) · **joystick táctil** (toca y arrastra en cualquier
  parte del lienzo en móvil; aparece donde pones el dedo).
- **Disparo:** automático al zombi más cercano.
- **Construir/mejorar:** clic/toque en una **parcela** (las vacías parpadean).
- **Comerciar / cuarentena:** toca el puesto del comerciante o a un aliado superviviente.
- **Pausa:** `Esc` / `P` / botón ⏸ (también pausa al perder el foco de la pestaña).

## Móvil 📱
- **Táctil completo**: joystick virtual + toques para construir, comerciar y poner en cuarentena.
- **Horizontal**: el arena es 16:9. En **vertical** aparece un aviso "gira el dispositivo" y el
  juego se congela hasta volver a horizontal (el lienzo se re-ajusta al rotar y al aparecer/ocultar
  la barra del navegador). HUD compacto en pantallas cortas.
- Zoom/scroll desactivados (`touch-action:none`, viewport bloqueado) para que no estorben.

## Bucle de juego
Mata zombis → gana `$` y XP → construye/mejora tiendas (ingresos + buffs) → sube de nivel
y elige cartas → recluta torretas (Seguridad) → sobrevive oleadas (jefe cada 5) →
al morir ganas **Tokens** → gástalos en mejoras permanentes (menú Mejoras).

## ⭐ Refuge Fame System (mecánica única — ver GDD §16)
Tu mall se vuelve un **refugio famoso**. La **Fama** (barra visible en el HUD) sube con todo
lo que haces y es el **director de dificultad**: cuanta más fama, más **supervivientes,
comerciantes y suministros** llegan… pero también más **hordas, saboteadores, infiltrados
infectados y jefes**. Crecimiento vs Riesgo en una sola palanca.
- **Supervivientes** llegan andando al mall (protégelos) y se vuelven aliados con torreta.
- **Comerciante**: puesto temporal en el mall — tócalo para comprar curas, mercenarios, mejoras.
- **Saboteadores** 🔧 corren a inutilizar tus tiendas 12s — intercéptalos.
- **Infiltrados infectados**: algunos supervivientes están infectados (pista sutil: parpadeo
  verde). Si no los pones en **cuarentena** (toca al aliado), se convierten en zombi dentro
  del refugio. Pero poner en cuarentena a uno sano cuesta fama → decisión tensa.
- **Sprites** de personaje, zombis (por tipo), aliados, comerciante y jefe dibujados con
  animación de caminar, no círculos.

## Test headless (desarrollo)
```bash
node _smoketest.js
```
Simula DOM + Canvas, arranca una partida y ejecuta ~7.200 ticks con construcciones,
subidas de nivel, oleadas de jefe y reinicios; falla si hay errores de runtime o si el
combate no mata zombis. **Borra `_smoketest.js` antes de empacar para producción.**

## Integración CrazyGames (ya hecha)
`game.js` incluye el wrapper `CG` que llama, si el SDK está disponible:
- `SDK.init()` en el arranque.
- `game.gameplayStart()` / `gameplayStop()` al empezar/pausar/terminar partida.
- `ad.requestAd('rewarded', …)` para **revivir**, **x2 tokens** y **x2 ingresos 60s**.
- `game.happytime()` en momentos positivos.
- Mute persistente y pausa automática durante anuncios y al perder el foco.

Todo degrada con elegancia si el SDK no está (try/catch + fallback).

## Checklist de aceptación CrazyGames
- [x] HTML5 puro, sin plugins, funciona en iframe.
- [x] Carga rápida (3 archivos, sin assets pesados ni red externa salvo el SDK).
- [x] Responsive a cualquier aspecto; **móvil y escritorio**.
- [x] Pantalla de carga con progreso; sin estados rotos.
- [x] **Mute** y pausa disponibles; pausa en blur y en anuncios.
- [x] SDK + anuncios recompensados integrados (no intersticiales abusivos).
- [x] `localStorage` solo para guardado (permitido).
- [x] Sin enlaces externos ni contenido prohibido.
- [x] Funciona **offline** tras la carga (sin dependencia dura del SDK).

## Empaquetado para subir
1. Borra `_smoketest.js` y `GDD.md`/`README.md` si quieres un build mínimo (opcionales).
2. Comprime `index.html`, `style.css`, `game.js` en un `.zip`.
3. Súbelo al portal de desarrolladores de CrazyGames.

## Próximos pasos sugeridos (ver GDD §15)
Más tipos de enemigo y supervivientes con IA, recompensa diaria, logros, varios héroes y
zonas, modo infinito con leaderboard, audio completo y arte.

---
Hecho como prototipo jugable (alcance MVP) del concepto descrito en `GDD.md`.
