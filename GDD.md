# Zombie Mall Tycoon Survivor — Game Design Document

**Version:** 1.0
**Platform:** HTML5 browser (desktop + mobile), optimized for **CrazyGames**
**Genre:** Survivor (Vampire Survivors-like) × Tycoon × Base/Mall management
**Session length:** 10–20 minutes per run
**Engine:** Vanilla JS + Canvas 2D (zero dependencies, instant load)

---

## 1. High Concept

> **"You survive a zombie apocalypse while building a shopping mall."**

You're the owner of an abandoned mall during a zombie outbreak. You fight off endless
hordes (Vampire Survivors-style auto-combat) while **rebuilding the mall store by store**.
Every store you build does two things at once:

- **Generates passive cash** (tycoon loop)
- **Grants a permanent combat buff** (survivor loop)

The fantasy reads instantly from a thumbnail: a tiny hero shooting zombies in the middle
of a glowing mall that grows bigger every minute.

### Why CrazyGames will like it
- **Action in the first 3 seconds** (auto-fire, money pops).
- **Visible growth** — the mall physically expands; numbers go up constantly.
- **Readable in miniature** — perfect for thumbnails and the "5-second understand" test.
- **Natural ad slots** — rewarded video for revive / cash boost / instant build.
- **Replayable** — meta-progression + procedural wave pressure.

---

## 2. The 30-Second Onboarding (critical)

| Time | What happens | Why |
|------|--------------|-----|
| 0:00 | Player spawns in the plaza with a pistol. 3–4 slow zombies shamble in. | Immediate, non-threatening target practice. |
| 0:02 | Auto-fire kills the first zombie → **+$5 floating text + coin burst + sound**. | Instant dopamine, no tutorial text. |
| 0:05 | A glowing build plot pulses with **"BUILD CAFÉ — $20"**. | Clear single goal. |
| 0:10 | Player walks onto plot / taps it → café rises with a build animation → **"+$2/s"** ticker starts. | The tycoon hook fires; income visibly accrues. |
| 0:20 | "WAVE 1 INCOMING" banner; more zombies; second plot unlocks. | Escalation begins, player already feels powerful. |
| 0:30 | Player has 1 store, rising cash, killed ~10 zombies. | Loop fully understood, hooked. |

**Rule:** No blocking modal tutorials. Teach with pulsing highlights, arrows, and one-line
floating tips only.

---

## 3. Core Gameplay Loop

```
        ┌─────────────────────────────────────────────┐
        │                                             │
        ▼                                             │
   KILL ZOMBIES ──► EARN CASH + XP ──► BUILD / UPGRADE STORES
        ▲                                     │
        │                                     ▼
   DEFEND MALL ◄── RECRUIT SURVIVORS ◄── STORES GIVE INCOME + BUFFS
        ▲                                     │
        └────────── SURVIVE HARDER WAVES ◄────┘
```

- **Micro loop (seconds):** move, auto-fire, collect cash/XP gems.
- **Mid loop (minutes):** spend cash → build/upgrade stores → stronger buffs + more income.
- **Macro loop (per run):** survive escalating waves → beat boss → earn meta tokens.
- **Meta loop (between runs):** spend tokens → permanent upgrades, unlock stores/heroes/zones.

### Control scheme
- **Movement:** WASD / Arrow keys (desktop) · virtual joystick or tap-to-move drag (mobile).
- **Weapons:** **auto-fire** at the nearest enemy (Vampire Survivors style — no aiming required, mobile-friendly).
- **Build / interact:** click/tap a build plot or a store to open its radial menu.
- **Pause:** `Esc` / `P` / pause button. Auto-pause on tab blur and on opening menus.
- **No skill checks that require precise aiming** → fully playable one-handed on mobile.

---

## 4. The Arena (single-screen, thumbnail-friendly)

A **fixed logical arena of 1280×720** scaled to fit any screen (letterboxed), so the whole
mall is always visible — crucial for readability and mobile.

