# CrazyGames — Submission kit (Zombie Mall Tycoon Survivor)

Everything you need to upload the game and pass QA. Copy-paste ready.

---

## 1. Game bundle (what to ZIP)

Upload a `.zip` containing **only** these (relative paths, no folder nesting above `index.html`):

```
index.html
style.css
game.js
menu_bg.jpg          (lightweight menu background; falls back to cover_landscape.png)
fonts/bungee-400.woff2
fonts/rajdhani-500.woff2
fonts/rajdhani-600.woff2
fonts/rajdhani-700.woff2
```

**Do NOT include** in the game ZIP: `GDD.md`, `README.md`, `SUBMISSION.md`,
`_smoketest.js`, `cover_*.png` (covers go to the portal form, not the bundle).

> A ready build is generated in `dist/` and zipped as `zombiemall.zip` by `build.sh`.

---

## 2. Store covers (upload on the portal, NOT in the bundle)

| File | Size | Ratio |
|---|---|---|
| `cover_landscape.png` | 1920×1080 | 16:9 |
| `cover_portrait.png` | 800×1200 | 2:3 |
| `cover_square.png` | 800×800 | 1:1 |

Rules: only the game **title** as text, no borders, no store/UI logos, not blurry.

⚠️ **Content note:** the current covers include in-world signage text (WEAPONS, GYM,
PHARMACY… and **"BIG SALE 50% OFF"**). World signage is usually accepted as art, but
"BIG SALE 50% OFF" is the riskiest item — consider regenerating without it to be safe.

---

## 3. Preview videos (REQUIRED) — how to record

Two videos, both mandatory:
- **Landscape** 1080p, 16:9
- **Portrait** 1080p, 2:3

Rules: **15–20 s max**, **≤50 MB**, **NO sound**, no mouse cursor, no opening
transitions/black screens/black bars, no promo text, no fast-forwarding.

How to capture (Windows):
1. Open the game in Chrome (windowed at the target ratio), mute the tab.
2. Use **Xbox Game Bar** (`Win+G` → record) or OBS, capture ~18 s of lively gameplay:
   show shooting zombies, money popping, building a store, a wave banner.
3. Trim to 15–20 s, export MP4 1080p, remove audio track.
4. Repeat with the browser window in a 2:3 portrait shape (or crop in an editor).

---

## 4. Portal metadata (copy-paste)

**Title:** Zombie Mall  _(short, memorable; was "Zombie Mall Tycoon Survivor" — regenerate covers with the short title)_

**Short description (EN):** Survive the zombie apocalypse while you rebuild a famous mall — every store you build makes you richer AND stronger.

**Short description (ES):** Sobrevive al apocalipsis zombi mientras reconstruyes un centro comercial famoso: cada tienda te da dinero Y poder.

**Long description (EN):**
> You're the owner of an abandoned mall when the outbreak hits. Auto-blast endless
> hordes of zombies, earn cash, and rebuild your mall store by store — each shop gives
> passive income AND a permanent combat buff. The twist: your **Refuge Fame** grows as
> you build. The more famous you get, the more survivors, traders and supplies arrive…
> but also bigger hordes, saboteurs, hidden infected infiltrators and bosses. Balance
> growth vs risk, recruit survivors, pick powerful level-up cards, and see how famous
> (and how fortified) your refuge can become. Quick runs of 10–20 minutes with
> permanent meta-upgrades between runs.

**Long description (ES):**
> Eres el dueño de un centro comercial abandonado cuando empieza el brote. Dispara en
> automático a hordas interminables, gana dinero y reconstruye tu mall tienda a tienda:
> cada una da ingresos pasivos Y un bonus de combate permanente. La gracia: tu **Fama de
> Refugio** crece al construir. Cuanta más fama, más supervivientes, comerciantes y
> suministros llegan… pero también hordas mayores, saboteadores, infiltrados infectados
> y jefes. Equilibra crecimiento y riesgo, recluta supervivientes, elige cartas de mejora
> potentes y descubre cuán famoso (y fortificado) puede ser tu refugio. Partidas de
> 10–20 min con mejoras permanentes entre rondas.

**Controls (EN):** Move: WASD / Arrows / touch joystick. Weapon auto-fires. Click/tap a
glowing plot to build & upgrade stores. Tap the trader to shop, tap an ally to quarantine
suspected infected. Esc/P to pause.

**Controls (ES):** Mover: WASD / Flechas / joystick táctil. El arma dispara sola. Toca una
parcela brillante para construir y mejorar. Toca al comerciante para comprar y a un aliado
para poner en cuarentena a posibles infectados. Esc/P para pausar.

**Genre / category:** Action · Survival · Shooter (Vampire-Survivors-like) with Tycoon/Management.

**Tags:** zombie, survival, shooter, roguelike, tycoon, management, mall, horde, bullet-heaven, upgrades, idle, base-defense, neon, mobile.

**Mobile:** Yes (landscape; portrait shows a rotate prompt).

**Languages:** English, Spanish (auto-detected, switchable in menu).

---

## 5. Pre-submit checklist (verified against docs)

- [x] HTML5, runs in iframe, relative paths only.
- [x] CrazyGames SDK v3: `init`, `loadingStart/Stop`, `gameplayStart/Stop`, rewarded + midgame ads.
- [x] Ads mute audio + pause game; restore on finish/error; 3-min cooldown; never reward on error.
- [x] No external requests except the SDK (fonts self-hosted).
- [x] Responsive 16:9; DPR=1 on iOS/low-mem; mouse + keyboard + touch.
- [x] Mute available; pause on blur & visibilitychange; AudioContext resumes on gesture (iOS).
- [x] Works fully with ads disabled (Basic Launch).
- [x] Background music + SFX, all mutable.
- [ ] **Test in `crazygames.com/preview`** before submitting (catches SDK issues live).
- [ ] **Covers at exact sizes** (1920×1080 / 800×1200 / 800×800).
- [ ] **2 preview videos** recorded (no sound, both ratios).
- [ ] **Manual playthrough** of 2–3 full runs in a browser (no crashes, no softlocks).
- [ ] Developer account created; submit → Basic Launch → Full Launch.

---

## 6. Launch flow

CrazyGames uses **Basic Launch** (ads off, limited audience) → **Full Launch** (global,
ads on). Submit the bundle + covers + videos + metadata, then watch the QA feedback in the
developer portal.
