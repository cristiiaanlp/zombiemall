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

## Idiomas 🌐
- **Español e inglés**, con selector (botón **ES/EN** en el menú; también en la barra inferior del menú).
- Auto-detecta el idioma del navegador en el primer arranque; la elección se guarda en `localStorage`.
- Todo localizado: menús, tutorial, tiendas, cartas, mejoras, eventos/avisos, banners y fin de partida.

## Iconos 🖼️
- Adiós a los emojis del sistema (se veían inconsistentes). Ahora hay un **set de iconos
  vectoriales propios** dibujado en canvas (`drawIcon`), usado tanto en el juego (parcelas,
  mall, comerciante, saboteador) como en los menús (vía data-URL cacheada, sin peticiones).
- Cubre las 12 tiendas, las 13 cartas de mejora, las mejoras meta y los iconos de HUD
  (dinero, oleada, tiempo, fama, supervivientes, boost…). Cero dependencias externas.

## Estilo visual 🎨
Identidad propia "centro comercial neón apocalíptico" (nada de azul-marino genérico):
- **Paleta**: púrpura profundo de fondo, **magenta** neón (primario), **lima ácido**,
  **oro** (dinero) y **cian** (héroe/acentos).
- **Tipografías**: **Bungee** (rótulos/logo, estilo cartel de mall) + **Rajdhani** (UI/HUD).
- **Efectos**: glows neón, viñeta, líneas CRT sutiles, rejilla de suelo, fondo animado en menús,
  sprites con contorno + aura del héroe para máxima legibilidad.
- Truco de desarrollo: abre `index.html#play` para entrar directo a una partida (para QA/capturas).

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

## Integración CrazyGames SDK v3 (auditada con la documentación oficial)
`game.js` incluye el wrapper `CG` que, con el SDK disponible, llama exactamente:
- `await SDK.init()` y lectura de `SDK.environment` (`local`/`crazygames`/`disabled`).
- `SDK.game.loadingStart()` → `loadingStop()` envolviendo la carga (mide el tamaño inicial).
- `SDK.game.gameplayStart()` / `gameplayStop()` al empezar/reanudar y al pausar/menú/morir.
- **Anuncios recompensados** `SDK.ad.requestAd('rewarded', …)`: revivir (1/partida con timer),
  x2 tokens, x2 ingresos. **Nunca** recompensa en `adError`. Botones con alternativa no-ad.
- **Anuncios midgame** `SDK.ad.requestAd('midgame', …)` solo en transiciones (reintentar /
  volver al menú), con **cooldown propio de 3 min** además del que aplica el SDK.
- Durante **cualquier** anuncio: se **silencia el audio** (`adMute`) y se **pausa el juego**;
  se restaura solo al `adFinished`/`adError` (no al pedirlo). Reentradas bloqueadas (`busy`).
- `SDK.game.happytime()` en hitos positivos (con moderación).

Todo degrada con elegancia si el SDK no está (try/catch + fallback para test local).

## Checklist de aceptación CrazyGames (verificado)
- [x] HTML5 puro, sin plugins, funciona en iframe; **rutas relativas** (sin absolutas).
- [x] **Cero peticiones externas** salvo el SDK: fuentes **auto-alojadas** en `fonts/*.woff2`.
- [x] Tamaño mínimo (KB), muy por debajo de los límites (50 MB inicial / 250 MB total).
- [x] Responsive a cualquier aspecto 16:9; **móvil y escritorio**; **DPR=1** en iOS/baja memoria.
- [x] Soporta **ratón, teclado y táctil**; horizontal obligado con aviso de rotación en vertical.
- [x] `loadingStart/Stop` + `gameplayStart/Stop` correctos; carga con progreso sin estados rotos.
- [x] **Mute** persistente; pausa en `blur` y `visibilitychange`; **AudioContext** se reanuda por gesto (iOS).
- [x] Anuncios solo vía SDK, en transiciones, con mute+pausa y cooldown; el juego **funciona sin ads** (Basic Launch).
- [x] `localStorage` solo para guardado (permitido); sin cookies de tracking ni SDKs de terceros.
- [x] Sin enlaces externos ni cross-promo en el juego; sin contenido prohibido.
- [x] Funciona **offline** tras la carga (sin dependencia dura del SDK).

## Empaquetado para subir
1. Borra `_smoketest.js` (solo desarrollo). `GDD.md`/`README.md` son opcionales.
2. Comprime `index.html`, `style.css`, `game.js` y la carpeta `fonts/` en un `.zip`.
3. Súbelo al portal de desarrolladores de CrazyGames (pruébalo antes en `crazygames.com/preview`).

## Próximos pasos sugeridos (ver GDD §15)
Más tipos de enemigo y supervivientes con IA, recompensa diaria, logros, varios héroes y
zonas, modo infinito con leaderboard, audio completo y arte.

---
Hecho como prototipo jugable (alcance MVP) del concepto descrito en `GDD.md`.