```
┌───────────────────────────────────────────────────────────┐
│  spawn       spawn         spawn          spawn            │  ← zombies spawn from
│   ▼            ▼             ▼              ▼               │    all 4 edges
│                                                            │
│      [PLOT]   [PLOT]   ┌──────────┐   [PLOT]   [PLOT]      │
│                        │  CORE /  │                        │
│      [STORE]  [STORE]  │   MALL   │  [STORE]  [STORE]      │
│                        │  ATRIUM  │                        │
│      [PLOT]   [PLOT]   └──────────┘   [PLOT]   [PLOT]      │
│                          (the hub)                         │
│                  🧍 player roams freely                    │
│   spawn         spawn          spawn          spawn        │
└───────────────────────────────────────────────────────────┘
```

- **Mall Atrium (center):** the heart. Not directly attackable in v1, but it's the visual
  anchor that "levels up" cosmetically as you build more stores (tiers: Abandoned →
  Operational → Fortified → Mega-Mall).
- **Build plots:** ~12 plots arranged in two rings around the atrium. Empty plots glow.
- **Player:** free-roaming hero; the lose condition is **player HP reaching 0**.

---

## 5. Stores (the heart of the design)

Each store = **passive income** + **global combat buff**. Stores can be **upgraded** (Lv 1–5).
Buffs are global and stack additively across all your stores.

| Store | Income/s (Lv1) | Combat Buff (per level) | Unlock |
|-------|---------------:|-------------------------|--------|
| ☕ **Café** | $2 | — (pure economy, cheap starter) | Start |
| 🔫 **Gun Shop (Armería)** | $1 | +12% weapon **damage** | Start |
| 💊 **Pharmacy (Farmacia)** | $1 | **Heals** 8 HP burst on build + +1 HP/s passive heal | $80 |
| 🍔 **Restaurant** | $3 | +0.6 HP/s **regen** | $120 |
| 🏋️ **Gym (Gimnasio)** | $1 | +8% **move speed** | $100 |
| 🛒 **Supermarket** | $5 | +6% **cash gain** (multiplier) | $200 |
| 🔧 **Security Office** | $1 | Unlocks **auto-turret** that shoots zombies | $250 |
| ⚡ **Electronics** | $2 | +10% **fire rate** | $180 |
| 💎 **Jewelry** | $8 | +5% **XP gain** + high income | $400 |
| 🎯 **Sports Store** | $2 | +1 **projectile** (multi-shot) every 2 levels | $500 |
| 🛡️ **Armor / Outfitter** | $2 | +15 **max HP** per level | $350 |
| 🚁 **Helipad (endgame)** | $15 | Calls **airstrike** every 30s | $1500 |

### Upgrade rules
- Upgrade cost = `baseCost × 1.6^level` (rounded).
- Income and buff scale per level: income `×1.5` per level, buff value `+` its base each level.
- A store's plot shows its level as pips and a subtle glow tier (white → blue → gold).

### Store synergies (depth for retained players)
- **Gun Shop + Electronics + Sports** = glass-cannon DPS build.
- **Pharmacy + Restaurant + Armor** = tank/sustain build.
- **Supermarket + Jewelry + Café** = economy rush → buy everything fast.
- **Security + Helipad** = "let the mall fight for you" turtle build.

---

## 6. Upgrade Trees

### 6.1 Weapon upgrades (in-run, bought with cash at Atrium or via level-up choices)
On each **XP level-up**, the player picks 1 of 3 random cards (Vampire Survivors style):

```
WEAPON TREE
 ├─ Pistol (start)
 │   ├─ +Damage           (×8 ranks)
 │   ├─ +Fire Rate        (×8 ranks)
 │   ├─ +Projectiles      (×4 ranks)
 │   └─ +Pierce           (×4 ranks)
 ├─ Shotgun        (unlock: pick at Lv3) → spread, high close dmg
 ├─ SMG            (unlock: Lv5) → very high fire rate
 ├─ Rocket         (unlock: Lv8) → AoE explosion
 └─ Lightning Coil (unlock: Lv12) → chains between zombies

PASSIVE TREE
 ├─ Magnet Radius (pull cash/gems from further)
 ├─ Move Speed
 ├─ Max HP
 ├─ Regen
 ├─ Crit Chance / Crit Damage
 └─ Luck (better level-up card odds)
```

> **Two upgrade channels on purpose:** *cash → stores* (strategic, persistent in the run) and
> *XP → weapon cards* (tactical, build-defining). They interleave so there's always a
> meaningful choice every ~15–30 seconds.

### 6.2 Meta upgrade tree (between runs, spent with **Tokens**)
```
META: SURVIVAL
 ├─ Start HP +25 / +50 / +100
 ├─ Start with Pharmacy pre-built
 └─ Revive once per run (free)

META: ECONOMY
 ├─ Start cash +$50 / +$150 / +$400
 ├─ +10% / +20% / +30% global income
 └─ Stores cost -10% / -20%

META: FIREPOWER
 ├─ Start damage +15% / +30%
 ├─ Start with Shotgun
 └─ +1 starting projectile

META: UNLOCKS (one-time)
 ├─ New Hero: "The Mechanic" (turrets +50%)
 ├─ New Hero: "The Chef" (regen build)
 ├─ New Zone: "Underground Parking" (harder, 2× tokens)
 └─ New Zone: "Rooftop" (boss rush mode)
```

---

## 7. Economy & Balancing

### 7.1 Currencies
| Currency | Earned by | Spent on | Persists? |
|----------|-----------|----------|-----------|
| **Cash ($)** | Killing zombies, store income | Building & upgrading stores, recruiting survivors | No (per run) |
| **XP gems** | Zombie kills, green crystals | Level-ups → weapon cards | No (per run) |
| **Tokens** | End-of-run reward (time survived + waves + kills) | Meta tree | **Yes (localStorage)** |

### 7.2 Cash sources & sinks (tuning targets)
- Zombie base bounty: `$1 + 0.05 × waveNumber` per kill.
- Store income ticks every second; total income should roughly **double every ~90s** of healthy play.
- Target pacing:
  - **0–2 min:** 1–3 stores, cash ~$5–15/s.
  - **2–6 min:** 4–7 stores, first survivors, cash ~$30–80/s.
  - **6–12 min:** 8–12 stores, mall "Fortified", cash ~$150–400/s.
  - **12–20 min:** maxed economy, boss waves, survival becomes the bottleneck.

### 7.3 Cost curves
- Store build cost: fixed per store (see §5).
- Store upgrade: `base × 1.6^level`.
- Survivor recruit cost: `$150 × 1.4^(survivorsOwned)`.
- XP to next level: `5 + level × 6` (gentle early, steeper later).

### 7.4 Difficulty curve (DPS vs HP)
- Zombie spawn rate scales with wave: `spawnInterval = max(0.18s, 1.0 − wave×0.05)`.
- Zombie HP: `10 × 1.12^wave`.
- Zombie damage: `4 + wave×0.6`.
- **Anti-frustration:** if player HP < 25% for >5s, slightly reduce spawn pressure (hidden
  "comeback" assist) and bias level-up cards toward survivability. Keeps sessions in the
  10–20 min sweet spot without feeling cheap.

---

## 8. Enemy Types

| Enemy | Behavior | HP | Speed | Special | Intro wave |
|-------|----------|---:|------:|---------|-----------:|
| 🧟 **Shambler** | Walks straight at player | low | slow | none | 1 |
| 🏃 **Runner** | Fast charge | low | fast | closes distance quickly | 3 |
| 🪨 **Brute** | Tanky | high | slow | knockback resist, big bounty | 5 |
| 🤮 **Spitter** | Ranged acid spit | low | slow | hits at range, must dodge | 6 |
| 💥 **Bloater** | Explodes on death | med | slow | AoE damage + spawns 2 shamblers | 8 |
| 🦠 **Crawler swarm** | Many tiny, weak | tiny | med | overwhelm by numbers | 9 |
| 🛡️ **Riot Zombie** | Front shield | high | med | only takes dmg from sides/back/pierce | 11 |
| 👑 **BOSS: The Mall Cop** | every 5 waves | huge | med | summons, charge attack, drops big cash + token | 5,10,15,20 |
| 🐲 **FINAL BOSS: Patient Zero** | wave 20+ | massive | var | multi-phase, all mechanics | 20 |

**Spawn director:** weighted spawn table per wave; bosses pause normal spawns briefly, then
resume. Telegraph everything (spawn portals, boss warning banner, spitter aim line).

---

## 9. Survivors (NPC allies)

- Recruit at the Atrium for escalating cash cost.
- Survivors are **stationary auto-turrets** that you can reposition by dragging onto a plot
  edge; they fire at nearest zombie with a fraction of player stats.
- Types unlocked via stores/meta: **Rifleman** (steady), **Shotgunner** (close AoE),
  **Medic** (heals nearby + player), **Engineer** (boosts adjacent stores' income).
- Survivors can die if overwhelmed (downed, revivable for cash) → adds tension and a sink.
- Visual: little colored figures with muzzle flashes → the "mall full of defenders" power fantasy at 15 min.

---

## 10. Wave / Run Structure

- **Wave timer:** new wave every **45s**; difficulty steps up each wave.
- **Boss every 5 waves.** Clearing a boss grants a **big cash drop + a guaranteed rare level-up card**.
- **Run end conditions:**
  - **Defeat:** player HP hits 0 (offer 1 rewarded-ad revive, then meta-token payout screen).
  - **Victory milestone:** survive Wave 20 / beat Patient Zero → victory screen + bonus tokens, option to continue into "Endless".
- **Endless mode** after victory for high-score chasers (leaderboard-ready).

---

## 11. Meta Progression & Retention

### Per-run rewards (always feel progress)
- **Tokens** = `floor(secondsSurvived/6) + waves×10 + kills×0.2 + bossKills×50`.
- Even a 2-minute death yields tokens → no wasted run.

### Retention mechanics
1. **Daily reward** (escalating tokens, day 1–7 loop).
2. **Unlock cadence:** first run unlocks a new store; first 5 runs each unlock something
   (store, hero, or zone) → strong early retention.
3. **Meta tree** with always-visible "next affordable upgrade".
4. **Mall Tiers / cosmetics:** the atrium and stores get fancier; persistent "best mall" snapshot on menu.
5. **Daily Challenge / Seed:** one fixed seed per day with a leaderboard.
6. **Quests/achievements:** "Build 8 stores", "Survive wave 10", "Kill 1000 zombies" → token rewards.
7. **Rewarded ads (CrazyGames):**
   - **Revive** on death (once).
   - **Double end-of-run tokens.**
   - **Instant store build / cash injection** mid-run (optional booster).
   - **2× income for 60s** booster.
8. **Push-to-return:** "Your mall earned $X offline" style teaser on return (soft, optional).

---

## 12. UI / Wireframes

### 12.1 Main Menu
```
┌───────────────────────────────────────────────┐
│            ZOMBIE MALL TYCOON                  │
│                 SURVIVOR                       │
│        [ best mall snapshot art ]              │
│                                                │
│            ▶  PLAY                             │
│            🛠  META UPGRADES   (Tokens: 1,240) │
│            🦸 HERO SELECT                      │
│            🗺  ZONE SELECT                     │
│            ⚙  Settings   🔊  🔇                │
│   Daily reward: ●●●○○○○   [CLAIM]              │
└───────────────────────────────────────────────┘
```

### 12.2 In-Game HUD
```
┌───────────────────────────────────────────────────────┐
│ ❤️▓▓▓▓▓░░  HP        💰 $1,240 (+86/s)     ⏱ 07:32     │  top bar
│ ⭐ Lv 7  XP▓▓▓▓░░░                WAVE 8  🧟×142        │
│                                                        │
│                  [ ARENA / GAMEPLAY ]                  │
│                                                        │
│ [build hint pulses on empty plots]                     │
│                                                        │
│  ┌──────┐                                  ┌────────┐  │
│  │joystk│ (mobile only)            BOOST ▶ │ 2× ad  │  │  bottom
│  └──────┘                          ⏸ pause └────────┘  │
└───────────────────────────────────────────────────────┘
```

### 12.3 Build / Store radial menu (on tapping a plot)
```
        ┌─────────────────┐
        │  EMPTY PLOT      │
        │ ☕ Café   $20  ▶ │
        │ 🔫 Gun    $40  ▶ │
        │ 💊 Pharm  $80  🔒 (needs $80) │
        │ 🏋️ Gym    $100 🔒 │
        └─────────────────┘
(tapping a built store shows: level, income, buff, [UPGRADE $X])
```

### 12.4 Level-Up card screen (pauses game)
```
┌──────────────────────────────────────┐
│         LEVEL UP!  Choose one          │
│  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │ +20%   │  │ SHOTGUN│  │ +1     │   │
│  │ DAMAGE │  │  NEW!  │  │ PROJ.  │   │
│  └────────┘  └────────┘  └────────┘   │
│            [ reroll  🎬ad ]            │
└──────────────────────────────────────┘
```

### 12.5 End-of-run screen
```
┌──────────────────────────────────────┐
│            YOU DIED — Wave 12          │
│  Survived 09:48 · 842 kills · 11 stores│
│  Tokens earned:  +186                  │
│  ┌──────────────┐   ┌───────────────┐ │
│  │ 🎬 DOUBLE x2 │   │   ⟳ RETRY     │ │
│  └──────────────┘   └───────────────┘ │
│           [ MAIN MENU ]                │
└──────────────────────────────────────┘
```

**UI principles:** large tap targets (min 48px), no tiny text, color-coded buffs, everything
animated/juicy (screenshake on boss, coin bursts, floating combat text), readable at phone size.

---

## 13. Art & Audio Direction

- **Art:** clean top-down vector/shape style with chunky readable silhouettes; bright neon
  mall signage vs. desaturated zombies → instant figure/ground readability for thumbnails.
- **Palette:** warm mall interior (golds, cyans) vs. sickly green zombies + red damage.
- **Juice:** hit flashes, knockback, coin pops, floating numbers, screenshake, particle bursts,
  store "build" pop animation, level-up freeze-frame.
- **Audio:** punchy gunshots, zombie groans, cash "cha-ching", upbeat-tense synth loop,
  layered intensity (more instruments as waves rise). Full mute toggle (CrazyGames requirement).

---

## 14. CrazyGames Compliance Checklist

- [x] **Pure HTML5**, no plugins, runs in iframe.
- [x] **Fast load** (single bundle, lazy nothing, < a few MB).
- [x] **Responsive** to all aspect ratios; mobile + desktop.
- [x] **No external network calls** except the CrazyGames SDK.
- [x] **CrazyGames SDK** integrated: `gameplayStart/Stop`, rewarded `requestAd`, `happytime`, mute via SDK events.
- [x] **Pause on focus loss / ad start.**
- [x] **Mute / settings** available.
- [x] **No links out**, no external payment, no prohibited content.
- [x] **localStorage** for saves only (allowed).
- [x] **Loading screen** with progress, no broken states.
- [x] Works **offline** after load (no hard dependency on the ad SDK — graceful fallback).

---

## 15. Production Roadmap (suggested)

1. **MVP (this build):** core survivor combat, cash, build/upgrade stores, waves, level-up cards,
   meta tokens + persistent upgrades, 1 boss, SDK wrapper, mobile controls.
2. **V1.1:** more enemy types, survivors AI, more stores, daily reward, achievements.
3. **V1.2:** multiple heroes & zones, daily seed leaderboard, full audio, more bosses.
4. **V2:** endless mode tuning, events, cosmetics, soft-launch on CrazyGames.

---

## 16. ⭐ REFUGE FAME SYSTEM (signature core mechanic — IMPLEMENTED)

> **One sentence:** Your mall becomes a *famous refuge*; fame is a visible meter that you
> push up with everything you do, and the famous-er you get, the more **survivors, traders
> and supplies** arrive — but also the more **hordes, saboteurs, infiltrated infected and
> bosses** come for you. Every run is a tug-of-war between **Growth and Risk**.

This is what turns the game from "another survivor-like" into a *zombie mall manager*: in
Vampire Survivors difficulty is a fixed clock you cannot influence. Here **the player sets
the pace of danger** by how aggressively they grow the refuge. Fame is the dial.

### 16.1 Why it satisfies every requirement
1. **Visible resource** — a permanent Fame bar + tier name in the HUD.
2. **Rises through actions** — building/upgrading, recruiting, kills, surviving, bosses.
3. **Positive *and* negative consequences** — same meter feeds both reward and threat tables.
4. **Emergent stories** — see §16.10 (the infiltrator you trusted; the trader who saved the run).
5. **Retention/replayability** — different fame curves = different runs; meta unlocks lean on it.
6. **Essential, not optional** — fame *is* the difficulty director; you can't ignore it.
7. **Understood in <2 min** — first store triggers a one-line tip; first survivor/saboteur/trader
   each self-explain via a toast the first time they happen.
8. **CrazyGames-friendly** — readable, juicy, one-tap decisions, natural rewarded-ad fit.

### 16.2 Fame formula (as implemented)
```
fame += dt × (0.35 + 0.05 × storesBuilt + 0.04 × survivors)   // passive notoriety
on store build/upgrade : fame += baseCost × 0.10
on survivor joins      : fame += 15
on zombie kill         : fame += 0.12 + 0.01 × wave
on boss kill           : fame += 120
quarantine infected    : fame += 10        | quarantine healthy ally : fame −8
bandit raid event      : fame −10          | survivor devoured        : fame −5
```
Two derived "heat" values scale the danger so growth literally raises the stakes:
```
threat()  = 1 + fame / 650     → divides spawn interval (more zombies, faster)
fameMul() = 1 + fame / 2600    → multiplies enemy HP and damage
```

### 16.3 Fame tiers (progression)
| Tier | Fame | Name | What unlocks |
|---:|---:|---|---|
| 0 | 0 | 🕯️ Escondite | Quiet. Basic zombies only. |
| 1 | 120 | 🏠 Casa segura | First **survivors** & **traders** start arriving. |
| 2 | 350 | 📻 Refugio conocido | **Saboteurs** begin; bigger random events. |
| 3 | 800 | ⭐ Refugio famoso | **Infiltrated infected** more likely; **refuge-assault bosses**; 4-deal traders. |
| 4 | 1700 | 🏰 Bastión legendario | Frequent mega-hordes & multi-boss pressure; top-tier trades. |
| 5 | 3400 | 🔥 Faro de esperanza | Endgame escalation; everything at maximum frequency. |
Each tier-up fires a banner + toast ("more allies… and more danger") so the trade-off is explicit.

### 16.4 Positive events (reward table)
- **Survivor arrival** — a survivor walks in from the edge; protect them to the mall → free ally turret.
- **Trader caravan** — time-limited stall at the mall with 3–4 deals (heal, +projectile, mercenary,
  +max HP, –50% next store, +15% damage). Tap the stall to shop. Better/more deals at higher fame.
- **Supply convoy** — instant cash injection.
- **Volunteer medics** — +50% HP heal.
- **High morale** — temporary ×2 income for 30s.

### 16.5 Negative events (risk table) — weight grows with fame tier
- **Mega-horde** ("attracted by your fame") — large telegraphed spawn burst.
- **Saboteur** — see §16.7.
- **Bandit raid** — steals 15% of your cash.
- **Refuge-assault boss** — extra boss beyond the fixed every-5-waves one (tier ≥ 3).

### 16.6 Survivor arrival system
- Director spawns arrivals on a timer that **shortens as fame rises** (`max(6, 22 − tier×3)s`).
- Arrivals path to the mall at 74 px/s and can be **devoured en route** if a zombie touches them
  → creates a real defensive objective (escort/clear a lane).
- On reaching the mall they **join as an auto-firing ally turret** (+15 fame).
- Cap of ~14 concurrent allies+arrivals to bound performance and power.

### 16.7 Saboteur system
- A distinct pink zombie marked 🔧 that **ignores the player** and sprints to a random **built store**.
- If it reaches the store, the store is **disabled for 12s** (no income, no buff, red ⚠ overlay,
  screenshake) — then the saboteur turns and hunts the player.
- Killing it pays a **cash bonus + fame**. Forces the player to peel off and intercept → real decisions.
- Frequency scales with fame (tier ≥ 2): `max(14, 40 − tier×4)s`.

### 16.8 Hidden infected survivor system (the paranoia hook)
- Each arrival has a fame-scaled chance of being **secretly infected** (`min(45%, 4% + tier×7%)`).
- Infected and healthy survivors **show the same join message** — you are never told.
- The only **tell** is a *subtle, occasional sickly-green flicker* on the sprite (easy to miss).
- After 14–30s an infected ally **turns into a strong "Turncoat" zombie INSIDE the refuge** —
  a surprise attack past your perimeter.
- **Counter-play:** tap any ally to **Quarantine** it. If it was infected → praise + **+10 fame**.
  If it was healthy → you wasted a real defender → **−8 fame**. Trust the tell or play it safe.

### 16.9 Boss attack system
- Fixed cadence boss every 5 waves (The Mall Cop) **plus** fame-driven **Refuge Assault** bosses at
  tier ≥ 3 on a timer that tightens with fame (`max(45, 95 − tier×9)s`). Bosses scale with `fameMul()`.

### 16.10 UI & visual feedback (implemented)
- **Fame bar** (3rd HUD row) with tier icon+name, colored fill toward next tier, and a 🙋 survivor count.
- **Tier-up banner** + colored toast.
- **Event toasts** (top-center, stacked, auto-expiring) narrate every arrival/trade/saboteur/horde.
- **In-world cues:** arriving survivors bob a green "!"; trader stall pulses "COMERCIAR · Ns";
  saboteurs wear 🔧; disabled stores flash a red ⚠; infected allies flicker green.

### 16.11 Tutorial integration
First-time toasts (one line each, non-blocking): on first build → "Fame rises as you grow — more
allies & resources, but more zombies & danger"; first arrival → escort + infiltrator warning; first
saboteur → "intercept it!"; first mega-horde → "growing fast has a price." No modal walls.

### 16.12 Balancing recommendations
- Keep `threat` (fame/650) gentler than wave scaling early so the first 2 min stay welcoming.
- Tune arrival cap (14) and ally DPS (0.45× player) so allies *help* but never trivialize aiming.
- Infection chance ceiling 45% keeps quarantine a *gamble*, not a coin-flip tax.
- Saboteur speed (118) > player base (185 only when moving) → catchable but demands attention.
- Negative-event chance `min(70%, 20% + tier×10%)` — early game leans positive (hook), late leans risk.

### 16.13 Endgame scaling
- At tier 5 every director timer is at its floor → constant arrivals, near-permanent trader uptime,
  frequent mega-hordes + stacked bosses. The mall becomes a roaring fortress vs. a sea of zombies —
  the "15-minute fortress" power-fantasy, now *earned by the player's own fame choices*.
- Natural feed into **Endless**: fame keeps climbing → leaderboard by peak fame / wave / time.

### 16.14 Example player decisions
- *"I'm at $300 — build the Armory now (spikes fame → harder) or bank it and stay quiet?"*
- *"A saboteur is on my Supermarket but I'm kiting a boss — sacrifice the income or the position?"*
- *"This new survivor flickered… maybe. Quarantine (lose a gun, −8 fame) or risk a turncoat?"*
- *"Trader has a Mercenary for $400 but a mega-horde is 10s out — buy defense or save for stores?"*
- *"Push to tier 5 for the trade deals, or cap fame by not upgrading to survive longer?"*

### 16.15 Emergent gameplay situations
- You escort a survivor through a gap in the horde, they join, you feel like a hero — 20s later they
  turn into a Turncoat mid-boss and nearly wipe you. *You'll remember that survivor.*
- A bandit raid empties your wallet right before a trader with the perfect deal arrives — agony.
- You quarantine three "suspicious" survivors in a row; all were healthy; your defense collapses to a
  horde you could've held. Paranoia has a cost.
- Two saboteurs split toward opposite stores while a mega-horde funnels in — triage under pressure.

### 16.16 How it transforms the game
Vampire Survivors asks *"how long can you survive a fixed clock?"* Zombie Mall Tycoon Survivor asks
*"how famous dare you make your refuge?"* Fame fuses the tycoon and survivor halves into one decision
loop: every economic choice (build, upgrade, recruit, trade) is also a **threat choice**. Growth is no
longer free — it's the source of both your power and your peril. That single dial creates ownership,
tension, stories, and replay variety that a pure survivor-like cannot, while staying instantly legible
to a CrazyGames audience.

---

*This GDD is implemented (MVP + Refuge Fame System) by the accompanying playable build:
`index.html`, `game.js`, `style.css`.*
