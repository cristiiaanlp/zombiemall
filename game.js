/* ============================================================================
   ZOMBIE MALL TYCOON SURVIVOR
   Vampire Survivors x Tycoon x Mall management — HTML5 Canvas, zero deps.
   Optimized for CrazyGames (responsive, mobile, SDK + rewarded ads, mute).
   ============================================================================ */
'use strict';

/* ---------------------------------------------------------------------------
   0. CONSTANTS & CONFIG
--------------------------------------------------------------------------- */
const W = 1280, H = 720;          // logical arena size (scaled to fit screen)
const CX = W / 2, CY = H / 2;     // center (mall atrium)
const SAVE_KEY = 'zmts_save_v1';

// Store definitions (see GDD §5). buff is applied globally and scales per level.
const STORES = [
  { id:'cafe',    ico:'cafe',     cost:20,   income:3, buff:null,                name:{es:'Cafetería',en:'Café'},          desc:{es:'Ingresos puros baratos.',en:'Cheap pure income.'} },
  { id:'gun',     ico:'gun',      cost:30,   income:1, buff:{k:'dmg',   v:0.12}, name:{es:'Armería',en:'Gun Shop'},              desc:{es:'+12% daño de arma.',en:'+12% weapon damage.'} },
  { id:'pharma',  ico:'pharma',   cost:80,   income:1, buff:{k:'heals', v:1},    name:{es:'Farmacia',en:'Pharmacy'},             desc:{es:'Cura al construir + 1 HP/s.',en:'Heal on build + 1 HP/s.'} },
  { id:'rest',    ico:'rest',     cost:120,  income:3, buff:{k:'regen', v:0.6},  name:{es:'Restaurante',en:'Restaurant'},        desc:{es:'+0.6 HP/s regeneración.',en:'+0.6 HP/s regen.'} },
  { id:'gym',     ico:'gym',      cost:100,  income:1, buff:{k:'speed', v:0.08}, name:{es:'Gimnasio',en:'Gym'},                  desc:{es:'+8% velocidad.',en:'+8% move speed.'} },
  { id:'market',  ico:'market',   cost:200,  income:5, buff:{k:'cash',  v:0.06}, name:{es:'Supermercado',en:'Supermarket'},      desc:{es:'+6% ingresos por kill.',en:'+6% cash per kill.'} },
  { id:'security',ico:'security', cost:250,  income:1, buff:{k:'turret',v:1},    name:{es:'Seguridad',en:'Security'},            desc:{es:'Despliega una torreta.',en:'Deploys an auto-turret.'} },
  { id:'elec',    ico:'elec',     cost:180,  income:2, buff:{k:'rate',  v:0.10}, name:{es:'Electrónica',en:'Electronics'},       desc:{es:'+10% cadencia de disparo.',en:'+10% fire rate.'} },
  { id:'sports',  ico:'sports',   cost:500,  income:2, buff:{k:'proj',  v:0.5},  name:{es:'Deportes',en:'Sports Store'},         desc:{es:'+1 proyectil cada 2 niv.',en:'+1 projectile every 2 lvls.'} },
  { id:'armor',   ico:'armor',    cost:350,  income:2, buff:{k:'maxhp', v:15},   name:{es:'Outfitter',en:'Outfitter'},           desc:{es:'+15 vida máx por nivel.',en:'+15 max HP per level.'} },
  { id:'jewel',   ico:'jewel',    cost:400,  income:8, buff:{k:'xp',    v:0.05}, name:{es:'Joyería',en:'Jewelry'},               desc:{es:'+5% XP, gran ingreso.',en:'+5% XP, high income.'} },
  { id:'heli',    ico:'heli',     cost:1500, income:15,buff:{k:'airstrike',v:1}, name:{es:'Helipuerto',en:'Helipad'},            desc:{es:'Ataque aéreo cada 25s.',en:'Airstrike every 25s.'} },
];

// Enemy archetypes (see GDD §8). Stats are multiplied by wave scaling at spawn.
const ENEMIES = {
  shambler:{ name:'Shambler', r:13, hpMul:1.0, spd:38,  dmg:1.0, color:'#86d44a', bounty:1.0, fromWave:1 },
  runner:  { name:'Runner',   r:11, hpMul:0.7, spd:95,  dmg:0.8, color:'#ffd23f', bounty:1.1, fromWave:2 },
  brute:   { name:'Brute',    r:22, hpMul:3.4, spd:30,  dmg:1.8, color:'#3fae86', bounty:2.6, fromWave:5 },
  spitter: { name:'Spitter',  r:13, hpMul:1.0, spd:34,  dmg:1.0, color:'#cf7bff', bounty:1.5, fromWave:6, ranged:true },
  bloater: { name:'Bloater',  r:18, hpMul:2.0, spd:30,  dmg:1.4, color:'#b6ff3b', bounty:2.0, fromWave:8, explodes:true },
};

// Level-up cards (weapon + passive). Some are "rare".
const CARD_POOL = [
  { id:'dmg',    ico:'dmg',    name:{es:'+Daño',en:'+Damage'},      desc:{es:'+20% daño',en:'+20% damage'},        apply:s=>s.dmgMult+=0.20 },
  { id:'rate',   ico:'rate',   name:{es:'+Cadencia',en:'+Fire Rate'},desc:{es:'+15% disparo',en:'+15% fire rate'}, apply:s=>s.rateMult+=0.15 },
  { id:'proj',   ico:'proj',   name:{es:'+Proyectil',en:'+Projectile'},desc:{es:'+1 bala',en:'+1 bullet'},         apply:s=>s.projAdd+=1 },
  { id:'pierce', ico:'pierce', name:{es:'+Perforación',en:'+Pierce'},desc:{es:'Atraviesa +1',en:'Pierce +1'},      apply:s=>s.pierce+=1 },
  { id:'speed',  ico:'speed',  name:{es:'+Velocidad',en:'+Speed'},  desc:{es:'+12% movimiento',en:'+12% move'},    apply:s=>s.spdMult+=0.12 },
  { id:'maxhp',  ico:'heart',  name:{es:'+Vida máx',en:'+Max HP'},  desc:{es:'+25 vida y cura',en:'+25 HP & heal'},apply:s=>{s.maxHp+=25;s.hp+=25;} },
  { id:'regen',  ico:'regen',  name:{es:'+Regen',en:'+Regen'},      desc:{es:'+0.5 HP/s',en:'+0.5 HP/s'},          apply:s=>s.regen+=0.5 },
  { id:'magnet', ico:'magnet', name:{es:'+Imán',en:'+Magnet'},      desc:{es:'+40 recogida',en:'+40 pickup'},      apply:s=>s.magnet+=40 },
  { id:'crit',   ico:'crit',   name:{es:'+Crítico',en:'+Crit'},     desc:{es:'+8% crítico',en:'+8% crit chance'},  apply:s=>s.crit+=0.08 },
  { id:'range',  ico:'range',  name:{es:'+Alcance',en:'+Range'},    desc:{es:'+60 alcance',en:'+60 range'},        apply:s=>s.range+=60 },
  // --- more common power-ups (wider choice) ---
  { id:'critdmg',ico:'crit',   name:{es:'+Daño crítico',en:'+Crit Damage'}, desc:{es:'+50% daño crítico',en:'+50% crit damage'}, apply:s=>s.critMul+=0.5 },
  { id:'greed',  ico:'cash',   name:{es:'Codicia',en:'Greed'},      desc:{es:'+25% dinero por kill',en:'+25% cash per kill'}, apply:s=>s.cashMult+=0.25 },
  { id:'wisdom', ico:'token',  name:{es:'Sabiduría',en:'Wisdom'},   desc:{es:'+25% XP',en:'+25% XP'},               apply:s=>s.xpMult+=0.25 },
  { id:'armor',  ico:'armor',  name:{es:'Blindaje',en:'Armor'},     desc:{es:'-12% daño recibido',en:'-12% damage taken'}, apply:s=>s.dr=Math.min(0.6,s.dr+0.12) },
  { id:'dodge',  ico:'speed',  name:{es:'Evasión',en:'Evasion'},    desc:{es:'+12% esquivar',en:'+12% dodge'},      apply:s=>s.dodge=Math.min(0.6,s.dodge+0.12) },
  { id:'bigshot',ico:'proj',   name:{es:'Balas grandes',en:'Big Bullets'}, desc:{es:'+40% tamaño, +10% daño',en:'+40% size, +10% dmg'}, apply:s=>{s.bulletSize+=0.4;s.dmgMult+=0.1;} },
  { id:'heavy',  ico:'dmg',    name:{es:'Munición pesada',en:'Heavy Rounds'}, desc:{es:'Empuja a los enemigos',en:'Knocks enemies back'}, apply:s=>s.knockback+=20 },
  // --- rare / build-defining ---
  { id:'shotgun',ico:'shotgun',name:{es:'ESCOPETA',en:'SHOTGUN'},   desc:{es:'Disparo en abanico',en:'Spread shot'}, rare:true, apply:s=>{s.shotgun=true;s.projAdd+=2;} },
  { id:'rocket', ico:'rocket', name:{es:'COHETES',en:'ROCKETS'},    desc:{es:'Balas explosivas',en:'Explosive bullets'}, rare:true, apply:s=>{s.explosive=true;} },
  { id:'vamp',   ico:'vamp',   name:{es:'VAMPIRISMO',en:'LIFESTEAL'},desc:{es:'Roba vida al matar',en:'Steal HP on kill'}, rare:true, apply:s=>{s.lifesteal+=0.5;} },
  { id:'cryo',   ico:'frost',  name:{es:'Balas de hielo',en:'Cryo Rounds'}, desc:{es:'Ralentiza al impactar',en:'Slows on hit'}, rare:true, apply:s=>s.slow+=1 },
  { id:'fire',   ico:'fire',   name:{es:'Incendiarias',en:'Incendiary'}, desc:{es:'Prende fuego (daño/seg)',en:'Sets enemies ablaze'}, rare:true, apply:s=>s.burn+=1 },
  { id:'bounce', ico:'bounce', name:{es:'Rebote',en:'Ricochet'},    desc:{es:'Balas rebotan +1',en:'Bullets bounce +1'}, rare:true, apply:s=>s.bounce+=1 },
  { id:'aura',   ico:'aura',   name:{es:'Aura tóxica',en:'Toxic Aura'}, desc:{es:'Daña a los cercanos',en:'Damages nearby foes'}, rare:true, apply:s=>s.aura+=1 },
  { id:'glass',  ico:'crit',   name:{es:'Cañón de cristal',en:'Glass Cannon'}, desc:{es:'+60% daño, -30 vida máx',en:'+60% dmg, -30 max HP'}, rare:true, apply:s=>{s.dmgMult+=0.6;s.maxHp=Math.max(30,s.maxHp-30);s.hp=Math.min(s.hp,s.maxHp);} },
  { id:'drone',  ico:'drone',  name:{es:'Dron de combate',en:'Combat Drone'}, desc:{es:'Un dron que dispara',en:'A drone that shoots'}, rare:true, apply:s=>addDrone() },
];

// Synergies: owning the right card combo auto-unlocks an evolved effect.
function ownsCard(s,id){ return (s.cardCounts && s.cardCounts[id]>0); }
const SYNERGIES = [
  { id:'thermal',    ico:'frost', name:{es:'Choque térmico',en:'Thermal Shock'},  desc:{es:'Los congelados arden mucho más',en:'Frozen foes burn far harder'}, need:s=>ownsCard(s,'cryo')&&ownsCard(s,'fire') },
  { id:'inferno',    ico:'aura',  name:{es:'Aura infernal',en:'Inferno Aura'},     desc:{es:'Tu aura prende fuego',en:'Your aura sets enemies ablaze'},     need:s=>ownsCard(s,'aura')&&ownsCard(s,'fire') },
  { id:'demolition', ico:'rocket',name:{es:'Demolición',en:'Demolition'},          desc:{es:'Explosiones enormes',en:'Huge explosions'},                    need:s=>ownsCard(s,'rocket')&&ownsCard(s,'bigshot') },
  { id:'storm',      ico:'drone', name:{es:'Tormenta de drones',en:'Drone Storm'}, desc:{es:'Tus drones disparan balas que rebotan',en:'Your drones fire ricochet rounds'}, need:s=>ownsCard(s,'drone')&&ownsCard(s,'bounce') },
  { id:'assassin',   ico:'crit',  name:{es:'Asesino',en:'Assassin'},               desc:{es:'+15% prob. crítico',en:'+15% crit chance'},                    need:s=>ownsCard(s,'crit')&&ownsCard(s,'critdmg'), apply:s=>s.crit+=0.15 },
  { id:'frostbite',  ico:'frost', name:{es:'Congelación',en:'Frostbite'},          desc:{es:'+35% daño a enemigos lentos',en:'+35% damage to slowed foes'}, need:s=>ownsCard(s,'cryo')&&ownsCard(s,'crit') },
  { id:'juggernaut', ico:'armor', name:{es:'Juggernaut',en:'Juggernaut'},          desc:{es:'-15% daño recibido extra',en:'-15% extra damage taken'},        need:s=>ownsCard(s,'armor')&&ownsCard(s,'maxhp'), apply:s=>s.dr=Math.min(0.75,s.dr+0.15) },
  { id:'executioner',ico:'crit',  name:{es:'Verdugo',en:'Executioner'},            desc:{es:'+100% daño crítico',en:'+100% crit damage'},                   need:s=>ownsCard(s,'critdmg')&&ownsCard(s,'glass'), apply:s=>s.critMul+=1 },
  { id:'hoarder',    ico:'cash',  name:{es:'Acaparador',en:'Hoarder'},             desc:{es:'+imán y +30% dinero',en:'+magnet & +30% cash'},                need:s=>ownsCard(s,'greed')&&ownsCard(s,'magnet'), apply:s=>{s.magnet+=80;s.cashMult+=0.3;} },
];

// Meta upgrades (persistent, bought with tokens). cost grows per level.
const META = [
  { id:'startHp',   ico:'heart', name:{es:'Vida inicial',en:'Start HP'},      desc:{es:'+30 vida máx',en:'+30 max HP'},          max:5, cost:l=>40+l*40,  val:l=>l*30 },
  { id:'startCash', ico:'cash',  name:{es:'Caja inicial',en:'Start cash'},    desc:{es:'+$120 al empezar',en:'+$120 on start'}, max:5, cost:l=>30+l*30, val:l=>l*120 },
  { id:'income',    ico:'market',name:{es:'Ingresos',en:'Income'},           desc:{es:'+8% ingresos',en:'+8% income'},          max:5, cost:l=>50+l*50, val:l=>l*0.08 },
  { id:'damage',    ico:'dmg',   name:{es:'Potencia fuego',en:'Firepower'},  desc:{es:'+10% daño inicial',en:'+10% start damage'}, max:5, cost:l=>50+l*45, val:l=>l*0.10 },
  { id:'cheaper',   ico:'build', name:{es:'Construcción',en:'Cheaper builds'},desc:{es:'-6% coste tiendas',en:'-6% store cost'},  max:5, cost:l=>60+l*50, val:l=>l*0.06 },
  { id:'magnet',    ico:'magnet',name:{es:'Imán',en:'Magnet'},               desc:{es:'+25 recogida',en:'+25 pickup'},          max:4, cost:l=>40+l*30, val:l=>l*25 },
  { id:'revive',    ico:'revive',name:{es:'Revivir gratis',en:'Free revive'},desc:{es:'1 revivir por partida',en:'1 revive per run'}, max:1, cost:()=>250, val:l=>l },
  { id:'pharmaStart',ico:'pharma',name:{es:'Farmacia base',en:'Start Pharmacy'},desc:{es:'Empiezas con Farmacia',en:'Start with Pharmacy'}, max:1, cost:()=>200, val:l=>l },
];

/* ===========================================================================
   REFUGE FAME SYSTEM — the unique core mechanic.
   Fame is a visible resource that rises with everything the player does.
   It drives BOTH reward (survivors, traders, supplies) AND risk (hordes,
   saboteurs, infiltrated infected, refuge-assault bosses). Growth vs Risk.
   =========================================================================== */
const FAME_TIERS = [
  { min:0,    name:'Escondite',          ico:'🕯️', color:'#8b96b8' },
  { min:120,  name:'Casa segura',        ico:'🏠', color:'#5dff8f' },
  { min:350,  name:'Refugio conocido',   ico:'📻', color:'#7ce6ff' },
  { min:800,  name:'Refugio famoso',     ico:'⭐', color:'#ffcf3f' },
  { min:1700, name:{es:'Bastión legendario',en:'Legendary Bastion'}, ico:'castle', color:'#ff9f43' },
  { min:3400, name:{es:'Faro de esperanza', en:'Beacon of Hope'},     ico:'fire',   color:'#ff5e9e' },
];
// fix first tiers to bilingual (kept here for clarity)
FAME_TIERS[0].name={es:'Escondite',en:'Hideout'};        FAME_TIERS[0].ico='candle';
FAME_TIERS[1].name={es:'Casa segura',en:'Safe House'};   FAME_TIERS[1].ico='house';
FAME_TIERS[2].name={es:'Refugio conocido',en:'Known Refuge'}; FAME_TIERS[2].ico='radio';
FAME_TIERS[3].name={es:'Refugio famoso',en:'Famous Refuge'};  FAME_TIERS[3].ico='star';

/* ===========================================================================
   LOCALIZATION (ES / EN)
   =========================================================================== */
let LANG = 'es';
function tx(o){ return (o && typeof o==='object') ? (o[LANG]||o.es) : o; }
function t(k, p){
  const d = I18N[LANG] || I18N.es;
  let s = (k in d) ? d[k] : (I18N.es[k]!=null ? I18N.es[k] : k);
  if(p) for(const key in p) s = s.split('{'+key+'}').join(p[key]);
  return s;
}
const I18N = {
  es:{
    tagline:'Sobrevive mientras construyes tu centro comercial.',
    play:'JUGAR', upgrades:'MEJORAS', howtoBtn:'Cómo se juega',
    hint:'WASD / flechas o joystick · disparo automático',
    howtoTitle:'Cómo se juega',
    howto1:'Muévete con WASD / flechas (o el joystick en móvil).',
    howto2:'Tu arma dispara sola al zombi más cercano.',
    howto3:'Toca una parcela brillante para construir tiendas.',
    howto4:'Las tiendas dan ingresos pasivos y bonus de combate.',
    howto5:'Sube de nivel y elige cartas de mejora.',
    howto6:'Sobrevive oleadas cada vez más duras. ¡Jefe cada 5 oleadas!',
    gotIt:'¡Entendido!',
    metaTitle:'Mejoras permanentes', back:'Volver', max:'MÁX',
    traderTitle:'Comerciante del refugio', traderSub:'Ofertas por tiempo limitado — atraído por tu fama', close:'Cerrar',
    levelTitle:'¡SUBISTE DE NIVEL!', chooseUpg:'Elige una mejora',
    pauseTitle:'Pausa', resume:'Continuar', sound:'Sonido', quitMenu:'Salir al menú',
    buildTitle:'Construir tienda', upgradeTitle:'Mejorar tienda', sold:'VENDIDO',
    revive:'REVIVIR', x2tokens:'x2 TOKENS', retry:'Reintentar', menu:'Menú',
    rotateTitle:'Gira tu dispositivo', rotateBody:'Este juego se juega en horizontal.<br/>Pon el móvil de lado para empezar.',
    loading:'Cargando el centro comercial…',
    boost:'x2 INGRESOS 60s', boostActive:'x2 INGRESOS {s}s',
    waveLabel:'OLEADA',
    goWin:'¡VICTORIA!', goLose:'FIN DE LA PARTIDA · Oleada {w}',
    goStats:'Sobreviviste <b>{t}</b> · {k} zombis · {s} tiendas · Récord oleada {b}',
    tokensEarned:'Tokens ganados:',
    lvl:'Niv', upgradeRow:'Nivel {a} → {b} · {d} · +${i}/s',
    // banners
    wave:'OLEADA {n}', bossWave:'⚠ JEFE — OLEADA {n}',
    megaHorde:'☣ HORDA ATRAÍDA POR TU FAMA', refugeAssault:'⚠ ASALTO AL REFUGIO',
    // toasts
    fameTip:'Tu FAMA sube al crecer. Más fama = más aliados y recursos… pero también más zombis y peligros.',
    arrivalTip:'Un superviviente busca refugio. Protégelo hasta el mall (¡cuidado con infiltrados!).',
    saboteurTip:'¡SABOTEADOR! Corre a por tus tiendas — ¡intercéptalo!',
    hordeTip:'Tu fama atrae hordas masivas. Crecer rápido tiene un precio.',
    traderTip:'Un comerciante montó su puesto. ¡Tócalo para comerciar!',
    traderHere:'¡Comerciante en el refugio!', traderLeft:'El comerciante se marchó.',
    joinedRefuge:'Un superviviente se unió a tu refugio.',
    qInfected:'¡Era un infiltrado infectado! Cuarentena a tiempo.',
    qHealthy:'Estaba sano… perdiste un aliado por desconfianza.',
    sabotaged:'¡{store} saboteada! (-ingresos)', repaired:'Tienda reparada y operativa.',
    devoured:'Un superviviente fue devorado antes de llegar.',
    tierUpToast:'Tu refugio es ahora: {tier} — llegan más aliados… y más peligro.',
    supplies:'Llega un convoy de suministros: +${amt}', medics:'Médicos voluntarios: +50% vida',
    morale:'Moral por las nubes: x2 ingresos 30s', bandits:'Saqueadores roban ${amt} atraídos por tu fama',
    discount:'Próxima tienda al 50%', turncoat:'¡Un superviviente era un INFILTRADO INFECTADO!',
    saboteurKill:'¡SABOTEADOR!', reviveTxt:'¡REVIVIDO!', perSec:'/s', tradeCTA:'COMERCIAR',
    incPerSec:'(+${v}/s)', tierAbandoned:'ABANDONADO', tierOperational:'OPERATIVO', tierFortified:'FORTIFICADO', tierMega:'MEGA-MALL',
    buildHint:'¡CONSTRUYE!', mallUp:'¡MALL MEJORADO!', firstBuild:'+$ ingresos! Sigue construyendo tu mall',
    reroll:'Cambiar cartas', synergy:'¡SINERGIA!',
  },
  en:{
    tagline:'Survive while you build your shopping mall.',
    play:'PLAY', upgrades:'UPGRADES', howtoBtn:'How to play',
    hint:'WASD / arrows or joystick · auto-fire',
    howtoTitle:'How to play',
    howto1:'Move with WASD / arrows (or the joystick on mobile).',
    howto2:'Your weapon auto-fires at the nearest zombie.',
    howto3:'Tap a glowing plot to build stores.',
    howto4:'Stores give passive income and combat bonuses.',
    howto5:'Level up and pick upgrade cards.',
    howto6:'Survive ever-harder waves. Boss every 5 waves!',
    gotIt:'Got it!',
    metaTitle:'Permanent upgrades', back:'Back', max:'MAX',
    traderTitle:'Refuge trader', traderSub:'Limited-time deals — drawn by your fame', close:'Close',
    levelTitle:'LEVEL UP!', chooseUpg:'Choose an upgrade',
    pauseTitle:'Paused', resume:'Resume', sound:'Sound', quitMenu:'Quit to menu',
    buildTitle:'Build store', upgradeTitle:'Upgrade store', sold:'SOLD',
    revive:'REVIVE', x2tokens:'x2 TOKENS', retry:'Retry', menu:'Menu',
    rotateTitle:'Rotate your device', rotateBody:'This game is played in landscape.<br/>Turn your phone sideways to start.',
    loading:'Loading the mall…',
    boost:'x2 INCOME 60s', boostActive:'x2 INCOME {s}s',
    waveLabel:'WAVE',
    goWin:'VICTORY!', goLose:'GAME OVER · Wave {w}',
    goStats:'Survived <b>{t}</b> · {k} zombies · {s} stores · Best wave {b}',
    tokensEarned:'Tokens earned:',
    lvl:'Lv', upgradeRow:'Level {a} → {b} · {d} · +${i}/s',
    wave:'WAVE {n}', bossWave:'⚠ BOSS — WAVE {n}',
    megaHorde:'☣ HORDE DRAWN BY YOUR FAME', refugeAssault:'⚠ REFUGE ASSAULT',
    fameTip:'Your FAME rises as you grow. More fame = more allies & resources… but more zombies & danger too.',
    arrivalTip:'A survivor seeks refuge. Protect them to the mall (watch for infiltrators!).',
    saboteurTip:'SABOTEUR! It rushes your stores — intercept it!',
    hordeTip:'Your fame attracts massive hordes. Growing fast has a price.',
    traderTip:'A trader set up shop. Tap them to trade!',
    traderHere:'Trader in the refuge!', traderLeft:'The trader left.',
    joinedRefuge:'A survivor joined your refuge.',
    qInfected:'It was an infected infiltrator! Quarantined in time.',
    qHealthy:'It was healthy… you lost an ally to paranoia.',
    sabotaged:'{store} sabotaged! (-income)', repaired:'Store repaired and back online.',
    devoured:'A survivor was devoured before reaching you.',
    tierUpToast:'Your refuge is now: {tier} — more allies arrive… and more danger.',
    supplies:'A supply convoy arrives: +${amt}', medics:'Volunteer medics: +50% HP',
    morale:'Morale soaring: x2 income 30s', bandits:'Raiders steal ${amt}, drawn by your fame',
    discount:'Next store 50% off', turncoat:'A survivor was an INFECTED INFILTRATOR!',
    saboteurKill:'SABOTEUR!', reviveTxt:'REVIVED!', perSec:'/s', tradeCTA:'TRADE',
    incPerSec:'(+${v}/s)', tierAbandoned:'ABANDONED', tierOperational:'OPERATIONAL', tierFortified:'FORTIFIED', tierMega:'MEGA-MALL',
    buildHint:'BUILD!', mallUp:'MALL UPGRADED!', firstBuild:'+$ income! Keep building your mall',
    reroll:'Reroll cards', synergy:'SYNERGY!',
  },
};

/* ---------------------------------------------------------------------------
   1. SAVE / META PERSISTENCE
--------------------------------------------------------------------------- */
const Save = {
  data:{ tokens:0, meta:{}, muted:false, bestWave:0, lang:null },
  load(){
    try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)); if(s) this.data=Object.assign(this.data,s); }catch(e){}
    if(!this.data.meta) this.data.meta={};
  },
  save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }catch(e){} },
  metaLvl(id){ return this.data.meta[id]||0; },
};

/* ---------------------------------------------------------------------------
   2. CRAZYGAMES SDK WRAPPER (graceful no-op fallback)
--------------------------------------------------------------------------- */
const CG = {
  sdk:null, ready:false, env:'disabled', busy:false, lastMidgame:0,
  async init(){
    try{
      if(window.CrazyGames && window.CrazyGames.SDK){
        this.sdk = window.CrazyGames.SDK;
        await this.sdk.init();
        try{ this.env = this.sdk.environment || 'crazygames'; }catch(e){ this.env='crazygames'; }
        this.ready = (this.env !== 'disabled');
      }
    }catch(e){ this.ready=false; }
  },
  loadingStart(){ try{ if(this.ready) this.sdk.game.loadingStart(); }catch(e){} },
  loadingStop(){ try{ if(this.ready) this.sdk.game.loadingStop(); }catch(e){} },
  gameplayStart(){ try{ if(this.ready) this.sdk.game.gameplayStart(); }catch(e){} },
  gameplayStop(){ try{ if(this.ready) this.sdk.game.gameplayStop(); }catch(e){} },
  happytime(){ try{ if(this.ready) this.sdk.game.happytime(); }catch(e){} },
  now(){ return Date.now()/1000; },

  // rewarded ad: resolves true only if the reward should be granted (never on error)
  rewardedAd(){
    return new Promise(resolve=>{
      if(this.busy){ resolve(false); return; }
      if(!this.ready){ resolve(true); return; }   // local/standalone -> grant for testing
      this.busy=true; Game.pauseForAd(true);
      const done=(ok)=>{ this.busy=false; Game.pauseForAd(false); resolve(ok); };
      try{
        this.sdk.ad.requestAd('rewarded',{
          adStarted:()=>{},
          adFinished:()=>{ this.lastMidgame=this.now(); done(true); },  // shared ad cooldown
          adError:()=>done(false),
        });
      }catch(e){ done(false); }
    });
  },

  // midgame ad: shown only at natural breaks (between runs). Self-gated to >=3 min;
  // SDK also enforces frequency. Always resolves; never blocks progress.
  midgame(){
    return new Promise(resolve=>{
      if(!this.ready || this.busy){ resolve(); return; }
      if(this.now() - this.lastMidgame < 180){ resolve(); return; }
      this.busy=true; Game.pauseForAd(true);
      const done=()=>{ this.busy=false; Game.pauseForAd(false); resolve(); };
      try{
        this.sdk.ad.requestAd('midgame',{
          adStarted:()=>{},
          adFinished:()=>{ this.lastMidgame=this.now(); done(); },
          adError:()=>done(),
        });
      }catch(e){ done(); }
    });
  },
};

/* ---------------------------------------------------------------------------
   3. AUDIO (tiny WebAudio synth, fully mutable)
--------------------------------------------------------------------------- */
const Audio2 = {
  ctx:null, muted:false, _adMuted:false,
  init(){ try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} this.muted = Save.data.muted; },
  resume(){ try{ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); }catch(e){} this.bgmStart(); },
  adMute(on){ this._adMuted=on; },   // CrazyGames: mute audio while an ad is showing
  // ---- procedural background music (no assets; mutable; silent during ads) ----
  _bgm:{on:false,step:0,timer:null},
  bgmNote(freq,dur,type,vol,t){
    if(!this.ctx) return;
    try{
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=type; o.frequency.value=freq;
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(vol,t+0.03);
      g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t+dur+0.03);
    }catch(e){}
  },
  bgmStart(){
    if(this._bgm.on || !this.ctx) return;
    this._bgm.on=true;
    const self=this;
    const roots=[110.00,87.31,130.81,98.00];      // Am · F · C · G
    const semi=n=>Math.pow(2,n/12);
    try{
      this._bgm.timer=setInterval(()=>{
        if(self.muted || self._adMuted || !self.ctx) return;
        const step=self._bgm.step++ %16;
        const wave=(typeof Game!=='undefined' && Game.stats)?Game.wave:0;
        const intense=Math.min(1, wave/15);
        const t=self.ctx.currentTime+0.06;
        const root=roots[Math.floor(step/4)%4];
        if(step%4===0) self.bgmNote(root/2,0.55,'triangle',0.045+0.02*intense,t);  // bass
        if(step%2===0) self.bgmNote(root*semi([0,7,12,16][(step/2)%4]),0.16,'sine',0.022+0.018*intense,t); // arp
        if(intense>0.4 && step%8===4) self.bgmNote(root*semi(19),0.22,'triangle',0.018*intense,t); // sparkle
      }, 150);
    }catch(e){}
  },
  blip(freq,dur,type,vol){
    if(this.muted || this._adMuted || !this.ctx) return;
    try{
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=type||'square'; o.frequency.value=freq;
      g.gain.value=(vol||0.06);
      o.connect(g); g.connect(this.ctx.destination);
      const t=this.ctx.currentTime;
      g.gain.setValueAtTime(g.gain.value,t);
      g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      o.start(t); o.stop(t+dur);
    }catch(e){}
  },
  shoot(){ this.blip(220+Math.random()*40,0.05,'square',0.03); },
  hit(){ this.blip(120,0.04,'sawtooth',0.03); },
  kill(){ this.blip(90,0.12,'triangle',0.05); },
  coin(){ this.blip(880,0.07,'square',0.04); this.blip(1320,0.07,'square',0.03); },
  build(){ this.blip(330,0.1,'square',0.06); this.blip(660,0.12,'square',0.05); },
  levelup(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.blip(f,0.15,'triangle',0.06),i*70)); },
  hurt(){ this.blip(80,0.15,'sawtooth',0.06); },
  boss(){ this.blip(60,0.5,'sawtooth',0.08); },
  toggleMute(){ this.muted=!this.muted; Save.data.muted=this.muted; Save.save(); return this.muted; },
};

/* ---------------------------------------------------------------------------
   4. CANVAS / RENDER SCALING
--------------------------------------------------------------------------- */
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let scale = 1, offX = 0, offY = 0, dpr = 1;

const _iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const _lowMem = (typeof navigator.deviceMemory==='number' && navigator.deviceMemory<=4);
function resize(){
  // CrazyGames: use DPR=1 on iOS / low-memory devices, native (capped) elsewhere
  dpr = (_iOS || _lowMem) ? 1 : Math.min(window.devicePixelRatio||1, 2);
  const vw = window.innerWidth, vh = window.innerHeight;
  scale = Math.min(vw / W, vh / H);
  const cw = W * scale, ch = H * scale;
  offX = (vw - cw) / 2; offY = (vh - ch) / 2;
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  canvas.style.position = 'absolute';
  canvas.style.left = offX + 'px';
  canvas.style.top = offY + 'px';
  canvas.width = Math.floor(cw * dpr);
  canvas.height = Math.floor(ch * dpr);
  checkOrientation();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', ()=>{ setTimeout(()=>{ resize(); }, 250); });
if(window.visualViewport){ window.visualViewport.addEventListener('resize', resize); }

// On touch devices the 16:9 arena is unplayable in portrait -> ask to rotate.
function isPortrait(){ return window.innerHeight > window.innerWidth; }
function checkOrientation(){
  const block = isTouch && isPortrait();
  Game.rotateBlock = block;
  const el = document.getElementById('rotate');
  if(el) el.classList.toggle('hidden', !block);
  if(block) resetJoystick();
}

// convert screen (client) coords to logical arena coords
function screenToWorld(clientX, clientY){
  return { x:(clientX - offX) / scale, y:(clientY - offY) / scale };
}

/* ---------------------------------------------------------------------------
   5. BUILD PLOTS (two rings around the atrium)
--------------------------------------------------------------------------- */
function makePlots(){
  const plots=[];
  const ri=170, ro=300;
  // inner ring (4)
  for(let i=0;i<4;i++){ const a=(i*90+45)*Math.PI/180; plots.push({x:CX+Math.cos(a)*ri,y:CY+Math.sin(a)*ri,store:null,lvl:0}); }
  // outer ring (8)
  for(let i=0;i<8;i++){ const a=(i*45)*Math.PI/180; plots.push({x:CX+Math.cos(a)*ro,y:CY+Math.sin(a)*(ro*0.62),store:null,lvl:0}); }
  return plots;
}

/* ---------------------------------------------------------------------------
   6. GAME STATE
--------------------------------------------------------------------------- */
const Game = {
  state:'loading',   // loading|menu|playing|paused|levelup|build|gameover|ad
  last:0, acc:0,
  // run data
  player:null, zombies:[], bullets:[], gems:[], coins:[], particles:[], texts:[], turrets:[], spits:[], deaths:[], decals:[], drones:[], shocks:[],
  plots:[], stats:null,
  cash:0, time:0, wave:1, waveTimer:0, kills:0, bossesKilled:0,
  spawnTimer:0, incomeTimer:0, airstrikeTimer:0,
  level:1, xp:0, xpNext:11,
  buffs:null, income:0,
  activePlot:null,
  boostTimer:0, reviveUsed:false, freeReviveAvail:false,
  comebackTimer:0,
  shake:0,
  // --- Refuge Fame System ---
  fame:0, fameTier:0, fameFlash:0,
  allies:[], arrivals:[], trader:null,
  arrivalTimer:0, traderTimer:0, eventTimer:0, sabotageTimer:0, fameBossTimer:0,
  buildDiscount:0, tut:{},
  refugeOn:false, mallTier:0,   // progressive disclosure + mall growth tracking
  attract:false,                // self-playing demo mode (for preview videos)

  pauseForAd(on){
    if(on){ this._prevState=this.state; this.state='ad'; Audio2.adMute(true); CG.gameplayStop(); }
    else { this.state=this._prevState||'playing'; Audio2.adMute(false); Audio2.resume();
           if(this.state==='playing') CG.gameplayStart(); }
  },
};

/* base player stats (modified by meta + cards) */
function freshStats(){
  const m=Save.data.meta;
  const startHp = 120 + (META[0].val(Save.metaLvl('startHp')));
  return {
    hp:startHp, maxHp:startHp,
    dmg:10, dmgMult:1 + META[3].val(Save.metaLvl('damage')),
    rate:2.4, rateMult:1,        // shots per second base
    projAdd:0 + (Save.metaLvl('damage')>=5?0:0),
    pierce:0, range:300,
    spd:185, spdMult:1,
    regen:1.5, magnet:80 + META[5].val(Save.metaLvl('magnet')),
    crit:0.05, critMul:2,
    shotgun:false, explosive:false, lifesteal:0,
    // extended power-up stats
    cashMult:1, xpMult:1, dr:0, dodge:0, knockback:0, bulletSize:1,
    slow:0, burn:0, bounce:0, aura:0,
    cardCounts:{},
  };
}

/* ---------------------------------------------------------------------------
   7. RUN LIFECYCLE
--------------------------------------------------------------------------- */
function startRun(){
  const s = freshStats();
  Game.stats = s;
  Game.player = { x:CX, y:CY+120, r:14, fireCd:0, hitFlash:0, dir:0, walkT:0, lastFire:0, invuln:0 };
  Game.zombies=[]; Game.bullets=[]; Game.gems=[]; Game.coins=[]; Game.particles=[]; Game.texts=[]; Game.turrets=[]; Game.spits=[]; Game.deaths=[]; Game.decals=[]; Game.drones=[]; Game.shocks=[];
  Game.plots = makePlots();
  Game.cash = 75 + META[1].val(Save.metaLvl('startCash'));
  Game.time=0; Game.wave=1; Game.waveTimer=0; Game.kills=0; Game.bossesKilled=0;
  Game.spawnTimer=0; Game.incomeTimer=0; Game.airstrikeTimer=0;
  Game.level=1; Game.xp=0; Game.xpNext=11;
  Game.boostTimer=0; Game.reviveUsed=false;
  Game.freeReviveAvail = Save.metaLvl('revive')>0;
  Game.comebackTimer=0; Game.shake=0;
  // refuge fame reset
  Game.fame=0; Game.fameTier=0; Game.fameFlash=0;
  Game.allies=[]; Game.arrivals=[]; Game.trader=null;
  Game.arrivalTimer=7; Game.traderTimer=38; Game.eventTimer=26; Game.sabotageTimer=30; Game.fameBossTimer=30;
  Game.buildDiscount=0; Game.tut={};
  Game.refugeOn=false; Game.mallTier=0; Game.syn={}; Game.attract=false;
  { const sb=$('syn-bar'); if(sb) sb.innerHTML=''; }
  // start simple: hide the refuge HUD until the systems unlock
  const fameRow=$('hud-fame'); if(fameRow) fameRow.classList.add('hidden');
  // meta: start with pharmacy
  if(Save.metaLvl('pharmaStart')>0){ Game.plots[0].store='pharma'; Game.plots[0].lvl=1; }
  recompute();
  s.hp = s.maxHp;
  Game.state='playing';
  showWaveBanner(t('wave',{n:1}));
  UI.hideAll(); UI.show('hud');
  UI.refreshJoystick();
  Audio2.resume();
  CG.gameplayStart();
}

function endRun(){
  CG.gameplayStop();
  const secs = Math.floor(Game.time);
  const tokens = Math.floor(secs/6) + Game.wave*10 + Math.floor(Game.kills*0.2) + Game.bossesKilled*50;
  Game._tokens = tokens;
  if(Game.wave > (Save.data.bestWave||0)) Save.data.bestWave = Game.wave;
  Save.save();
  Game.state='gameover';
  UI.showGameOver(secs, tokens);
}

function reviveNow(){
  Game.stats.hp = Game.stats.maxHp;
  // clear nearby zombies
  Game.zombies = Game.zombies.filter(z=>dist(z.x,z.y,Game.player.x,Game.player.y)>220);
  for(let i=0;i<30;i++) spawnParticle(Game.player.x,Game.player.y,'#36e0c8');
  Game.state='playing';
  UI.hideAll(); UI.show('hud');
  CG.gameplayStart();
}

/* ---------------------------------------------------------------------------
   8. BUFF RECOMPUTE (from built stores)
--------------------------------------------------------------------------- */
function recompute(){
  const b={ dmg:0, rate:0, speed:0, cash:0, xp:0, regen:0, maxhp:0, proj:0, turret:0, pharmaHeal:0, airstrike:0 };
  let income=0;
  for(const p of Game.plots){
    if(!p.store || p.disabledT>0) continue;   // saboteur-disabled stores give nothing
    const def = STORES.find(s=>s.id===p.store);
    const lvl = p.lvl;
    income += def.income * Math.pow(1.5, lvl-1);
    if(def.buff){
      const v = def.buff.v * lvl;
      switch(def.buff.k){
        case 'dmg': b.dmg+=v; break;
        case 'rate': b.rate+=v; break;
        case 'speed': b.speed+=v; break;
        case 'cash': b.cash+=v; break;
        case 'xp': b.xp+=v; break;
        case 'regen': b.regen+=v; break;
        case 'maxhp': b.maxhp+=v; break;
        case 'proj': b.proj+=Math.floor(def.buff.v*lvl); break;
        case 'turret': b.turret+=lvl; break;
        case 'heals': b.pharmaHeal+=v; break;
        case 'airstrike': b.airstrike+=lvl; break;
      }
    }
  }
  Game.buffs=b;
  // income per second, with meta + boost + supermarket
  const metaInc = 1 + META[2].val(Save.metaLvl('income'));
  Game.income = income * metaInc * (1 + b.cash) * (Game.boostTimer>0?2:1);
  // turrets: ensure correct count
  syncTurrets(b.turret);
  UI.refreshHUD();
}

/* effective player stats including store buffs */
function eff(){
  const s=Game.stats, b=Game.buffs;
  return {
    dmg: s.dmg * s.dmgMult * (1 + b.dmg),
    rate: s.rate * s.rateMult * (1 + b.rate),
    proj: 1 + s.projAdd + b.proj,
    pierce: s.pierce,
    range: s.range,
    spd: s.spd * s.spdMult * (1 + b.speed),
    maxHp: s.maxHp + b.maxhp,
    regen: s.regen + b.regen + b.pharmaHeal,
    magnet: s.magnet,
    crit: s.crit, critMul: s.critMul,
    shotgun:s.shotgun, explosive:s.explosive, lifesteal:s.lifesteal,
    cashMult:s.cashMult, xpMult:s.xpMult, dr:s.dr, dodge:s.dodge,
    knockback:s.knockback, bulletSize:s.bulletSize, slow:s.slow, burn:s.burn, bounce:s.bounce, aura:s.aura,
  };
}

function syncTurrets(n){
  while(Game.turrets.length < n){
    // place around mall on a free-ish spot
    const a=Math.random()*Math.PI*2, r=110+Math.random()*40;
    Game.turrets.push({ x:CX+Math.cos(a)*r, y:CY+Math.sin(a)*r, cd:0 });
  }
  Game.turrets.length = Math.min(Game.turrets.length, n);
}

/* ---------------------------------------------------------------------------
   9. INPUT
--------------------------------------------------------------------------- */
const Input = { keys:{}, joy:{active:false,dx:0,dy:0,id:-1,ox:0,oy:0} };

window.addEventListener('keydown', e=>{
  Input.keys[e.key.toLowerCase()]=true;
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
  if(e.key==='Escape'||e.key.toLowerCase()==='p'){ if(Game.state==='playing') pauseGame(); else if(Game.state==='paused') resumeGame(); }
});
window.addEventListener('keyup', e=>{ Input.keys[e.key.toLowerCase()]=false; });

function moveVector(){
  let dx=0,dy=0;
  const k=Input.keys;
  if(k['a']||k['arrowleft']) dx-=1;
  if(k['d']||k['arrowright']) dx+=1;
  if(k['w']||k['arrowup']) dy-=1;
  if(k['s']||k['arrowdown']) dy+=1;
  if(Input.joy.active){ dx=Input.joy.dx; dy=Input.joy.dy; }
  const m=Math.hypot(dx,dy);
  if(m>1){ dx/=m; dy/=m; }
  return {x:dx,y:dy};
}

// Pointer handling: tap plot to build; drag in lower-left = joystick on touch
const joystickEl = document.getElementById('joystick');
const knobEl = document.getElementById('joystick-knob');
let isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints>0;

function pointerDown(clientX, clientY, id){
  if(Game.state!=='playing') return;
  const w = screenToWorld(clientX, clientY);
  // Did we tap a plot? (build interaction)
  const p = plotAt(w.x, w.y);
  if(p){ openBuild(p); return; }
  // tap the trader stall -> open trade menu
  if(Game.trader && dist(w.x,w.y,Game.trader.x,Game.trader.y) < 40){ openTrader(); return; }
  // tap a survivor ally -> quarantine decision (could be a hidden infected!)
  const al = allyAt(w.x, w.y);
  if(al){ quarantineAlly(al); return; }
  // otherwise: movement joystick (mainly touch / left side)
  if(isTouch){
    Input.joy.active=true; Input.joy.id=id; Input.joy.ox=clientX; Input.joy.oy=clientY; Input.joy.dx=0; Input.joy.dy=0;
    joystickEl.classList.remove('hidden');
    joystickEl.style.left=(clientX-65)+'px'; joystickEl.style.top=(clientY-65)+'px';
    knobEl.style.transform='translate(0,0)';
  }
}
function pointerMove(clientX, clientY, id){
  if(Input.joy.active && Input.joy.id===id){
    let dx=clientX-Input.joy.ox, dy=clientY-Input.joy.oy;
    const max=55, m=Math.hypot(dx,dy);
    const cm=Math.min(m,max);
    const nx = m>0? dx/m:0, ny=m>0? dy/m:0;
    knobEl.style.transform=`translate(${nx*cm}px,${ny*cm}px)`;
    Input.joy.dx = m>8? nx:0; Input.joy.dy = m>8? ny:0;
  }
}
function pointerUp(id){
  if(Input.joy.id===id){ Input.joy.active=false; Input.joy.dx=0; Input.joy.dy=0; joystickEl.classList.add('hidden'); }
}
// fully cancel the virtual joystick (used when a menu opens or we rotate)
function resetJoystick(){
  Input.joy.active=false; Input.joy.dx=0; Input.joy.dy=0; Input.joy.id=-1;
  if(joystickEl) joystickEl.classList.add('hidden');
}

canvas.addEventListener('mousedown', e=>pointerDown(e.clientX,e.clientY,'mouse'));
window.addEventListener('mousemove', e=>pointerMove(e.clientX,e.clientY,'mouse'));
window.addEventListener('mouseup', ()=>pointerUp('mouse'));
canvas.addEventListener('touchstart', e=>{ e.preventDefault(); for(const t of e.changedTouches) pointerDown(t.clientX,t.clientY,t.identifier); }, {passive:false});
canvas.addEventListener('touchmove', e=>{ e.preventDefault(); for(const t of e.changedTouches) pointerMove(t.clientX,t.clientY,t.identifier); }, {passive:false});
canvas.addEventListener('touchend', e=>{ for(const t of e.changedTouches) pointerUp(t.identifier); }, {passive:false});

function plotAt(x,y){
  for(const p of Game.plots){ if(dist(x,y,p.x,p.y) < 38) return p; }
  return null;
}

/* ---------------------------------------------------------------------------
   10. SPAWNING / WAVES
--------------------------------------------------------------------------- */
// Fame "heat": higher fame adds pressure but is decoupled enough that building
// fast stays fun (it's a moderate risk dial, not a death sentence). Capped.
function threat(){ return Math.min(1.8, 1 + Game.fame/1900); }
function fameMul(){ return 1 + Game.fame/3000; }
// Spawn cadence: gentle first waves, ramps from ~wave 8, floods late.
function spawnInterval(){ return Math.max(0.09, (1.05 - Game.wave*0.05)) / threat() * (Game.comebackTimer>0?1.5:1); }

function edgeSpawn(){
  const edge = Math.floor(Math.random()*4);
  if(edge===0) return {x:Math.random()*W, y:-30};
  if(edge===1) return {x:W+30, y:Math.random()*H};
  if(edge===2) return {x:Math.random()*W, y:H+30};
  return {x:-30, y:Math.random()*H};
}

function spawnZombie(type, isBoss){
  const def = ENEMIES[type] || ENEMIES.shambler;
  const sp = edgeSpawn();
  const fm = fameMul();
  const waveHp = 10 * Math.pow(1.12, Game.wave) * fm;
  const spdMul = Math.min(1.55, 1 + Game.wave*0.012);   // they close in faster late
  const z = {
    type, x:sp.x, y:sp.y, r:def.r, color:def.color, wob:Math.random()*7,
    hp: waveHp*def.hpMul*(isBoss?16:1),
    maxHp: waveHp*def.hpMul*(isBoss?16:1),
    spd: def.spd*spdMul*(isBoss?0.65:1),
    dmg: (4+Game.wave*0.5)*def.dmg*fm*(isBoss?2.2:1),
    bounty: def.bounty*(isBoss?60:1)*(1+Game.wave*0.05),
    hitFlash:0, atkCd:0, ranged:def.ranged, explodes:def.explodes, boss:isBoss||false,
  };
  if(isBoss){ z.r=def.r*2.4; z.color='#c0392b'; z.name='THE MALL COP';
    z.bstate='approach'; z.bcd=3; z.btimer=0; z.tele=0; z.teleType=''; z.teleAng=0; z.dvx=0; z.dvy=0; z.spd=def.spd*0.8; }
  Game.zombies.push(z);
}

// Saboteur: ignores the player, rushes a built store and disables it for 12s.
function spawnSaboteur(){
  const targets = Game.plots.filter(p=>p.store && !(p.disabledT>0));
  if(!targets.length) return;
  const tp = targets[Math.floor(Math.random()*targets.length)];
  const sp = edgeSpawn(), fm = fameMul();
  const waveHp = 10 * Math.pow(1.12, Game.wave) * fm;
  Game.zombies.push({ type:'saboteur', saboteur:true, targetPlot:tp, x:sp.x, y:sp.y, r:12,
    color:'#d14b8f', wob:Math.random()*7,
    hp:waveHp*1.4, maxHp:waveHp*1.4, spd:118,
    dmg:(4+Game.wave*0.6)*fm, bounty:5*(1+Game.wave*0.05), hitFlash:0, atkCd:0 });
  if(!Game.tut.sab){ Game.tut.sab=1; toast(t('saboteurTip'),'#ff5e9e'); }
}

// Turncoat: an infiltrated infected "survivor" that turns INSIDE the refuge.
function spawnTurncoat(x,y){
  const fm = fameMul(); const waveHp = 10 * Math.pow(1.12, Game.wave) * fm;
  Game.zombies.push({ type:'turncoat', x, y, r:15, color:'#a83246', wob:Math.random()*7,
    hp:waveHp*3, maxHp:waveHp*3, spd:72, dmg:(6+Game.wave*0.7)*fm,
    bounty:8*(1+Game.wave*0.05), hitFlash:0, atkCd:0 });
  Game.shake=10; Audio2.boss();
  toast(t('turncoat'),'#ff4d5e');
}

function pickEnemyType(){
  const avail = Object.keys(ENEMIES).filter(k=>Game.wave>=ENEMIES[k].fromWave);
  // weight common ones
  const weights = avail.map(k=> k==='shambler'?3 : k==='runner'?2 : 1);
  let total=weights.reduce((a,b)=>a+b,0), r=Math.random()*total;
  for(let i=0;i<avail.length;i++){ r-=weights[i]; if(r<=0) return avail[i]; }
  return 'shambler';
}

function nextWave(){
  Game.wave++;
  Game.waveTimer=0;
  if(Game.wave % 5 === 0){
    spawnZombie('brute', true);  // boss
    Audio2.boss();
    showWaveBanner(t('bossWave',{n:Game.wave}));
  } else {
    showWaveBanner(t('wave',{n:Game.wave}));
  }
  recompute();
}

/* ---------------------------------------------------------------------------
   11. UPDATE
--------------------------------------------------------------------------- */
function update(dt){
  const s=Game.stats, e=eff(), p=Game.player;
  if(Game.attract) attractAI(dt);
  Game.time += dt;
  Game.waveTimer += dt;
  if(Game.waveTimer >= 45) nextWave();

  // progressive disclosure: keep the first ~30s pure (kill -> build -> money),
  // then unlock the refuge fame systems so casual players aren't overwhelmed.
  const storesBuilt = Game.plots.filter(pl=>pl.store).length;
  if(!Game.refugeOn && Game.time>=30) activateRefuge();
  if(Game.refugeOn){
    addFame(dt*(0.25 + 0.04*storesBuilt + 0.03*Game.allies.length));
    if(Game.fameFlash>0) Game.fameFlash-=dt;
  }

  // boost timer
  if(Game.boostTimer>0){ Game.boostTimer-=dt; if(Game.boostTimer<=0) recompute(); }
  if(Game.shake>0) Game.shake=Math.max(0,Game.shake-dt*60);

  // income tick
  Game.incomeTimer += dt;
  if(Game.incomeTimer>=1){ Game.incomeTimer-=1; if(Game.income>0){ Game.cash += Game.income; } }

  // regen
  if(e.regen>0){ s.hp=Math.min(e.maxHp, s.hp + e.regen*dt); }
  s.hp = Math.min(s.hp, e.maxHp);

  // comeback assist
  if(s.hp < e.maxHp*0.25){ Game.comebackTimer=5; } else if(Game.comebackTimer>0) Game.comebackTimer-=dt;

  // --- movement ---
  const mv = moveVector();
  p.x += mv.x * e.spd * dt;
  p.y += mv.y * e.spd * dt;
  p.x = clamp(p.x, 16, W-16); p.y = clamp(p.y, 16, H-16);
  if(mv.x||mv.y){ p.dir = Math.atan2(mv.y,mv.x); p.walkT += dt*12; }
  if(p.hitFlash>0) p.hitFlash-=dt;
  if(p.invuln>0) p.invuln-=dt;

  // --- player auto fire ---
  p.fireCd -= dt;
  if(p.fireCd<=0){
    const target = nearestZombie(p.x,p.y,e.range);
    if(target){
      p.dir = Math.atan2(target.y-p.y, target.x-p.x);
      fireWeapon(p.x,p.y,target,e);
      p.fireCd = 1/e.rate;
      p.lastFire = Game.time;
      Audio2.shoot();
    }
  }

  // --- refuge fame director (only after it unlocks) ---
  if(Game.refugeOn) updateRefuge(dt);

  // --- turrets ---
  for(const t of Game.turrets){
    t.cd-=dt;
    if(t.cd<=0){
      const tg=nearestZombie(t.x,t.y,260);
      if(tg){ fireBullet(t.x,t.y,tg.x,tg.y, e.dmg*0.5, 0, false); t.cd=0.6; }
    }
  }

  // --- combat drones (orbit the hero, auto-fire) ---
  for(const dr of Game.drones){
    dr.ang += dt*2.2;
    dr.x = p.x + Math.cos(dr.ang)*46; dr.y = p.y + Math.sin(dr.ang)*46;
    dr.cd-=dt;
    if(dr.cd<=0){ const tg=nearestZombie(dr.x,dr.y,300); if(tg){ const an=Math.atan2(tg.y-dr.y,tg.x-dr.x); fireBulletAng(dr.x,dr.y,an, e.dmg*0.45, e.pierce, false, Game.syn.storm?{bounce:1}:null); dr.cd=0.45; } }
  }

  // --- toxic aura (damages nearby foes) ---
  if(e.aura>0){
    Game._auraT=(Game._auraT||0)-dt;
    if(Game._auraT<=0){ Game._auraT=0.3;
      const rad=70+e.aura*22, dmg=(6+e.aura*4+e.dmg*0.1);
      for(const z of Game.zombies.slice()){ if(dist(z.x,z.y,p.x,p.y)<rad+z.r){
        if(Game.syn.inferno){ z.burnT=Math.max(z.burnT||0,1.5); z.burnDps=Math.max(z.burnDps||0,dmg*0.6); }
        damageZombie(z,dmg,false);
      } }
    }
  }

  // --- airstrike ---
  if(Game.buffs.airstrike>0){
    Game.airstrikeTimer += dt;
    if(Game.airstrikeTimer>=25){
      Game.airstrikeTimer=0;
      // hit densest cluster (approx: a random zombie's area)
      if(Game.zombies.length){
        const z=Game.zombies[Math.floor(Math.random()*Game.zombies.length)];
        explode(z.x,z.y,90, e.dmg*4);
        Game.shake=12;
      }
    }
  }

  // --- spawning ---
  Game.spawnTimer += dt;
  // short grace so the player can land the first builds, then the horde swells
  const grace = Game.time<9 ? 2.2 : 1;
  const graceCap = Game.time<9 ? 14 : 360;
  const si=spawnInterval()*grace;
  while(Game.spawnTimer>=si && Game.zombies.length<graceCap){
    Game.spawnTimer-=si;
    const burst = 1 + Math.floor(Game.wave/3);   // thick hordes (bullet-heaven feel)
    for(let i=0;i<burst;i++) spawnZombie(pickEnemyType(),false);
  }

  // --- bullets ---
  for(let i=Game.bullets.length-1;i>=0;i--){
    const b=Game.bullets[i];
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    let dead = b.life<=0 || b.x<-20||b.x>W+20||b.y<-20||b.y>H+20;
    if(!dead){
      for(const z of Game.zombies){
        if(b.hitSet && b.hitSet.has(z)) continue;
        if(dist(b.x,b.y,z.x,z.y) < z.r+b.r){
          let dmg=b.dmg;
          const isCrit = Math.random()<e.crit;
          if(isCrit) dmg*=e.critMul;
          if(Game.syn.frostbite && z.slowT>0) dmg*=1.35;
          // on-hit status effects
          if(b.kb){ const m=Math.hypot(b.vx,b.vy)||1; z.x+=(b.vx/m)*b.kb; z.y+=(b.vy/m)*b.kb; }
          if(b.slow){ z.slowT=Math.max(z.slowT||0, 0.8+b.slow*0.5); z.slowF=Math.max(0.35, 0.7-b.slow*0.12); }
          if(b.burn){ z.burnT=Math.max(z.burnT||0, 2); z.burnDps=Math.max(z.burnDps||0, dmg*0.16*b.burn); }
          damageZombie(z,dmg,isCrit);
          if(b.explosive){ const dm=Game.syn.demolition?1.7:1; explode(b.x,b.y,55*dm,b.dmg*0.6*dm); dead=true; break; }
          if(b.hitSet) b.hitSet.add(z);
          b.pierce--;
          if(b.pierce<0){
            if(b.bounce>0){ // ricochet to a fresh nearby target
              let bt=null,bd=180*180;
              for(const z2 of Game.zombies){ if(b.hitSet.has(z2))continue; const dd=(z2.x-b.x)**2+(z2.y-b.y)**2; if(dd<bd){bd=dd;bt=z2;} }
              if(bt){ b.bounce--; b.pierce=0; const an=Math.atan2(bt.y-b.y,bt.x-b.x); const sp=Math.hypot(b.vx,b.vy); b.vx=Math.cos(an)*sp; b.vy=Math.sin(an)*sp; break; }
            }
            dead=true; break;
          }
        }
      }
    }
    if(dead) Game.bullets.splice(i,1);
  }

  // --- spits (enemy ranged) ---
  for(let i=Game.spits.length-1;i>=0;i--){
    const sp=Game.spits[i]; sp.x+=sp.vx*dt; sp.y+=sp.vy*dt; sp.life-=dt;
    if(sp.life<=0){ Game.spits.splice(i,1); continue; }
    if(dist(sp.x,sp.y,p.x,p.y)<p.r+6){ hurtPlayer(sp.dmg); Game.spits.splice(i,1); }
  }

  // --- zombies ---
  for(let i=Game.zombies.length-1;i>=0;i--){
    const z=Game.zombies[i];
    if(z.hitFlash>0) z.hitFlash-=dt;
    // status effects: slow + burn (DoT)
    if(z.slowT>0) z.slowT-=dt;
    if(z.burnT>0){ z.burnT-=dt; z.hp-=(z.burnDps||0)*((Game.syn.thermal&&z.slowT>0)?1.8:1)*dt;
      if(Math.random()<0.25 && Game.particles.length<380) Game.particles.push({x:z.x+(Math.random()-0.5)*z.r,y:z.y-z.r*0.3,vx:0,vy:-34,life:0.3,color:'#ff8a3c',r:2});
      if(z.hp<=0){ killZombie(z); continue; } }
    const smul = z.slowT>0 ? (z.slowF||0.5) : 1;
    // saboteur: rush the target store, disable it, then turn on the player
    if(z.saboteur && z.targetPlot){
      const tp=z.targetPlot;
      const sa=Math.atan2(tp.y-z.y, tp.x-z.x);
      z.x+=Math.cos(sa)*z.spd*dt; z.y+=Math.sin(sa)*z.spd*dt;
      if(dist(z.x,z.y,tp.x,tp.y) < 34){
        if(tp.store && !(tp.disabledT>0)){
          tp.disabledT=12; recompute(); Game.shake=8;
          for(let k=0;k<16;k++) spawnParticle(tp.x,tp.y,'#ff8a3c');
          toast(t('sabotaged',{store: tx(STORES.find(s2=>s2.id===tp.store).name)}),'#ff4d5e');
        }
        z.saboteur=false; z.sabotaged=true; z.spd=70;  // now hunts the player
      }
      const dp=dist(z.x,z.y,p.x,p.y);
      if(dp<z.r+p.r){ z.atkCd-=dt; if(z.atkCd<=0){ hurtPlayer(z.dmg); z.atkCd=0.6; } }
      continue;
    }
    // boss attack pattern
    if(z.boss){ bossUpdate(z,dt,p,smul); continue; }
    const ang=Math.atan2(p.y-z.y, p.x-z.x);
    const d=dist(z.x,z.y,p.x,p.y);
    if(z.ranged && d<340){
      // stop & spit
      z.atkCd-=dt;
      if(z.atkCd<=0){ z.atkCd=2.2;
        Game.spits.push({x:z.x,y:z.y,vx:Math.cos(ang)*240,vy:Math.sin(ang)*240,life:2,dmg:z.dmg}); }
    } else {
      z.x += Math.cos(ang)*z.spd*smul*dt;
      z.y += Math.sin(ang)*z.spd*smul*dt;
    }
    // contact damage
    if(d < z.r+p.r){
      z.atkCd-=dt;
      if(z.atkCd<=0){ hurtPlayer(z.dmg); z.atkCd=0.6; }
    }
    // separation (cheap) to avoid stacking
    // (skipped per-pair for perf; rely on numbers)
  }

  // --- gems (xp) magnet & collect ---
  for(let i=Game.gems.length-1;i>=0;i--){
    const g=Game.gems[i]; const d=dist(g.x,g.y,p.x,p.y);
    if(d<e.magnet){ const a=Math.atan2(p.y-g.y,p.x-g.x); const pull=Math.min(420, 60+(e.magnet-d)*6); g.x+=Math.cos(a)*pull*dt; g.y+=Math.sin(a)*pull*dt; }
    if(d<p.r+6){ gainXp(g.val); Game.gems.splice(i,1); }
  }

  // --- particles / texts ---
  for(let i=Game.particles.length-1;i>=0;i--){ const pa=Game.particles[i]; pa.x+=pa.vx*dt; pa.y+=pa.vy*dt; pa.vx*=0.92; pa.vy*=0.92; pa.life-=dt; if(pa.life<=0) Game.particles.splice(i,1); }
  for(let i=Game.texts.length-1;i>=0;i--){ const t=Game.texts[i]; t.y-=30*dt; t.life-=dt; if(t.life<=0) Game.texts.splice(i,1); }
  for(let i=Game.deaths.length-1;i>=0;i--){ const dthc=Game.deaths[i]; dthc.t+=dt; if(dthc.t>=dthc.life) Game.deaths.splice(i,1); }
  for(let i=Game.decals.length-1;i>=0;i--){ const dc=Game.decals[i]; dc.life-=dt; if(dc.life<=0) Game.decals.splice(i,1); }
  for(let i=Game.shocks.length-1;i>=0;i--){ const sh=Game.shocks[i]; sh.r += (sh.maxR/0.55)*dt; sh.life-=dt;
    if(!sh.hit && dist(p.x,p.y,sh.x,sh.y) <= sh.r){ hurtPlayer(sh.dmg); sh.hit=true; }
    if(sh.life<=0) Game.shocks.splice(i,1); }

  if(s.hp<=0) onPlayerDead();

  // periodic HUD refresh
  UI.refreshHUD();
}

// Jump the demo straight into flashy mid-game action (built mall, fancy build).
function setupAttract(){
  ['gun','elec','cafe','market','gym','sports'].forEach((id,i)=>{ if(Game.plots[i]){ Game.plots[i].store=id; Game.plots[i].lvl=2; } });
  Object.assign(Game.stats,{ projAdd:3, pierce:1, bulletSize:1.3, crit:0.22, aura:1, slow:1, burn:1, bounce:1, dr:0.45, regen:9 });
  Game.stats.dmgMult+=1.3; Game.stats.rateMult+=0.7; Game.stats.maxHp+=160;
  Object.assign(Game.stats.cardCounts,{cryo:1,fire:1,crit:1,critdmg:1,aura:1,bounce:1});
  addDrone(); addDrone();
  Game.cash=5000; Game.wave=7; Game.refugeOn=true; Game.mallTier=2;
  Game._aiT=0; Game._aiVx=0; Game._aiVy=0;
  checkSynergies(); recompute(); Game.stats.hp=eff().maxHp;
}
// Self-playing demo. Uses ANALOG input (like a joystick) so motion is smooth
// and continuous in any direction — not snapped to 8 keyboard directions.
// The hero glides along a gentle circle around the mall (a natural kiting path).
function attractAI(dt){
  const p=Game.player;
  Game._aiT=(Game._aiT||0)+dt;
  const dx=p.x-CX, dy=p.y-CY, r=Math.hypot(dx,dy)||1, a=Math.atan2(dy,dx);
  const R=215 + Math.sin(Game._aiT*0.35)*30;     // gentle breathing radius
  // tangent (clockwise) for circular motion + soft pull toward target radius
  let vx=Math.sin(a), vy=-Math.cos(a);
  const err=(r-R)/R;
  vx += (-dx/r)*err*1.1; vy += (-dy/r)*err*1.1;
  // ease away only if a zombie is right on top
  let near=1e9,nz=null;
  for(const z of Game.zombies){ const d=(z.x-p.x)*(z.x-p.x)+(z.y-p.y)*(z.y-p.y); if(d<near){near=d;nz=z;} }
  if(nz && near<70*70){ const mm=Math.hypot(p.x-nz.x,p.y-nz.y)||1; vx+=(p.x-nz.x)/mm*0.7; vy+=(p.y-nz.y)/mm*0.7; }
  const m=Math.hypot(vx,vy)||1;
  Input.keys.w=Input.keys.a=Input.keys.s=Input.keys.d=false;
  Input.joy.active=true; Input.joy.id='ai'; Input.joy.dx=vx/m; Input.joy.dy=vy/m;
}
function fireWeapon(x,y,target,e){
  const baseAng = Math.atan2(target.y-y, target.x-x);
  const n = e.proj;
  const opts = { size:e.bulletSize, kb:e.knockback, slow:e.slow, burn:e.burn, bounce:e.bounce };
  const spread = e.shotgun ? 0.5 : 0.12;
  for(let i=0;i<n;i++){
    const a = baseAng + (n>1 ? (i-(n-1)/2)*(e.shotgun?spread/(n-1):spread) : 0);
    fireBulletAng(x,y,a,e.dmg,e.pierce,e.explosive,opts);
  }
}
function fireBulletAng(x,y,ang,dmg,pierce,explosive,opts){
  opts=opts||{};
  const sp=560;
  Game.bullets.push({x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,r:5*(opts.size||1),dmg,pierce,explosive,life:1.2,hitSet:new Set(),
    kb:opts.kb||0, slow:opts.slow||0, burn:opts.burn||0, bounce:opts.bounce||0});
}
function fireBullet(x,y,tx,ty,dmg,pierce,explosive){
  const ang=Math.atan2(ty-y,tx-x); fireBulletAng(x,y,ang,dmg,pierce,explosive);
}
function addDrone(){ Game.drones.push({ ang:Math.random()*6.28, cd:0 }); }

function damageZombie(z,dmg,crit){
  z.hp-=dmg; z.hitFlash=0.08;
  addText(z.x, z.y-z.r, Math.round(dmg), crit?'#ffcf3f':'#fff', crit?16:12);
  if(z.hp<=0) killZombie(z);
}

function killZombie(z){
  const idx=Game.zombies.indexOf(z); if(idx<0) return;
  Game.zombies.splice(idx,1);
  Game.kills++;
  Audio2.kill();
  // cash
  const gain = Math.ceil(z.bounty * (1+Game.buffs.cash) * (1+META[2].val(Save.metaLvl('income'))) * (Game.stats.cashMult||1));
  Game.cash += gain;
  addText(z.x,z.y,'+$'+gain,'#ffcf3f',13);
  Audio2.coin();
  // fame from notoriety of the kill
  addFame(0.12 + Game.wave*0.01);
  if(z.saboteur || z.sabotaged){ Game.cash+=20+Game.wave*5; addText(z.x,z.y-22,t('saboteurKill'),'#ff5e9e',14); addFame(6); }
  // xp gem
  Game.gems.push({x:z.x,y:z.y,val: z.boss?40: (1+Math.floor(Game.wave*0.2)) });
  // death animation (squash + blood + floor stain)
  spawnDeath(z);
  // lifesteal
  if(Game.stats.lifesteal>0){ Game.stats.hp=Math.min(eff().maxHp, Game.stats.hp+Game.stats.lifesteal); }
  if(z.explodes){ explode(z.x,z.y,60, 8+Game.wave); spawnZombie('shambler',false); spawnZombie('shambler',false); }
  if(z.boss){ Game.bossesKilled++; Game.cash+=200+Game.wave*20; Game.shake=14; addText(z.x,z.y-30,'BOSS!','#ff4d5e',24);
    addFame(120);
    // guaranteed level up reward
    gainXp(Game.xpNext); }
}

function explode(x,y,radius,dmg){
  for(let i=0;i<14;i++) spawnParticle(x,y,'#ff8a3c');
  for(const z of Game.zombies.slice()){
    if(dist(x,y,z.x,z.y)<radius+z.r) damageZombie(z,dmg,false);
  }
}

/* ---- BOSS: The Mall Cop — telegraphed attack pattern, 2 phases ---- */
function bossUpdate(z,dt,p,smul){
  smul = smul||1;
  if(z.tele>0) z.tele-=dt;
  const ph2 = z.hp < z.maxHp*0.5;          // enrage under 50%
  const d = dist(z.x,z.y,p.x,p.y);
  if(z.bstate==='approach'){
    const ang=Math.atan2(p.y-z.y,p.x-z.x), spd=z.spd*(ph2?1.3:1)*smul;
    z.x+=Math.cos(ang)*spd*dt; z.y+=Math.sin(ang)*spd*dt;
    if(d<z.r+p.r){ z.atkCd-=dt; if(z.atkCd<=0){ hurtPlayer(z.dmg); z.atkCd=0.8; } }
    z.bcd-=dt;
    if(z.bcd<=0){
      const r=Math.random();
      if(d>190 && r<0.55) bossStartCharge(z,p);
      else if(r<0.8) bossStartSlam(z);
      else bossSummon(z,ph2);
    }
  } else if(z.bstate==='windup'){           // charge telegraph
    z.btimer-=dt; if(z.btimer<=0){ z.bstate='dash'; z.btimer=ph2?0.6:0.5; Game.shake=6; }
  } else if(z.bstate==='dash'){
    z.x+=z.dvx*dt; z.y+=z.dvy*dt;
    for(let k=0;k<2;k++) spawnParticle(z.x,z.y,'#ff5e7a');
    if(d<z.r+p.r){ z.atkCd-=dt; if(z.atkCd<=0){ hurtPlayer(z.dmg*1.7); z.atkCd=0.5; } }
    z.btimer-=dt; if(z.btimer<=0){ z.bstate='approach'; z.bcd=ph2?1.8:2.8; }
  } else if(z.bstate==='slamwind'){         // slam telegraph
    z.btimer-=dt;
    if(z.btimer<=0){
      Game.shocks.push({x:z.x,y:z.y,r:z.r,maxR:180,life:0.55,dmg:z.dmg*1.4,hit:false});
      Game.shake=14; Audio2.boss(); z.bstate='approach'; z.bcd=ph2?2.2:3.2;
    }
  }
}
function bossStartCharge(z,p){
  const ang=Math.atan2(p.y-z.y,p.x-z.x), sp=480;
  z.dvx=Math.cos(ang)*sp; z.dvy=Math.sin(ang)*sp;
  z.bstate='windup'; z.btimer=0.7; z.tele=0.7; z.teleType='charge'; z.teleAng=ang;
}
function bossStartSlam(z){ z.bstate='slamwind'; z.btimer=0.6; z.tele=0.6; z.teleType='slam'; }
function bossSummon(z,ph2){
  z.tele=0.5; z.teleType='summon';
  const n=ph2?5:3;
  for(let i=0;i<n && Game.zombies.length<280;i++){
    const a=Math.random()*7; spawnZombie(Math.random()<0.5?'runner':'shambler',false);
    const nz=Game.zombies[Game.zombies.length-1]; nz.x=z.x+Math.cos(a)*46; nz.y=z.y+Math.sin(a)*46;
  }
  z.bstate='approach'; z.bcd=ph2?2.6:3.8;
}

function hurtPlayer(dmg){
  const p=Game.player, s=Game.stats;
  if(p.invuln>0) return;                 // i-frames: density can't instakill
  if(s.dodge>0 && Math.random()<s.dodge){ p.invuln=0.25; addText(p.x,p.y-20,'MISS','#9fffd0',14); return; }
  dmg *= (1 - (s.dr||0));                 // armor / damage reduction
  s.hp-=dmg; p.hitFlash=0.5; p.invuln=0.7; Game.shake=Math.min(10,Game.shake+4);
  Audio2.hurt();
  addText(p.x,p.y-20,'-'+Math.round(dmg),'#ff4d5e',14);
}

function onPlayerDead(){
  if(Game.state!=='playing') return;
  // free revive from meta
  if(Game.freeReviveAvail && !Game.reviveUsed){
    Game.freeReviveAvail=false; Game.reviveUsed=true;
    addText(Game.player.x,Game.player.y-40,t('reviveTxt'),'#36e0c8',22);
    Game.stats.hp=Game.stats.maxHp+Game.buffs.maxhp;
    Game.zombies=Game.zombies.filter(z=>dist(z.x,z.y,Game.player.x,Game.player.y)>220);
    return;
  }
  endRun();
}

function gainXp(v){
  Game.xp += v * (1+Game.buffs.xp) * (Game.stats.xpMult||1);
  while(Game.xp>=Game.xpNext){
    Game.xp-=Game.xpNext;
    Game.level++;
    Game.xpNext = 5 + Game.level*6;
    openLevelUp();
  }
}

/* ---------------------------------------------------------------------------
   12. HELPERS
--------------------------------------------------------------------------- */
function dist(x1,y1,x2,y2){ return Math.hypot(x1-x2,y1-y2); }
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function nearestZombie(x,y,maxR){
  let best=null,bd=maxR*maxR;
  for(const z of Game.zombies){ const d=(z.x-x)*(z.x-x)+(z.y-y)*(z.y-y); if(d<bd){bd=d;best=z;} }
  return best;
}
function spawnParticle(x,y,color){
  if(Game.particles.length>400) return;
  const a=Math.random()*Math.PI*2, s=40+Math.random()*120;
  Game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.4+Math.random()*0.3,color,r:2+Math.random()*2});
}
function addText(x,y,txt,color,size){ if(Game.texts.length>120) return; Game.texts.push({x,y,txt:String(txt),color,size:size||12,life:0.7}); }
// gory death: squashing corpse anim + blood burst + a fading floor stain
function spawnDeath(z){
  Game.deaths.push({ x:z.x, y:z.y, r:z.r, color:z.color, t:0, life:z.boss?0.7:0.42, boss:!!z.boss });
  if(Game.decals.length>44) Game.decals.shift();
  Game.decals.push({ x:z.x, y:z.y+z.r*0.4, r:z.r*(z.boss?2.0:1.15), rot:Math.random()*7, life:5 });
  const n=z.boss?22:7;
  for(let i=0;i<n;i++){ const a=Math.random()*7, s=60+Math.random()*150;
    Game.particles.push({x:z.x,y:z.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.35+Math.random()*0.3,color: Math.random()<0.6?'#b3122b':z.color, r:2+Math.random()*2.5}); }
}
// darken/lighten a #hex color -> rgb() string
function shade(hex, amt){
  let c=(''+hex).replace('#',''); if(c.length===3) c=c.split('').map(x=>x+x).join('');
  const r=clamp(parseInt(c.slice(0,2),16)+amt,0,255)|0, g=clamp(parseInt(c.slice(2,4),16)+amt,0,255)|0, b=clamp(parseInt(c.slice(4,6),16)+amt,0,255)|0;
  return 'rgb('+r+','+g+','+b+')';
}

/* ---------------------------------------------------------------------------
   12b. REFUGE FAME SYSTEM — director, survivors, traders, events
--------------------------------------------------------------------------- */
function fameTierIndex(){
  let idx=0;
  for(let i=0;i<FAME_TIERS.length;i++){ if(Game.fame>=FAME_TIERS[i].min) idx=i; }
  return idx;
}
// unlock the deeper systems once the player already "gets" the core loop
function activateRefuge(){
  if(Game.refugeOn) return;
  Game.refugeOn=true;
  const fameRow=$('hud-fame'); if(fameRow) fameRow.classList.remove('hidden');
  // fresh timers so events start staggered, not all at once
  Game.arrivalTimer=6; Game.traderTimer=20; Game.eventTimer=18; Game.sabotageTimer=28;
  toast(t('fameTip'),'#ffcf3f');
}
// mall visual tier from number of built stores (lower thresholds = faster growth)
function mallTierOf(count){ return count>=6?3 : count>=3?2 : count>=1?1 : 0; }
function addFame(v){
  Game.fame = Math.max(0, Game.fame + v);
  const idx = fameTierIndex();
  if(idx > Game.fameTier){
    Game.fameTier = idx; Game.fameFlash = 1.6;
    const ft = FAME_TIERS[idx], nm = tx(ft.name);
    showWaveBanner(nm.toUpperCase());
    toast(t('tierUpToast',{tier:nm}), ft.color);
    Audio2.levelup();
  }
}

// transient on-screen event messages (DOM toasts)
function toast(msg, color){
  const box = $('toasts'); if(!box) return;
  const el = document.createElement('div');
  el.className='toast'; el.textContent=msg; el.style.borderColor=color||'#36e0c8';
  box.appendChild(el);
  while(box.children.length>4) box.removeChild(box.firstChild);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); },400); }, 3400);
}

function updateRefuge(dt){
  const e=eff(), p=Game.player, tier=fameTierIndex();

  // disabled-store repair timers
  for(const pl of Game.plots){
    if(pl.disabledT>0){ pl.disabledT-=dt; if(pl.disabledT<=0){ pl.disabledT=0; recompute(); toast(t('repaired'),'#5dff8f'); } }
  }

  // arriving survivors walk toward the mall (can be devoured en route)
  for(let i=Game.arrivals.length-1;i>=0;i--){
    const a=Game.arrivals[i];
    const da=Math.atan2(CY-a.y, CX-a.x);
    a.x+=Math.cos(da)*74*dt; a.y+=Math.sin(da)*74*dt;
    let eaten=false;
    for(const z of Game.zombies){ if(dist(z.x,z.y,a.x,a.y) < z.r+10){ eaten=true; break; } }
    if(eaten){ Game.arrivals.splice(i,1); for(let k=0;k<8;k++) spawnParticle(a.x,a.y,'#ff4d5e'); toast(t('devoured'),'#ff4d5e'); addFame(-5); continue; }
    if(dist(a.x,a.y,CX,CY) < 118){ Game.arrivals.splice(i,1); joinAlly(a.infected); }
  }

  // allies: shoot + infected ones eventually turn
  for(let i=Game.allies.length-1;i>=0;i--){
    const al=Game.allies[i];
    al.cd-=dt;
    if(al.cd<=0){ const tg=nearestZombie(al.x,al.y,250); if(tg){ fireBullet(al.x,al.y,tg.x,tg.y, e.dmg*0.45,0,false); al.cd=0.7; } }
    if(al.infected){ al.turnTimer-=dt; if(al.turnTimer<=0){ spawnTurncoat(al.x,al.y); Game.allies.splice(i,1); } }
  }

  // arrivals director — rate scales with fame
  Game.arrivalTimer-=dt;
  if(Game.arrivalTimer<=0){
    Game.arrivalTimer = Math.max(6, 22 - tier*3) + Math.random()*6;
    if(Game.allies.length + Game.arrivals.length < 14) spawnArrival();
  }

  // trader director
  if(Game.trader){
    Game.trader.timer-=dt;
    if(Game.trader.timer<=0){ Game.trader=null; toast(t('traderLeft'),'#8b96b8'); }
  } else {
    Game.traderTimer-=dt;
    if(Game.traderTimer<=0 && tier>=1){ Game.traderTimer = Math.max(24, 55 - tier*4) + Math.random()*15; spawnTrader(tier); }
  }

  // saboteur director (tier >= 2)
  if(tier>=2){
    Game.sabotageTimer-=dt;
    if(Game.sabotageTimer<=0){ Game.sabotageTimer = Math.max(14, 40 - tier*4) + Math.random()*10; spawnSaboteur(); }
  }

  // random events
  Game.eventTimer-=dt;
  if(Game.eventTimer<=0){ Game.eventTimer = Math.max(16, 34 - tier*2) + Math.random()*12; fireRandomEvent(tier); }

  // refuge-assault boss (tier >= 3)
  if(tier>=3){
    Game.fameBossTimer-=dt;
    if(Game.fameBossTimer<=0){ Game.fameBossTimer = Math.max(45, 95 - tier*9) + Math.random()*20; spawnFameBoss(); }
  } else { Game.fameBossTimer = 30; }
}

function spawnArrival(){
  const sp=edgeSpawn(), tier=fameTierIndex();
  const infChance = Math.min(0.45, 0.04 + tier*0.07);  // famous refuges attract infiltrators
  Game.arrivals.push({ x:sp.x, y:sp.y, infected: Math.random()<infChance });
  if(!Game.tut.arr){ Game.tut.arr=1; toast(t('arrivalTip'),'#5dff8f'); }
}

function joinAlly(infected){
  const a=Math.random()*Math.PI*2, r=118+Math.random()*32;
  Game.allies.push({ x:CX+Math.cos(a)*r, y:CY+Math.sin(a)*r, cd:Math.random()*0.7, infected:!!infected, turnTimer:14+Math.random()*16 });
  addFame(15);
  Audio2.coin();
  // same neutral message whether infected or not -> tension/paranoia
  toast(t('joinedRefuge'), '#5dff8f');
}
function joinAllyClean(){  // mercenary from trader — never infected
  const a=Math.random()*Math.PI*2, r=118+Math.random()*32;
  Game.allies.push({ x:CX+Math.cos(a)*r, y:CY+Math.sin(a)*r, cd:0, infected:false, turnTimer:0 });
}
function allyAt(x,y){ for(const al of Game.allies){ if(dist(x,y,al.x,al.y)<18) return al; } return null; }
function quarantineAlly(al){
  const idx=Game.allies.indexOf(al); if(idx<0) return;
  Game.allies.splice(idx,1);
  for(let k=0;k<10;k++) spawnParticle(al.x,al.y,'#7ce6ff');
  if(al.infected){ toast(t('qInfected'),'#5dff8f'); addFame(10); }
  else { toast(t('qHealthy'),'#ff9f43'); addFame(-8); }
  Audio2.hit();
}

function spawnTrader(tier){
  Game.trader = { x:CX, y:CY-108, timer:35, deals: makeTraderDeals(tier) };
  if(!Game.tut.trader){ Game.tut.trader=1; toast(t('traderTip'),'#7ce6ff'); }
  else toast(t('traderHere'),'#7ce6ff');
  Audio2.build();
}
function makeTraderDeals(tier){
  const w=Game.wave;
  const all=[
    { ico:'heart',  name:{es:'Botiquín',en:'Med kit'},       desc:{es:'Cura completa',en:'Full heal'},               cost:60+w*10,  apply:()=>{ Game.stats.hp=eff().maxHp; } },
    { ico:'proj',   name:{es:'Munición pesada',en:'Heavy ammo'}, desc:{es:'+1 proyectil permanente',en:'+1 permanent projectile'}, cost:200+w*30, apply:()=>{ Game.stats.projAdd+=1; recompute(); } },
    { ico:'surv',   name:{es:'Mercenario',en:'Mercenary'},    desc:{es:'Aliado de combate (sano)',en:'Combat ally (clean)'}, cost:150+w*25, apply:()=>{ joinAllyClean(); } },
    { ico:'armor',  name:{es:'Chaleco',en:'Vest'},            desc:{es:'+40 vida máxima',en:'+40 max HP'},            cost:120+w*20, apply:()=>{ Game.stats.maxHp+=40; Game.stats.hp+=40; } },
    { ico:'build',  name:{es:'Descuento',en:'Discount'},      desc:{es:'-50% próxima tienda',en:'-50% next store'},   cost:80+w*10,  apply:()=>{ Game.buildDiscount=0.5; toast(t('discount'),'#ffcf3f'); } },
    { ico:'dmg',    name:{es:'Mejora de daño',en:'Damage boost'}, desc:{es:'+15% daño permanente',en:'+15% permanent damage'}, cost:180+w*25, apply:()=>{ Game.stats.dmgMult+=0.15; recompute(); } },
  ];
  const n=Math.min(all.length, 3 + (tier>=3?1:0));
  return all.slice().sort(()=>Math.random()-0.5).slice(0,n).map(d=>({ ...d, sold:false }));
}

function fireRandomEvent(tier){
  const pos=[
    ()=>{ const amt=40+Game.wave*15; Game.cash+=amt; toast(t('supplies',{amt}),'#ffcf3f'); addFame(8); },
    ()=>{ Game.stats.hp=Math.min(eff().maxHp, Game.stats.hp+eff().maxHp*0.5); toast(t('medics'),'#5dff8f'); },
    ()=>{ Game.boostTimer=Math.max(Game.boostTimer,30); recompute(); toast(t('morale'),'#ff5e9e'); },
  ];
  const neg=[
    ()=>megaHorde(),
    ()=>spawnSaboteur(),
    ()=>{ const steal=Math.min(Game.cash, Math.round(Game.cash*0.15)); Game.cash-=steal; addFame(-10); toast(t('bandits',{amt:steal}),'#ff4d5e'); },
  ];
  const negChance = Math.min(0.7, 0.2 + tier*0.1);
  const pool = (Math.random()<negChance) ? neg : pos;
  pool[Math.floor(Math.random()*pool.length)]();
}
function megaHorde(){
  const n = 10 + Game.wave*2 + fameTierIndex()*5;
  for(let i=0;i<n && Game.zombies.length<300;i++) spawnZombie(pickEnemyType(), false);
  showWaveBanner(t('megaHorde'));
  Audio2.boss(); Game.shake=12;
  if(!Game.tut.horde){ Game.tut.horde=1; toast(t('hordeTip'),'#ff9f43'); }
}
function spawnFameBoss(){
  spawnZombie('brute', true);
  showWaveBanner(t('refugeAssault'));
  Audio2.boss(); Game.shake=14;
}

/* ---------------------------------------------------------------------------
   12c. VECTOR ICON LIBRARY (custom-drawn, replaces emojis everywhere)
--------------------------------------------------------------------------- */
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function _circle(g,x,y,r){ g.beginPath(); g.arc(x,y,r,0,7); }

// Draw icon `id` centered at (cx,cy), fitting ~s px. Flat 2–3 tone neon style.
function drawIcon(g, id, cx, cy, s){
  g.save(); g.translate(cx,cy);
  const u=s*0.5; g.lineWidth=Math.max(1.6,s*0.07); g.lineJoin='round'; g.lineCap='round';
  const set=(c)=>{ g.fillStyle=c; g.strokeStyle=c; };
  switch(id){
    case 'cafe': set('#c98a5a'); rr(g,-u*0.7,-u*0.45,u*1.15,u*0.95,s*0.06); g.fill();
      g.strokeStyle='#c98a5a'; g.beginPath(); g.arc(u*0.55,-u*0.05,u*0.3,-1.1,1.1); g.stroke();
      g.strokeStyle='#fff'; g.globalAlpha=.7; g.beginPath(); g.moveTo(-u*0.3,-u*0.7); g.quadraticCurveTo(-u*0.05,-u*0.55,-u*0.3,-u*0.9); g.moveTo(u*0.1,-u*0.7); g.quadraticCurveTo(u*0.35,-u*0.55,u*0.1,-u*0.9); g.stroke(); g.globalAlpha=1; break;
    case 'gun': set('#e0e6ef'); rr(g,-u*0.85,-u*0.25,u*1.5,u*0.5,s*0.05); g.fill();
      rr(g,-u*0.2,0,u*0.45,u*0.7,s*0.04); g.fill(); g.fillStyle='#ff8a5c'; rr(g,u*0.45,-u*0.18,u*0.35,u*0.18,2); g.fill(); break;
    case 'pharma': set('#ff5e7a'); _circle(g,0,0,u*0.9); g.fill(); g.fillStyle='#fff';
      rr(g,-u*0.45,-u*0.16,u*0.9,u*0.32,2); g.fill(); rr(g,-u*0.16,-u*0.45,u*0.32,u*0.9,2); g.fill(); break;
    case 'rest': set('#ffce5a'); g.beginPath(); g.arc(0,u*0.1,u*0.78,Math.PI,0); g.fill();
      g.fillStyle='#ff8a5c'; g.beginPath(); g.arc(0,u*0.1,u*0.78,Math.PI,0); g.fill(); g.fillStyle='#ffce5a'; rr(g,-u*0.85,u*0.1,u*1.7,u*0.28,3); g.fill();
      g.fillStyle='#8fd14e'; _circle(g,-u*0.3,-u*0.2,u*0.12); g.fill(); _circle(g,u*0.2,-u*0.28,u*0.1); g.fill(); break;
    case 'gym': set('#cfd6e6'); rr(g,-u*0.9,-u*0.18,u*0.35,u*0.36,2); g.fill(); rr(g,u*0.55,-u*0.18,u*0.35,u*0.36,2); g.fill();
      rr(g,-u*0.6,-u*0.1,u*1.2,u*0.2,2); g.fill(); rr(g,-u*0.62,-u*0.3,u*0.16,u*0.6,2); g.fill(); rr(g,u*0.46,-u*0.3,u*0.16,u*0.6,2); g.fill(); break;
    case 'market': set('#5dd6ff'); g.lineWidth=s*0.09; g.beginPath(); g.moveTo(-u*0.8,-u*0.6); g.lineTo(-u*0.5,-u*0.6); g.lineTo(-u*0.25,u*0.3); g.lineTo(u*0.7,u*0.3); g.lineTo(u*0.85,-u*0.35); g.lineTo(-u*0.35,-u*0.35); g.stroke();
      g.fillStyle='#5dd6ff'; _circle(g,-u*0.1,u*0.6,u*0.13); g.fill(); _circle(g,u*0.55,u*0.6,u*0.13); g.fill(); break;
    case 'security': set('#7c9cff'); g.beginPath(); g.moveTo(0,-u*0.85); g.lineTo(u*0.8,-u*0.5); g.lineTo(u*0.8,u*0.1); g.quadraticCurveTo(u*0.8,u*0.7,0,u*0.9); g.quadraticCurveTo(-u*0.8,u*0.7,-u*0.8,u*0.1); g.lineTo(-u*0.8,-u*0.5); g.closePath(); g.fill();
      g.fillStyle='#fff'; g.lineWidth=s*0.1; g.strokeStyle='#fff'; g.beginPath(); g.moveTo(-u*0.32,0); g.lineTo(-u*0.05,u*0.3); g.lineTo(u*0.4,-u*0.3); g.stroke(); break;
    case 'elec': set('#ffd23f'); g.beginPath(); g.moveTo(u*0.15,-u*0.9); g.lineTo(-u*0.5,u*0.12); g.lineTo(-u*0.02,u*0.12); g.lineTo(-u*0.2,u*0.9); g.lineTo(u*0.55,-u*0.18); g.lineTo(u*0.05,-u*0.18); g.closePath(); g.fill(); break;
    case 'sports': set('#ff5e7a'); _circle(g,0,0,u*0.9); g.fill(); g.fillStyle='#fff'; _circle(g,0,0,u*0.6); g.fill();
      g.fillStyle='#5dd6ff'; _circle(g,0,0,u*0.34); g.fill(); g.fillStyle='#ff5e7a'; _circle(g,0,0,u*0.12); g.fill(); break;
    case 'armor': set('#b6ff3b'); g.beginPath(); g.moveTo(0,-u*0.85); g.lineTo(u*0.78,-u*0.45); g.lineTo(u*0.78,u*0.15); g.quadraticCurveTo(u*0.78,u*0.7,0,u*0.9); g.quadraticCurveTo(-u*0.78,u*0.7,-u*0.78,u*0.15); g.lineTo(-u*0.78,-u*0.45); g.closePath(); g.fill();
      g.strokeStyle='#1c0b2e'; g.lineWidth=s*0.06; g.beginPath(); g.moveTo(0,-u*0.6); g.lineTo(0,u*0.6); g.stroke(); break;
    case 'jewel': set('#5dffe0'); g.beginPath(); g.moveTo(0,-u*0.7); g.lineTo(u*0.75,-u*0.15); g.lineTo(0,u*0.85); g.lineTo(-u*0.75,-u*0.15); g.closePath(); g.fill();
      g.strokeStyle='#0d2e2a'; g.lineWidth=s*0.05; g.beginPath(); g.moveTo(-u*0.75,-u*0.15); g.lineTo(u*0.75,-u*0.15); g.moveTo(0,-u*0.7); g.lineTo(0,-u*0.15); g.stroke(); break;
    case 'heli': set('#cfd6e6'); g.lineWidth=s*0.1; g.beginPath(); g.moveTo(-u*0.85,-u*0.55); g.lineTo(u*0.85,-u*0.55); g.stroke();
      g.fillStyle='#7c9cff'; _circle(g,0,u*0.1,u*0.55); g.fill(); g.fillStyle='#cfd6e6'; rr(g,u*0.35,-u*0.05,u*0.6,u*0.22,3); g.fill(); g.fillStyle='#cfd6e6'; rr(g,-u*0.06,-u*0.55,u*0.12,u*0.3,2); g.fill(); break;
    // ---- combat cards ----
    case 'dmg': set('#ff5e7a'); g.beginPath(); for(let i=0;i<8;i++){ const a=i/8*6.283, r=(i%2?u*0.4:u*0.9); g[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);} g.closePath(); g.fill(); break;
    case 'rate': set('#ff8a3c'); g.beginPath(); g.moveTo(-u*0.1,-u*0.9); g.quadraticCurveTo(-u*0.7,-u*0.1,-u*0.15,u*0.05); g.quadraticCurveTo(-u*0.5,u*0.6,u*0.1,u*0.9); g.quadraticCurveTo(u*0.7,u*0.1,u*0.15,-u*0.05); g.quadraticCurveTo(u*0.45,-u*0.5,-u*0.1,-u*0.9); g.closePath(); g.fill(); break;
    case 'proj': set('#5dd6ff'); g.beginPath(); g.moveTo(u*0.85,0); g.lineTo(-u*0.5,-u*0.55); g.lineTo(-u*0.25,0); g.lineTo(-u*0.5,u*0.55); g.closePath(); g.fill(); break;
    case 'pierce': set('#b6ff3b'); g.lineWidth=s*0.12; g.beginPath(); g.moveTo(-u*0.8,u*0.8); g.lineTo(u*0.8,-u*0.8); g.stroke();
      g.beginPath(); g.moveTo(u*0.3,-u*0.8); g.lineTo(u*0.8,-u*0.8); g.lineTo(u*0.8,-u*0.3); g.stroke(); break;
    case 'speed': set('#5dd6ff'); for(let i=0;i<3;i++){ g.beginPath(); const o=-u*0.5+i*u*0.5; g.moveTo(o,-u*0.6); g.lineTo(o+u*0.35,0); g.lineTo(o,u*0.6); g.lineTo(o-u*0.1,u*0.6); g.lineTo(o+u*0.2,0); g.lineTo(o-u*0.1,-u*0.6); g.closePath(); g.fill(); } break;
    case 'heart': set('#ff3b5c'); g.beginPath(); g.moveTo(0,u*0.8); g.bezierCurveTo(-u*1.1,-u*0.05,-u*0.45,-u*0.95,0,-u*0.25); g.bezierCurveTo(u*0.45,-u*0.95,u*1.1,-u*0.05,0,u*0.8); g.closePath(); g.fill(); break;
    case 'regen': set('#b6ff3b'); rr(g,-u*0.22,-u*0.8,u*0.44,u*1.6,3); g.fill(); rr(g,-u*0.8,-u*0.22,u*1.6,u*0.44,3); g.fill(); break;
    case 'magnet': set('#ff5e7a'); g.lineWidth=s*0.26; g.strokeStyle='#ff5e7a'; g.beginPath(); g.arc(0,u*0.05,u*0.6,Math.PI,0); g.stroke();
      g.lineWidth=1; g.fillStyle='#cfd6e6'; rr(g,-u*0.73,u*0.0,u*0.26,u*0.5,1); g.fill(); rr(g,u*0.47,u*0.0,u*0.26,u*0.5,1); g.fill(); break;
    case 'crit': set('#ffd23f'); g.beginPath(); for(let i=0;i<12;i++){ const a=i/12*6.283, r=(i%2?u*0.3:u*0.95); g[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);} g.closePath(); g.fill(); break;
    case 'range': set('#5dd6ff'); g.lineWidth=s*0.09; g.beginPath(); g.arc(0,0,u*0.85,0,7); g.stroke(); g.beginPath(); g.arc(0,0,u*0.45,0,7); g.stroke(); g.fillStyle='#5dd6ff'; _circle(g,0,0,u*0.13); g.fill(); break;
    case 'shotgun': set('#e0e6ef'); rr(g,-u*0.9,-u*0.2,u*1.7,u*0.34,2); g.fill(); rr(g,-u*0.9,u*0.0,u*1.7,u*0.34,2); g.fill(); g.fillStyle='#8a5a2a'; rr(g,-u*0.95,-u*0.05,u*0.4,u*0.55,2); g.fill(); break;
    case 'rocket': set('#cfd6e6'); g.beginPath(); g.moveTo(0,-u*0.9); g.quadraticCurveTo(u*0.45,-u*0.3,u*0.4,u*0.4); g.lineTo(-u*0.4,u*0.4); g.quadraticCurveTo(-u*0.45,-u*0.3,0,-u*0.9); g.closePath(); g.fill();
      g.fillStyle='#ff5e7a'; g.beginPath(); g.moveTo(-u*0.4,u*0.4); g.lineTo(-u*0.7,u*0.8); g.lineTo(-u*0.1,u*0.5); g.closePath(); g.moveTo(u*0.4,u*0.4); g.lineTo(u*0.7,u*0.8); g.lineTo(u*0.1,u*0.5); g.fill();
      g.fillStyle='#5dd6ff'; _circle(g,0,-u*0.15,u*0.16); g.fill(); break;
    case 'vamp': set('#ff3b5c'); g.beginPath(); g.moveTo(0,-u*0.9); g.quadraticCurveTo(u*0.7,u*0.1,0,u*0.85); g.quadraticCurveTo(-u*0.7,u*0.1,0,-u*0.9); g.closePath(); g.fill();
      g.fillStyle='#fff'; g.globalAlpha=.8; _circle(g,-u*0.18,-u*0.1,u*0.12); g.fill(); g.globalAlpha=1; break;
    // ---- meta / ui / world ----
    case 'cash': set('#ffc23c'); _circle(g,0,0,u*0.92); g.fill(); g.fillStyle='#9a6a10'; g.font='bold '+(s*0.8)+'px Rajdhani'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('$',0,s*0.04); break;
    case 'token': set('#ffd23f'); _circle(g,0,0,u*0.92); g.fill(); g.strokeStyle='#9a6a10'; g.lineWidth=s*0.07; _circle(g,0,0,u*0.62); g.stroke(); g.fillStyle='#9a6a10'; g.beginPath(); for(let i=0;i<5;i++){const a=i/5*6.283-1.57,r=(i%2?u*0.2:u*0.46); g[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);} g.closePath(); g.fill(); break;
    case 'build': set('#ffc23c'); rr(g,-u*0.5,-u*0.85,u*0.3,u*1.7,2); g.fill(); g.save(); g.rotate(0.5); rr(g,-u*0.15,-u*0.95,u*0.3,u*0.9,2); g.fill(); g.restore(); g.fillStyle='#cfd6e6'; rr(g,-u*0.85,u*0.55,u*1.7,u*0.3,2); g.fill(); break;
    case 'revive': set('#5dff8f'); g.lineWidth=s*0.12; g.strokeStyle='#5dff8f'; g.beginPath(); g.arc(0,0,u*0.7,-1.2,4.2); g.stroke(); g.fillStyle='#5dff8f'; g.beginPath(); g.moveTo(u*0.62,-u*0.85); g.lineTo(u*0.78,-u*0.1); g.lineTo(u*0.1,-u*0.4); g.closePath(); g.fill(); break;
    case 'skull': set('#cfd6e6'); g.beginPath(); g.arc(0,-u*0.15,u*0.8,Math.PI,0); g.lineTo(u*0.45,u*0.5); g.lineTo(-u*0.45,u*0.5); g.closePath(); g.fill();
      g.fillStyle='#16091f'; _circle(g,-u*0.32,-u*0.1,u*0.22); g.fill(); _circle(g,u*0.32,-u*0.1,u*0.22); g.fill(); break;
    case 'clock': set('#9fb4ff'); _circle(g,0,0,u*0.9); g.fill(); g.strokeStyle='#16091f'; g.lineWidth=s*0.08; g.beginPath(); g.moveTo(0,0); g.lineTo(0,-u*0.5); g.moveTo(0,0); g.lineTo(u*0.4,u*0.1); g.stroke(); break;
    case 'star': set('#ffd23f'); g.beginPath(); for(let i=0;i<10;i++){const a=i/10*6.283-1.57,r=(i%2?u*0.4:u*0.95); g[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);} g.closePath(); g.fill(); break;
    case 'boost': set('#ff5eb8'); g.beginPath(); g.moveTo(-u*0.1,-u*0.9); g.lineTo(-u*0.55,u*0.15); g.lineTo(-u*0.05,u*0.15); g.lineTo(-u*0.2,u*0.9); g.lineTo(u*0.6,-u*0.2); g.lineTo(u*0.05,-u*0.2); g.closePath(); g.fill(); break;
    case 'surv': set('#5dff8f'); _circle(g,0,-u*0.45,u*0.32); g.fill(); g.beginPath(); g.moveTo(-u*0.5,u*0.85); g.quadraticCurveTo(0,-u*0.1,u*0.5,u*0.85); g.closePath(); g.fill(); break;
    case 'mall': set('#cfd6e6'); rr(g,-u*0.85,-u*0.2,u*1.7,u*1.0,2); g.fill(); g.fillStyle='#ff2e88'; g.beginPath(); g.moveTo(-u*0.95,-u*0.2); g.lineTo(0,-u*0.85); g.lineTo(u*0.95,-u*0.2); g.closePath(); g.fill(); break;
    case 'trader': set('#ffce5a'); rr(g,-u*0.8,-u*0.1,u*1.6,u*0.7,2); g.fill(); g.fillStyle='#ff3b5c'; for(let i=0;i<4;i++){ rr(g,-u*0.8+i*u*0.4,-u*0.45,u*0.4,u*0.35,1); g.fillStyle=i%2?'#fff':'#ff3b5c'; g.fill(); } break;
    case 'saboteur': set('#ff5e9e'); g.lineWidth=s*0.16; g.strokeStyle='#ff5e9e'; g.beginPath(); g.moveTo(-u*0.6,u*0.6); g.lineTo(u*0.3,-u*0.3); g.stroke(); _circle(g,u*0.45,-u*0.45,u*0.3); g.stroke(); break;
    case 'frost': set('#7ce6ff'); g.lineWidth=s*0.1; g.strokeStyle='#7ce6ff'; for(let i=0;i<6;i++){ g.save(); g.rotate(i*Math.PI/3); g.beginPath(); g.moveTo(0,0); g.lineTo(0,-u*0.9); g.moveTo(0,-u*0.5); g.lineTo(u*0.22,-u*0.68); g.moveTo(0,-u*0.5); g.lineTo(-u*0.22,-u*0.68); g.stroke(); g.restore(); } break;
    case 'fire': set('#ff8a3c'); g.beginPath(); g.moveTo(0,-u*0.95); g.quadraticCurveTo(u*0.75,-u*0.1,u*0.32,u*0.55); g.quadraticCurveTo(u*0.4,u*0.0,0,u*0.2); g.quadraticCurveTo(-u*0.4,u*0.0,-u*0.32,u*0.55); g.quadraticCurveTo(-u*0.75,-u*0.1,0,-u*0.95); g.closePath(); g.fill();
      g.fillStyle='#ffd23f'; g.beginPath(); g.moveTo(0,-u*0.4); g.quadraticCurveTo(u*0.3,u*0.0,u*0.12,u*0.5); g.quadraticCurveTo(-u*0.12,u*0.3,-u*0.12,u*0.5); g.quadraticCurveTo(-u*0.3,u*0.0,0,-u*0.4); g.fill(); break;
    case 'bounce': set('#b6ff3b'); g.lineWidth=s*0.1; g.strokeStyle='#b6ff3b'; g.beginPath(); g.arc(0,0,u*0.7,-2.2,1.0); g.stroke();
      g.beginPath(); g.moveTo(u*0.55,-u*0.55); g.lineTo(u*0.72,-u*0.2); g.lineTo(u*0.3,-u*0.32); g.closePath(); g.fill();
      g.fillStyle='#b6ff3b'; _circle(g,-u*0.55,u*0.4,u*0.16); g.fill(); _circle(g,u*0.5,u*0.5,u*0.14); g.fill(); break;
    case 'aura': set('#9bff5a'); g.lineWidth=s*0.09; g.strokeStyle='rgba(155,255,90,.9)'; g.beginPath(); g.arc(0,0,u*0.9,0,7); g.stroke();
      g.strokeStyle='rgba(155,255,90,.6)'; g.beginPath(); g.arc(0,0,u*0.6,0,7); g.stroke(); g.fillStyle='#9bff5a'; _circle(g,0,0,u*0.26); g.fill(); break;
    case 'drone': set('#cdd6e6'); g.lineWidth=s*0.1; g.strokeStyle='#9fb0d6'; g.beginPath(); g.moveTo(-u*0.85,-u*0.5); g.lineTo(u*0.85,-u*0.5); g.stroke();
      rr(g,-u*0.45,-u*0.25,u*0.9,u*0.6,s*0.08); g.fill(); g.fillStyle='#22e0ff'; _circle(g,0,u*0.05,u*0.18); g.fill(); break;
    default: set('#b39ad4'); g.font='bold '+(s*0.9)+'px Rajdhani'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('?',0,s*0.05);
  }
  g.restore();
}

// cached data-URL for DOM <img> use
const _iconCache={};
function iconURL(id, px){
  px=px||44; const key=id+'@'+px;
  if(_iconCache[key]) return _iconCache[key];
  try{
    const c=document.createElement('canvas'); const r=2; c.width=px*r; c.height=px*r;
    const g=c.getContext('2d'); g.scale(r,r);
    drawIcon(g, id, px/2, px/2, px*0.84);
    const url=c.toDataURL(); _iconCache[key]=url; return url;
  }catch(e){ return ''; }
}
function iconImg(id, px, cls){ px=px||40; return '<img class="'+(cls||'ui-ico')+'" style="width:'+px+'px;height:'+px+'px" src="'+iconURL(id,px)+'" alt="">'; }

/* ---------------------------------------------------------------------------
   13. RENDER
--------------------------------------------------------------------------- */
function render(){
  ctx.save();
  ctx.scale(scale*dpr, scale*dpr);
  // screenshake
  let sx=0,sy=0;
  if(Game.shake>0){ sx=(Math.random()-0.5)*Game.shake; sy=(Math.random()-0.5)*Game.shake; }
  ctx.translate(sx,sy);

  // neon mall floor
  drawBackground();

  // blood stains on the floor (fade out)
  for(const dc of Game.decals){
    ctx.globalAlpha=Math.min(0.5, dc.life/5*0.5);
    ctx.fillStyle='#4a0d18'; ctx.beginPath(); ctx.ellipse(dc.x,dc.y,dc.r,dc.r*0.55,dc.rot,0,7); ctx.fill();
    ctx.fillStyle='#6e1322'; ctx.beginPath(); ctx.ellipse(dc.x,dc.y,dc.r*0.55,dc.r*0.32,dc.rot,0,7); ctx.fill();
  }
  ctx.globalAlpha=1;

  // mall atrium (center) — tier by store count
  drawMall();

  // plots
  for(const p of Game.plots) drawPlot(p);
  drawBuildBeacon();

  // gems (acid lime, with glow)
  for(const g of Game.gems){
    ctx.fillStyle='rgba(182,255,59,.25)'; ctx.beginPath(); ctx.arc(g.x,g.y,9,0,7); ctx.fill();
    ctx.fillStyle='#d6ff7a'; ctx.beginPath(); ctx.arc(g.x,g.y,4,0,7); ctx.fill();
  }

  // trader stall
  if(Game.trader) drawTrader();

  // recruited survivors (allies) + arriving survivors
  for(const al of Game.allies) drawSurvivor(al, Game.time*2, false);
  for(const a of Game.arrivals) drawSurvivor(a, Game.time*6, true);

  // turrets (Security store)
  for(const t of Game.turrets){
    ctx.fillStyle='#33405f'; roundRect(t.x-9,t.y-9,18,18,3); ctx.fill();
    ctx.fillStyle='#9fb0ff'; roundRect(t.x-6,t.y-6,12,12,2); ctx.fill();
    ctx.fillStyle='#33405f'; ctx.fillRect(t.x-2,t.y-14,4,10);
  }

  // death animations (squashing corpses) — under living zombies
  for(const d of Game.deaths){
    const k=d.t/d.life, a=Math.max(0,1-k);
    ctx.globalAlpha=a*0.9;
    ctx.fillStyle=d.color;
    ctx.beginPath(); ctx.ellipse(d.x, d.y+d.r*0.45*k, d.r*(0.85+1.25*k), d.r*(0.8-0.62*k), 0,0,7); ctx.fill();
    ctx.fillStyle='rgba(80,12,22,'+(a*0.55)+')';
    ctx.beginPath(); ctx.ellipse(d.x, d.y+d.r*0.45*k, d.r*(0.5+0.95*k), d.r*(0.45-0.32*k), 0,0,7); ctx.fill();
    ctx.globalAlpha=1;
  }

  // toxic aura ring (under zombies, on the floor)
  if(Game.player && Game.stats && Game.stats.aura>0){
    const rad=70+Game.stats.aura*22, pl=Game.player, pr=0.12+0.05*Math.sin(Game.time*5);
    ctx.fillStyle='rgba(150,255,90,'+pr+')'; ctx.beginPath(); ctx.arc(pl.x,pl.y,rad,0,7); ctx.fill();
    ctx.strokeStyle='rgba(150,255,90,.4)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(pl.x,pl.y,rad,0,7); ctx.stroke();
  }

  // boss telegraphs (on the floor, under zombies)
  for(const z of Game.zombies){
    if(!z.boss) continue;
    if(z.bstate==='windup' && z.teleType==='charge'){ // charge danger lane
      const a=z.teleAng, blink=0.3+0.4*Math.abs(Math.sin(Game.time*16));
      ctx.save(); ctx.translate(z.x,z.y); ctx.rotate(a);
      ctx.fillStyle='rgba(255,60,90,'+blink+')'; roundRect(0,-14,300,28,6); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(290,-22); ctx.lineTo(320,0); ctx.lineTo(290,22); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if(z.bstate==='slamwind'){ // expanding danger circle
      const k=1-(z.btimer/0.6), blink=0.25+0.45*Math.abs(Math.sin(Game.time*16));
      ctx.strokeStyle='rgba(255,60,90,'+blink+')'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(z.x,z.y,40+k*150,0,7); ctx.stroke();
    }
  }
  // boss shockwaves
  for(const sh of Game.shocks){
    const a=Math.max(0,sh.life/0.55);
    ctx.strokeStyle='rgba(255,90,120,'+(a*0.9)+')'; ctx.lineWidth=10;
    ctx.beginPath(); ctx.arc(sh.x,sh.y,sh.r,0,7); ctx.stroke();
    ctx.strokeStyle='rgba(255,210,80,'+(a*0.6)+')'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(sh.x,sh.y,sh.r,0,7); ctx.stroke();
  }

  // zombies
  for(const z of Game.zombies) drawZombie(z);

  // spits
  for(const sp of Game.spits){ ctx.fillStyle='#b388ff'; ctx.beginPath(); ctx.arc(sp.x,sp.y,6,0,7); ctx.fill(); }

  // bullets (cyan tracer + halo)
  for(const b of Game.bullets){
    ctx.fillStyle='rgba(34,224,255,.30)'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r+4,0,7); ctx.fill();
    ctx.fillStyle='#d6f9ff'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.fill();
  }

  // player
  drawPlayer();

  // combat drones
  for(const dr of Game.drones){
    if(dr.x==null) continue;
    ctx.save(); ctx.translate(dr.x,dr.y);
    ctx.fillStyle='rgba(34,224,255,.25)'; ctx.beginPath(); ctx.arc(0,0,9,0,7); ctx.fill();
    ctx.fillStyle='#cdd6e6'; roundRect(-6,-5,12,10,3); ctx.fill();
    ctx.fillStyle='#22e0ff'; ctx.beginPath(); ctx.arc(0,0,2.6,0,7); ctx.fill();
    ctx.restore();
  }

  // particles
  ctx.globalCompositeOperation='lighter';
  for(const pa of Game.particles){ ctx.globalAlpha=Math.max(0,pa.life*2); ctx.fillStyle=pa.color; ctx.beginPath(); ctx.arc(pa.x,pa.y,pa.r*1.6,0,7); ctx.fill(); }
  ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;

  // floating texts (with outline for readability)
  ctx.textAlign='center'; ctx.lineJoin='round';
  for(const ft of Game.texts){ ctx.globalAlpha=Math.max(0,ft.life*1.4); ctx.font='bold '+ft.size+'px Rajdhani';
    ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.strokeText(ft.txt,ft.x,ft.y);
    ctx.fillStyle=ft.color; ctx.fillText(ft.txt,ft.x,ft.y); }
  ctx.globalAlpha=1;

  // boss health bar (top center)
  let boss=null; for(const z of Game.zombies){ if(z.boss){ boss=z; break; } }
  if(boss){
    const bw=440, bx=CX-bw/2, by=78, frac=Math.max(0,boss.hp/boss.maxHp);
    ctx.fillStyle='rgba(10,4,18,.8)'; roundRect(bx-4,by-4,bw+8,22,6); ctx.fill();
    ctx.fillStyle='#3a0f1a'; roundRect(bx,by,bw,14,4); ctx.fill();
    ctx.fillStyle = boss.hp<boss.maxHp*0.5 ? '#ff3b5c' : '#ff5e7a';
    roundRect(bx,by,bw*frac,14,4); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 13px Bungee'; ctx.textAlign='center';
    ctx.fillText('THE MALL COP', CX, by-8);
  }

  ctx.restore();
}

function drawBackground(){
  // deep purple gradient base
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#221036'); g.addColorStop(0.6,'#160b25'); g.addColorStop(1,'#0c0615');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // polished mall floor: big tiles + subtle checker
  const T=96;
  for(let gy=0;gy*T<H;gy++) for(let gx=0;gx*T<W;gx++){
    if((gx+gy)&1){ ctx.fillStyle='rgba(255,255,255,.013)'; ctx.fillRect(gx*T,gy*T,T,T); }
  }
  ctx.lineWidth=1;
  ctx.strokeStyle='rgba(255,46,136,.05)';
  for(let x=0;x<=W;x+=T){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<=H;y+=T){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.strokeStyle='rgba(34,224,255,.035)';
  for(let x=T/2;x<=W;x+=T){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  // soft light pooling under the mall atrium
  const rg=ctx.createRadialGradient(CX,CY,40,CX,CY,500);
  rg.addColorStop(0,'rgba(255,90,170,.14)'); rg.addColorStop(0.5,'rgba(124,40,160,.06)'); rg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
}

function drawMall(){
  const built = Game.plots.filter(p=>p.store).length;
  const tier = mallTierOf(built);
  const glow=['#5a3a7a','#a24adf','#22e0ff','#ffc23c'][tier];
  const sign=['#9a86b9','#c98aff','#22e0ff','#ffc23c'][tier];
  const x=CX-120, y=CY-82, w=240, h=164;
  ctx.save();
  ctx.textAlign='center';
  // ground shadow
  ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(CX,y+h+4,128,18,0,0,7); ctx.fill();
  // building body (gradient)
  const bg=ctx.createLinearGradient(0,y+16,0,y+h);
  bg.addColorStop(0,'#3a2550'); bg.addColorStop(1,'#221338');
  ctx.shadowColor=glow; ctx.shadowBlur=18+tier*6;
  ctx.fillStyle=bg; roundRect(x,y+16,w,h-16,14); ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle=glow; ctx.lineWidth=2; roundRect(x,y+16,w,h-16,14); ctx.stroke();
  // lit storefront windows (more lights = higher tier)
  const cols=6, cw=(w-36)/cols;
  for(let r=0;r<2;r++) for(let c=0;c<cols;c++){
    const wx=x+18+c*cw, wy=y+30+r*26;
    const lit=(tier>0)&&((c+r)%(tier>=2?1:2)===0);
    ctx.fillStyle= lit ? (tier>=3?'rgba(255,194,60,.9)':'rgba(34,224,255,.8)') : 'rgba(120,140,200,.16)';
    roundRect(wx,wy,cw-8,15,3); ctx.fill();
  }
  // entrance + awning
  ctx.fillStyle=glow; ctx.globalAlpha=.45; roundRect(x+6,y+h-42,w-12,7,3); ctx.fill(); ctx.globalAlpha=1;
  ctx.fillStyle='#120a1e'; roundRect(CX-26,y+h-32,52,32,4); ctx.fill();
  ctx.strokeStyle=sign; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(CX,y+h-32); ctx.lineTo(CX,y+h); ctx.stroke();
  // rooftop neon sign board
  ctx.fillStyle='#160a24'; roundRect(CX-72,y-8,144,32,7); ctx.fill();
  ctx.strokeStyle=sign; ctx.lineWidth=2; ctx.shadowColor=sign; ctx.shadowBlur=tier>=1?16:5;
  roundRect(CX-72,y-8,144,32,7); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='20px Bungee'; ctx.textBaseline='middle';
  ctx.fillText('MALL',CX,y+9); ctx.shadowBlur=0; ctx.textBaseline='alphabetic';
  // tier label
  ctx.fillStyle=sign; ctx.font='600 11px Rajdhani';
  ctx.fillText([t('tierAbandoned'),t('tierOperational'),t('tierFortified'),t('tierMega')][tier],CX,y+h-7);
  ctx.restore();
}

const STORE_HUE={ cafe:'#c98a5a', gun:'#cdd6e6', pharma:'#ff5e7a', rest:'#ffce5a', gym:'#9fb0d6', market:'#5dd6ff', security:'#7c9cff', elec:'#ffd23f', sports:'#ff7aa0', armor:'#b6ff3b', jewel:'#5dffe0', heli:'#bcd0e6' };

function drawPlot(p){
  if(p.store){
    const def=STORES.find(s=>s.id===p.store);
    const acc=STORE_HUE[def.id]||'#a24adf';
    const tg = p.lvl>=4?'#ffc23c' : p.lvl>=2?'#22e0ff' : acc;
    const x=p.x-32, y=p.y-30, w=64, h=64;
    ctx.save(); ctx.textAlign='center';
    // ground shadow
    ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x,p.y+30,29,6,0,0,7); ctx.fill();
    // shop body
    const bg=ctx.createLinearGradient(0,y,0,y+h); bg.addColorStop(0,'#33204d'); bg.addColorStop(1,'#211438');
    ctx.shadowColor=tg; ctx.shadowBlur=9; ctx.fillStyle=bg; roundRect(x,y+8,w,h-8,9); ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle=tg; ctx.lineWidth=1.5; roundRect(x,y+8,w,h-8,9); ctx.stroke();
    // glass front
    ctx.fillStyle='rgba(130,170,230,.10)'; roundRect(x+6,y+24,w-12,h-34,5); ctx.fill();
    // sign board + striped awning
    ctx.fillStyle=acc; roundRect(x+3,y-2,w-6,13,4); ctx.fill();
    for(let i=0;i<6;i++){ ctx.fillStyle=i%2?'#ffffff':acc; ctx.globalAlpha=.9; roundRect(x+4+i*((w-8)/6),y+11,(w-8)/6,5,1); ctx.fill(); }
    ctx.globalAlpha=1;
    // store icon
    drawIcon(ctx, def.ico, p.x, p.y, 30);
    // level pips
    for(let i=0;i<5;i++){ ctx.fillStyle=i<p.lvl?tg:'#3a2a52'; ctx.beginPath(); ctx.arc(p.x-18+i*9,p.y+24,2.4,0,7); ctx.fill(); }
    if(p.disabledT>0){
      ctx.fillStyle='rgba(255,40,60,'+(0.25+0.15*Math.sin(Game.time*10))+')'; roundRect(x,y+8,w,h-8,9); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='bold 18px Rajdhani'; ctx.textBaseline='middle'; ctx.fillText('!',p.x,p.y-16); ctx.textBaseline='alphabetic';
    }
    ctx.restore();
  } else {
    // empty plot — construction site marker
    const pulse=0.4+0.35*Math.sin(Game.time*4);
    ctx.save();
    ctx.fillStyle='rgba(34,224,255,.05)'; roundRect(p.x-28,p.y-28,56,56,9); ctx.fill();
    ctx.strokeStyle='rgba(255,194,60,'+pulse+')'; ctx.lineWidth=2.5; ctx.setLineDash([7,6]);
    roundRect(p.x-28,p.y-28,56,56,9); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='rgba(34,224,255,'+(0.55+pulse*0.45)+')'; ctx.font='bold 24px Rajdhani'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('+',p.x,p.y); ctx.textBaseline='alphabetic';
    ctx.restore();
  }
}

// Generic billboard humanoid (legs, body, arms, head) with walk bob.
// opt: {skin, cloth, outline, s(scale), arms('down'|'fwd'), hunch}
function drawPerson(x, y, phase, opt){
  const s = opt.s||1;
  const bob = Math.sin(phase)*1.6*s;
  const legSwing = Math.sin(phase)*3.2*s;
  const hunch = opt.hunch||0;
  ctx.save();
  ctx.translate(x, y+bob);
  ctx.lineCap='round'; ctx.lineJoin='round';
  // ground shadow
  ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0,13*s,9*s,3.4*s,0,0,7); ctx.fill();
  // legs
  ctx.strokeStyle=opt.outline; ctx.lineWidth=3.4*s;
  ctx.beginPath(); ctx.moveTo(-3*s,5*s); ctx.lineTo(-3*s+legSwing,13*s); ctx.moveTo(3*s,5*s); ctx.lineTo(3*s-legSwing,13*s); ctx.stroke();
  // back arms (darker)
  ctx.strokeStyle=shade(opt.cloth,-28); ctx.lineWidth=3.6*s;
  const aw=Math.cos(phase)*2.2*s;
  if(opt.arms==='fwd'){
    ctx.beginPath(); ctx.moveTo(-6*s,(-2+hunch)*s); ctx.lineTo(-10*s,(5+hunch)*s+aw); ctx.moveTo(6*s,(-2+hunch)*s); ctx.lineTo(10*s,(5+hunch)*s-aw); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-6*s,-2*s); ctx.lineTo(-8.5*s,5*s+aw); ctx.moveTo(6*s,-2*s); ctx.lineTo(8.5*s,5*s-aw); ctx.stroke();
  }
  // body with vertical gradient
  const bgd=ctx.createLinearGradient(0,(-6+hunch)*s,0,6*s);
  bgd.addColorStop(0,shade(opt.cloth,28)); bgd.addColorStop(1,opt.cloth);
  ctx.fillStyle=bgd; ctx.strokeStyle=opt.outline; ctx.lineWidth=2*s;
  roundRect(-7*s,(-6+hunch)*s,14*s,12*s,4*s); ctx.fill(); ctx.stroke();
  // chest rim light
  ctx.fillStyle='rgba(255,255,255,.16)'; roundRect(-5*s,(-5+hunch)*s,3.5*s,9*s,1.6*s); ctx.fill();
  // head
  ctx.fillStyle=opt.skin; ctx.strokeStyle=opt.outline; ctx.lineWidth=2*s;
  ctx.beginPath(); ctx.arc(0,(-12+hunch)*s,6*s,0,7); ctx.fill(); ctx.stroke();
  // hair cap
  ctx.fillStyle=opt.hair||'#33240f'; ctx.beginPath(); ctx.arc(0,(-13+hunch)*s,6*s,Math.PI*1.04,Math.PI*1.96); ctx.fill();
  // head highlight
  ctx.fillStyle='rgba(255,255,255,.28)'; ctx.beginPath(); ctx.arc(-2.2*s,(-12.5+hunch)*s,1.5*s,0,7); ctx.fill();
  ctx.restore();
}

// Big "BUILD HERE" callout over the nearest empty plot until the first store exists.
function drawBuildBeacon(){
  if(Game.mallTier>0) return;                 // already built something
  const p=Game.player; if(!p) return;
  let best=null,bd=1e9;
  for(const pl of Game.plots){ if(pl.store) continue; const d=dist(pl.x,pl.y,p.x,p.y); if(d<bd){bd=d;best=pl;} }
  if(!best) return;
  const bob=Math.sin(Game.time*5)*5;
  // glowing ring
  ctx.save();
  ctx.strokeStyle='rgba(255,194,60,'+(0.5+0.4*Math.sin(Game.time*5))+')'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.arc(best.x,best.y,40+Math.sin(Game.time*5)*4,0,7); ctx.stroke();
  // bouncing arrow + label above the plot
  ctx.fillStyle='#ffc23c'; ctx.font='bold 26px Rajdhani'; ctx.textAlign='center';
  ctx.fillText('▼', best.x, best.y-44+bob);
  ctx.fillStyle='#fff'; ctx.font='800 18px Bungee';
  ctx.shadowColor='#ff2e88'; ctx.shadowBlur=12;
  ctx.fillText(t('buildHint'), best.x, best.y-60+bob);
  ctx.restore();
}

function drawZombie(z){
  const flash = z.hitFlash>0;
  const s = z.r/13;
  const phase = Game.time*(2.2 + z.spd*0.02) + (z.wob||0);
  const body = flash ? '#ffffff' : z.color;
  const outline = flash ? '#ffffff' : shade(z.color,-50);
  ctx.save();
  ctx.translate(z.x, z.y + Math.sin(phase)*1.5*s);
  // shadow
  ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0,z.r*0.95,z.r*0.8,z.r*0.3,0,0,7); ctx.fill();
  // legs
  const legSwing=Math.sin(phase)*3*s;
  ctx.strokeStyle=outline; ctx.lineWidth=3.2*s; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-3*s,z.r*0.35); ctx.lineTo(-3*s+legSwing,z.r*0.95); ctx.moveTo(3*s,z.r*0.35); ctx.lineTo(3*s-legSwing,z.r*0.95); ctx.stroke();
  // reaching arms (behind body)
  const armSwing=Math.cos(phase)*2*s;
  ctx.strokeStyle = flash ? '#fff' : shade(z.color,-14); ctx.lineWidth=3.4*s;
  ctx.beginPath();
  ctx.moveTo(-z.r*0.5,-z.r*0.1); ctx.lineTo(-z.r*0.95, z.r*0.25+armSwing);
  ctx.moveTo(z.r*0.5,-z.r*0.1);  ctx.lineTo(z.r*0.95, z.r*0.25-armSwing);
  ctx.stroke();
  // body
  ctx.fillStyle=body; ctx.strokeStyle=outline; ctx.lineWidth=2*s;
  roundRect(-z.r*0.55, -z.r*0.35, z.r*1.1, z.r*0.85, 3*s); ctx.fill(); ctx.stroke();
  // depth: darker lower torso + top highlight
  if(!flash){ ctx.fillStyle=shade(z.color,-30); roundRect(-z.r*0.55, z.r*0.18, z.r*1.1, z.r*0.32, 3*s); ctx.fill(); }
  ctx.fillStyle='rgba(255,255,255,.12)'; roundRect(-z.r*0.5,-z.r*0.3,z.r*1.0,z.r*0.16,2*s); ctx.fill();
  // head
  ctx.fillStyle=body; ctx.strokeStyle=outline; ctx.lineWidth=2*s;
  ctx.beginPath(); ctx.arc(0,-z.r*0.75, z.r*0.5,0,7); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(-z.r*0.2,-z.r*0.88,z.r*0.12,0,7); ctx.fill();
  // mouth
  ctx.fillStyle='#350a10'; ctx.beginPath(); ctx.ellipse(0,-z.r*0.56,z.r*0.17,z.r*0.1,0,0,7); ctx.fill();
  // glowing eyes + glints
  ctx.fillStyle = flash ? '#911' : '#ff3b3b';
  ctx.beginPath(); ctx.arc(-z.r*0.18,-z.r*0.82,z.r*0.12,0,7); ctx.arc(z.r*0.18,-z.r*0.82,z.r*0.12,0,7); ctx.fill();
  ctx.fillStyle='rgba(255,210,210,.9)';
  ctx.beginPath(); ctx.arc(-z.r*0.21,-z.r*0.85,z.r*0.045,0,7); ctx.arc(z.r*0.15,-z.r*0.85,z.r*0.045,0,7); ctx.fill();
  // ---- per-type close-up flavor ----
  if(z.type==='brute'){ // heavy angry brow + scar
    ctx.strokeStyle=outline; ctx.lineWidth=2.2*s;
    ctx.beginPath(); ctx.moveTo(-z.r*0.34,-z.r*0.97); ctx.lineTo(-z.r*0.04,-z.r*0.86); ctx.moveTo(z.r*0.34,-z.r*0.97); ctx.lineTo(z.r*0.04,-z.r*0.86); ctx.stroke();
    ctx.strokeStyle=shade(z.color,-40); ctx.lineWidth=1.6*s; ctx.beginPath(); ctx.moveTo(-z.r*0.4,-z.r*0.2); ctx.lineTo(-z.r*0.15,z.r*0.1); ctx.stroke();
  }
  if(z.type==='runner'){ // motion streaks behind
    ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.lineWidth=2*s;
    ctx.beginPath(); for(let i=0;i<3;i++){ const yy=-z.r*0.2+i*z.r*0.32; ctx.moveTo(-z.r*1.25,yy); ctx.lineTo(-z.r*0.65,yy); } ctx.stroke();
  }
  if(z.type==='spitter'){ // swollen acid gland + drip
    ctx.fillStyle='#6a2f9c'; ctx.beginPath(); ctx.arc(0,-z.r*0.42,z.r*0.22,0,7); ctx.fill();
    ctx.fillStyle='rgba(150,255,80,.85)'; ctx.beginPath(); ctx.arc(0,-z.r*0.42,z.r*0.1,0,7); ctx.fill();
    ctx.fillStyle='rgba(150,255,80,.7)'; ctx.beginPath(); ctx.ellipse(0,-z.r*0.18,z.r*0.07,z.r*0.14,0,0,7); ctx.fill();
  }
  if(z.type==='bloater'){ // pulsing toxic aura + glowing cracks
    ctx.fillStyle='rgba(180,255,90,'+(0.18+0.1*Math.sin(Game.time*4))+')';
    ctx.beginPath(); ctx.arc(0,z.r*0.0,z.r*0.85+Math.sin(Game.time*4)*2,0,7); ctx.fill();
    ctx.strokeStyle='rgba(190,255,110,.7)'; ctx.lineWidth=1.6*s;
    ctx.beginPath(); ctx.moveTo(-z.r*0.25,-z.r*0.1); ctx.lineTo(-z.r*0.05,z.r*0.08); ctx.lineTo(-z.r*0.18,z.r*0.28); ctx.stroke();
  }
  if(z.saboteur||z.sabotaged){ drawIcon(ctx, 'saboteur', 0, -z.r*1.35, 16); }
  if(z.boss){ // peaked cap with badge
    if(z.hp<z.maxHp*0.5){ ctx.fillStyle='rgba(255,40,60,'+(0.12+0.08*Math.sin(Game.time*9))+')'; ctx.beginPath(); ctx.arc(0,0,z.r*1.5,0,7); ctx.fill(); }
    ctx.fillStyle='#16306e'; roundRect(-z.r*0.58,-z.r*1.22,z.r*1.16,z.r*0.4,2*s); ctx.fill();
    ctx.fillStyle='#0e2350'; roundRect(-z.r*0.62,-z.r*0.86,z.r*1.24,z.r*0.12,2*s); ctx.fill();   // brim
    ctx.fillStyle='#ffcf3f'; ctx.beginPath(); ctx.arc(0,-z.r*1.02,z.r*0.13,0,7); ctx.fill();
  }
  ctx.restore();
  // hp bar
  if(z.hp<z.maxHp){
    const w=z.r*2, hpw=w*Math.max(0,z.hp/z.maxHp);
    ctx.fillStyle='#400'; ctx.fillRect(z.x-z.r,z.y-z.r-12,w,4);
    ctx.fillStyle=z.boss?'#ff4d5e':'#5dff8f'; ctx.fillRect(z.x-z.r,z.y-z.r-12,hpw,4);
  }
  if(z.boss){ drawIcon(ctx,'skull',z.x-46,z.y-z.r-16,14); ctx.fillStyle='#fff'; ctx.font='bold 13px Bungee'; ctx.textAlign='center'; ctx.fillText('THE MALL COP', z.x+8, z.y-z.r-12); }
}

function drawSurvivor(o, phase, isArrival){
  // infected subtle "tell": a brief sickly-green flicker now and then
  let cloth = isArrival ? '#3f6fd1' : '#4a78d6';
  if(o.infected){ const fl=0.5+0.5*Math.sin(Game.time*3 + (o.x*0.05)); if(fl>0.84) cloth='#7fae5a'; }
  drawPerson(o.x, o.y, phase, { skin:'#f0c39b', cloth, outline:'#15294f', s:1, arms:'down' });
  if(!isArrival){ // little rifle
    ctx.save(); ctx.translate(o.x,o.y-3); ctx.fillStyle='#1f1f1f'; ctx.fillRect(4,-1.5,13,3); ctx.restore();
  } else { // attention marker over arriving survivor
    ctx.fillStyle='#5dff8f'; ctx.font='bold 13px Rajdhani'; ctx.textAlign='center';
    ctx.fillText('!', o.x, o.y-22 + Math.sin(Game.time*6)*2);
  }
}

function drawTrader(){
  const tr=Game.trader; const bob=Math.sin(Game.time*3)*2;
  ctx.save(); ctx.translate(tr.x, tr.y+bob);
  // stall counter
  ctx.fillStyle='#6b4a2a'; ctx.strokeStyle='#3c2912'; ctx.lineWidth=2;
  roundRect(-24,-4,48,20,4); ctx.fill(); ctx.stroke();
  // striped awning
  for(let i=0;i<6;i++){ ctx.fillStyle = i%2? '#c0392b':'#f5f5f5'; ctx.beginPath();
    ctx.moveTo(-24+i*8,-4); ctx.lineTo(-24+(i+1)*8,-4); ctx.lineTo(-24+(i+1)*8-3,-12); ctx.lineTo(-24+i*8-3,-12); ctx.closePath(); ctx.fill(); }
  drawIcon(ctx, 'market', 0, 6, 16);
  // pulsing call-to-action
  const pulse=0.6+0.4*Math.sin(Game.time*5);
  ctx.fillStyle='rgba(124,230,255,'+pulse+')'; ctx.font='bold 11px Rajdhani'; ctx.textAlign='center';
  ctx.fillText(t('tradeCTA')+' · '+Math.ceil(tr.timer)+'s', 0, -18);
  ctx.restore();
}

function drawPlayer(){
  const p=Game.player;
  const hurt = p.hitFlash>0 && Math.floor(p.hitFlash*18)%2===0;
  // soft cyan aura so the hero always reads against the crowd
  ctx.fillStyle='rgba(34,224,255,.18)'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r+9,0,7); ctx.fill();
  drawPerson(p.x, p.y, p.walkT||0, { skin:'#f3c79c', cloth: hurt?'#ff7a9a':'#22e0ff', outline:'#063a47', s:1.15, arms:'down' });
  // weapon visibly upgrades: longer barrel with damage, DUAL-WIELD with extra projectiles
  const E = Game.buffs ? eff() : {proj:1,dmg:10};
  const dual = E.proj>=2;
  const len = 16 + Math.min(10, E.dmg*0.15);    // barrel grows with damage
  const flash = Game.time - (p.lastFire||-9) < 0.05;
  ctx.save(); ctx.translate(p.x, p.y-4); ctx.rotate(p.dir);
  const gun=(off)=>{ ctx.fillStyle='#2a2a2a'; ctx.fillRect(4,off-2.0,len,4.0); ctx.fillStyle='#444'; ctx.fillRect(0,off-3.2,9,6.4);
    if(flash){ ctx.fillStyle='rgba(255,220,120,.95)'; ctx.beginPath(); ctx.arc(len+6,off,5,0,7); ctx.fill(); } };
  if(dual){ gun(-5); gun(5); } else { gun(0); }
  ctx.restore();
}

function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

/* ---------------------------------------------------------------------------
   14. MAIN LOOP
--------------------------------------------------------------------------- */
function loop(ts){
  requestAnimationFrame(loop);
  if(!Game.last) Game.last=ts;
  let dt=(ts-Game.last)/1000; Game.last=ts;
  if(dt>0.05) dt=0.05; // clamp
  if(Game.attract && Game.state==='levelup'){ const row=document.getElementById('card-row'); const c=row&&row.children[0]; if(c&&c.onclick) c.onclick(); }
  if(Game.attract && Game.state==='gameover'){ startRun(); Game.attract=true; setupAttract(); }
  if(Game.state==='playing' && !Game.rotateBlock) update(dt);
  if(['playing','paused','levelup','build','gameover','ad','trader'].includes(Game.state)) render();
}

/* ---------------------------------------------------------------------------
   15. UI CONTROLLER (DOM overlays)
--------------------------------------------------------------------------- */
const $ = id=>document.getElementById(id);
const UI = {
  screens:['loading','menu','howto','meta','hud','build-menu','levelup','pause','gameover','trader'],
  show(id){ $(id).classList.remove('hidden'); },
  hide(id){ $(id).classList.add('hidden'); },
  hideAll(){ this.screens.forEach(s=>$(s).classList.add('hidden')); },

  refreshJoystick(){ if(isTouch) {/* shown on touch */} },

  refreshHUD(){
    if(Game.state==='loading'||Game.state==='menu') return;
    const s=Game.stats, e=eff();
    if(!s) return;
    $('hp-fill').style.width = Math.max(0,(s.hp/e.maxHp)*100)+'%';
    $('hp-text').textContent = Math.max(0,Math.ceil(s.hp))+'/'+Math.ceil(e.maxHp);
    $('cash-text').textContent = '$'+fmt(Math.floor(Game.cash));
    $('income-text').textContent = '(+$'+fmt(Math.round(Game.income))+'/s)';
    $('wave-text').textContent = Game.wave;
    $('time-text').textContent = fmtTime(Game.time);
    $('xp-fill').style.width = (Game.xp/Game.xpNext*100)+'%';
    $('lvl-text').textContent = t('lvl')+' '+Game.level;
    // fame
    const idx=fameTierIndex(), tDef=FAME_TIERS[idx], next=FAME_TIERS[idx+1];
    const ft=$('fame-tier');
    if(ft){ ft.textContent = tx(tDef.name); ft.style.color=tDef.color; }
    let pct=100; if(next){ pct=((Game.fame-tDef.min)/(next.min-tDef.min))*100; }
    if($('fame-fill')){ $('fame-fill').style.width=clamp(pct,0,100)+'%'; $('fame-fill').style.background=tDef.color; }
    if($('surv-text')) $('surv-text').textContent=Game.allies.length;
    const bl=$('boost-label');
    if(bl) bl.textContent = Game.boostTimer>0 ? t('boostActive',{s:Math.ceil(Game.boostTimer)}) : t('boost');
    $('btn-boost').disabled = Game.boostTimer>0;
  },

  showGameOver(secs, tokens){
    this.hideAll();
    const won = Game.wave>20;
    $('go-title').textContent = won? t('goWin') : t('goLose',{w:Game.wave});
    $('go-stats').innerHTML = t('goStats',{t:fmtTime(secs),k:Game.kills,s:Game.plots.filter(p=>p.store).length,b:Save.data.bestWave});
    $('go-tokens').textContent = '+'+tokens;
    // revive only available if not used & there's a body
    $('btn-revive').style.display = (Game.reviveUsed)?'none':'block';
    $('btn-double').dataset.done='';
    this.show('gameover');
    Save.data.tokens += tokens; Save.save();
    UI.updateTokens();
  },

  updateTokens(){ $('menu-tokens').textContent=fmt(Save.data.tokens); $('meta-tokens').textContent=fmt(Save.data.tokens); },

  buildMeta(){
    const grid=$('meta-grid'); grid.innerHTML='';
    META.forEach(m=>{
      const lvl=Save.metaLvl(m.id), maxed=lvl>=m.max, cost=m.cost(lvl);
      const card=document.createElement('div'); card.className='meta-card'+(maxed?' maxed':'');
      let pips=''; for(let i=0;i<m.max;i++) pips+=`<div class="pip ${i<lvl?'on':''}"></div>`;
      card.innerHTML=`<div class="mc-head">${iconImg(m.ico,30,'mc-ico')}<span class="mc-name">${tx(m.name)}</span></div>
        <div class="mc-desc">${tx(m.desc)}</div>
        <div class="mc-pips">${pips}</div>
        <button class="btn mc-buy">${maxed?t('max'):cost+' '+iconImg('token',16,'inl')}</button>`;
      const btn=card.querySelector('.mc-buy');
      if(!maxed){
        btn.disabled = Save.data.tokens<cost;
        btn.onclick=()=>{ if(Save.data.tokens>=cost){ Save.data.tokens-=cost; Save.data.meta[m.id]=lvl+1; Save.save(); UI.updateTokens(); UI.buildMeta(); Audio2.build(); } };
      }
      grid.appendChild(card);
    });
  },
};

function fmt(n){ if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1e3) return (n/1e3).toFixed(1)+'k'; return ''+n; }
function fmtTime(s){ const m=Math.floor(s/60), ss=Math.floor(s%60); return m+':'+(ss<10?'0':'')+ss; }

function showWaveBanner(txt){
  const el=$('wave-banner'); el.textContent=txt; el.classList.remove('hidden');
  el.style.animation='none'; void el.offsetWidth; el.style.animation='';
  el.classList.add('wave-banner');
  setTimeout(()=>el.classList.add('hidden'),2200);
}

/* ---------------------------------------------------------------------------
   16. BUILD MENU
--------------------------------------------------------------------------- */
function storeCost(def, plot){
  const cheaper = 1 - META[4].val(Save.metaLvl('cheaper'));
  if(plot.store){ // upgrade
    return Math.round(def.cost * Math.pow(1.6, plot.lvl) * cheaper);
  }
  return Math.round(def.cost * cheaper * (1 - (Game.buildDiscount||0)));
}

function openBuild(plot){
  Game.activePlot=plot;
  Game.state='build';
  resetJoystick();
  const list=$('build-list'); list.innerHTML='';
  $('build-title').textContent = plot.store ? t('upgradeTitle') : t('buildTitle');

  if(plot.store){
    const def=STORES.find(s=>s.id===plot.store);
    const cost=storeCost(def,plot);
    const maxed = plot.lvl>=5;
    const row=storeRow(def, maxed?t('max'):('$'+fmt(cost)), maxed?false:Game.cash>=cost,
      t('upgradeRow',{a:plot.lvl,b:plot.lvl+1,d:tx(def.desc),i:(def.income*Math.pow(1.5,plot.lvl)).toFixed(0)}));
    if(!maxed) row.onclick=()=>{ if(Game.cash>=cost){ Game.cash-=cost; plot.lvl++; afterBuild(def,plot); } };
    list.appendChild(row);
  } else {
    STORES.forEach(def=>{
      const cost=storeCost(def,plot);
      const afford=Game.cash>=cost;
      const row=storeRow(def, '$'+fmt(cost), afford, tx(def.desc)+' · +$'+def.income+t('perSec'));
      row.onclick=()=>{ if(Game.cash>=cost){ Game.cash-=cost; plot.store=def.id; plot.lvl=1; Game.buildDiscount=0; afterBuild(def,plot); } };
      list.appendChild(row);
    });
  }
  UI.show('build-menu');
}

function storeRow(def, costTxt, afford, desc){
  const row=document.createElement('div'); row.className='store-row'+(afford?'':' locked');
  row.innerHTML=`<div class="s-ico">${iconImg(def.ico,40)}</div>
    <div class="s-main"><div class="s-name">${tx(def.name)}</div><div class="s-desc">${desc}</div></div>
    <div class="s-cost ${afford?'':'cant'}">${costTxt}</div>`;
  return row;
}

function afterBuild(def, plot){
  Audio2.build(); Audio2.coin();
  Game.shake=Math.max(Game.shake,7);
  for(let i=0;i<26;i++) spawnParticle(plot.x,plot.y, Math.random()<0.5?'#36e0c8':'#ffc23c');
  // juicy growth feedback: store name + income popping out
  const incNow=(def.income*Math.pow(1.5,plot.lvl)).toFixed(0);
  addText(plot.x, plot.y-42, tx(def.name), '#36e0c8', 18);
  addText(plot.x, plot.y-22, '+$'+incNow+t('perSec'), '#b6ff3b', 16);
  // pharmacy heal burst
  if(def.id==='pharma'){ Game.stats.hp=Math.min(eff().maxHp, Game.stats.hp+8*plot.lvl); }
  if(Game.refugeOn) addFame(def.cost*0.06);
  // MALL GROWTH celebration — the core "I'm rebuilding a mall" payoff
  const built=Game.plots.filter(p=>p.store).length;
  const nt=mallTierOf(built);
  if(nt>Game.mallTier){ Game.mallTier=nt; showWaveBanner(t('mallUp')); Game.shake=Math.max(Game.shake,13); CG.happytime(); }
  // unlock deeper systems once the player is actively building
  if(!Game.refugeOn && built>=2) activateRefuge();
  recompute();
  // refresh menu (stay open for chained upgrades)
  openBuild(plot);
}

function closeBuild(){ UI.hide('build-menu'); if(Game.state==='build') Game.state='playing'; }

/* trader menu (opened by tapping the trader stall) */
function openTrader(){
  if(!Game.trader) return;
  Game.state='trader';
  resetJoystick();
  const list=$('trader-list'); list.innerHTML='';
  Game.trader.deals.forEach(d=>{
    const afford = Game.cash>=d.cost && !d.sold;
    const row=document.createElement('div'); row.className='store-row'+(afford?'':' locked');
    row.innerHTML=`<div class="s-ico">${iconImg(d.ico,40)}</div>
      <div class="s-main"><div class="s-name">${tx(d.name)}</div><div class="s-desc">${tx(d.desc)}</div></div>
      <div class="s-cost ${afford?'':'cant'}">${d.sold?t('sold'):'$'+fmt(d.cost)}</div>`;
    if(afford) row.onclick=()=>{ if(Game.cash>=d.cost && !d.sold){ Game.cash-=d.cost; d.sold=true; d.apply(); Audio2.coin(); openTrader(); } };
    list.appendChild(row);
  });
  UI.show('trader');
}
function closeTrader(){ UI.hide('trader'); if(Game.state==='trader') Game.state='playing'; }

/* ---------------------------------------------------------------------------
   17. LEVEL UP CARDS
--------------------------------------------------------------------------- */
function openLevelUp(){
  Game.state='levelup';
  resetJoystick();
  Audio2.levelup();
  drawCards();
  UI.show('levelup');
}
function drawCards(){
  const row=$('card-row'); row.innerHTML='';
  // pick 3 weighted (rares rarer; unlock-once rares only once)
  const s=Game.stats;
  const pool=CARD_POOL.filter(c=>{
    if(c.id==='shotgun' && s.shotgun) return false;
    if(c.id==='rocket' && s.explosive) return false;
    return true;
  });
  const chosen=[];
  const tmp=pool.slice();
  while(chosen.length<3 && tmp.length){
    // rare weight 0.3
    const weights=tmp.map(c=>c.rare?0.4:1);
    let total=weights.reduce((a,b)=>a+b,0), r=Math.random()*total, idx=0;
    for(let i=0;i<tmp.length;i++){ r-=weights[i]; if(r<=0){idx=i;break;} }
    chosen.push(tmp.splice(idx,1)[0]);
  }
  chosen.forEach(c=>{
    const el=document.createElement('div'); el.className='lcard'+(c.rare?' rare':'');
    el.innerHTML=`<div class="lc-ico">${iconImg(c.ico,52)}</div><div class="lc-name">${tx(c.name)}</div><div class="lc-desc">${tx(c.desc)}</div>`;
    el.onclick=()=>{
      c.apply(Game.stats);
      Game.stats.cardCounts[c.id]=(Game.stats.cardCounts[c.id]||0)+1;
      Audio2.build(); recompute(); checkSynergies();
      UI.hide('levelup'); Game.state='playing';
    };
    row.appendChild(el);
  });
}
// reroll the current hand (used by the rewarded-ad button)
function rerollCards(){ if(Game.state==='levelup') drawCards(); }
// award newly-completed synergies
function checkSynergies(){
  for(const sy of SYNERGIES){
    if(!Game.syn[sy.id] && sy.need(Game.stats)){
      Game.syn[sy.id]=true;
      if(sy.apply) sy.apply(Game.stats);
      showWaveBanner(t('synergy')+' '+tx(sy.name).toUpperCase());
      toast(t('synergy')+' '+tx(sy.name)+' — '+tx(sy.desc), '#ffd23f');
      Audio2.levelup(); CG.happytime();
    }
  }
  updateSynBar();
}
function updateSynBar(){
  const bar=$('syn-bar'); if(!bar) return;
  let html='';
  for(const sy of SYNERGIES){ if(Game.syn[sy.id]) html+='<span class="syn-chip">'+iconImg(sy.ico,16)+tx(sy.name)+'</span>'; }
  bar.innerHTML=html;
}

/* ---------------------------------------------------------------------------
   18. PAUSE
--------------------------------------------------------------------------- */
function pauseGame(){ if(Game.state!=='playing') return; Game.state='paused'; resetJoystick(); CG.gameplayStop(); UI.show('pause'); }
function resumeGame(){ if(Game.state!=='paused') return; UI.hide('pause'); Game.state='playing'; CG.gameplayStart(); }
window.addEventListener('blur', ()=>{ if(Game.state==='playing') pauseGame(); });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden && Game.state==='playing') pauseGame(); });
// iOS requires resuming the AudioContext on a user gesture after any interruption
['pointerdown','keydown','touchstart'].forEach(ev=>window.addEventListener(ev, ()=>Audio2.resume(), {passive:true}));

/* ---------------------------------------------------------------------------
   19. WIRE UP BUTTONS
--------------------------------------------------------------------------- */
// fill static [data-ico] placeholders with vector icons (once)
function fillIcons(){
  document.querySelectorAll('[data-ico]').forEach(el=>{
    if(el.dataset.filled) return;
    el.innerHTML = iconImg(el.dataset.ico, +(el.dataset.size||18));
    el.dataset.filled='1';
  });
}
// apply current language to all static [data-i18n] elements
function applyLang(){
  try{ document.documentElement.lang = LANG; }catch(e){}
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.innerHTML = t(el.dataset.i18n); });
  const lb=$('btn-lang'); if(lb) lb.textContent = LANG.toUpperCase();
  if(Game.stats) UI.refreshHUD();
}
function setLang(l){ LANG=l; Save.data.lang=l; Save.save(); applyLang(); }

function bindUI(){
  $('btn-play').onclick=()=>{ Audio2.resume(); startRun(); };
  $('btn-lang').onclick=()=>setLang(LANG==='es'?'en':'es');
  $('btn-meta').onclick=()=>{ UI.buildMeta(); UI.show('meta'); };
  $('btn-meta-close').onclick=()=>UI.hide('meta');
  $('btn-howto').onclick=()=>UI.show('howto');
  $('btn-howto-close').onclick=()=>UI.hide('howto');

  $('btn-mute').onclick=()=>{ const m=Audio2.toggleMute(); $('btn-mute').textContent=m?'🔇':'🔊'; };
  $('btn-pause-mute').onclick=()=>{ const m=Audio2.toggleMute(); $('pmute-ico').textContent=m?'🔇':'🔊'; };

  $('btn-build-close').onclick=closeBuild;
  $('btn-trader-close').onclick=closeTrader;
  $('btn-reroll').onclick=async()=>{ const ok=await CG.rewardedAd(); if(ok) rerollCards(); };
  $('btn-pause').onclick=pauseGame;
  $('btn-resume').onclick=resumeGame;
  $('btn-quit').onclick=async()=>{ CG.gameplayStop(); await CG.midgame(); UI.hideAll(); Game.state='menu'; UI.show('menu'); UI.updateTokens(); };

  $('btn-boost').onclick=async()=>{
    if(Game.boostTimer>0) return;
    const ok=await CG.rewardedAd();
    if(ok){ Game.boostTimer=60; recompute(); CG.happytime(); }
  };

  // game over
  $('btn-revive').onclick=async()=>{
    const ok=await CG.rewardedAd();
    if(ok){ Game.reviveUsed=true; reviveNow(); }
  };
  $('btn-double').onclick=async(e)=>{
    if($('btn-double').dataset.done) return;
    const ok=await CG.rewardedAd();
    if(ok){ Save.data.tokens += Game._tokens; Save.save(); UI.updateTokens();
      $('go-tokens').textContent='+'+(Game._tokens*2)+' (x2)';
      $('btn-double').dataset.done='1'; $('btn-double').disabled=true; CG.happytime(); }
  };
  $('btn-retry').onclick=async()=>{ await CG.midgame(); startRun(); };
  $('btn-menu').onclick=async()=>{ await CG.midgame(); UI.hideAll(); Game.state='menu'; UI.show('menu'); UI.updateTokens(); };
}

/* ---------------------------------------------------------------------------
   20. BOOT
--------------------------------------------------------------------------- */
async function boot(){
  Save.load();
  Audio2.init();
  // language: saved choice, else browser, else English
  LANG = Save.data.lang || (((navigator.language||navigator.userLanguage||'en').toLowerCase().indexOf('es')===0) ? 'es' : 'en');
  Save.data.lang = LANG;
  resize();
  bindUI();
  fillIcons();
  applyLang();
  if(Save.data.muted){ $('btn-mute').textContent='🔇'; const pm=$('pmute-ico'); if(pm) pm.textContent='🔇'; }
  isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints>0;

  // init SDK first (async), then bracket asset loading with loadingStart/Stop
  await CG.init();
  CG.loadingStart();

  // load progress bar while we (lightly) finish loading
  let prog=0;
  const fill=$('loadbar-fill');
  const iv=setInterval(()=>{ prog=Math.min(90,prog+8+Math.random()*12); fill.style.width=prog+'%'; },90);

  // ensure custom fonts are ready so first paint isn't a flash of fallback
  try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}

  clearInterval(iv); fill.style.width='100%';
  CG.loadingStop();

  setTimeout(()=>{
    UI.hideAll(); Game.state='menu'; UI.show('menu'); UI.updateTokens();
    // dev/testing hook: open index with #play to jump straight into a run
    if(location.hash.indexOf('play')>=0){ startRun();
      if(location.hash.indexOf('demo')>=0){ // prebuild for screenshots
        ['cafe','gun','market'].forEach((id,i)=>{ Game.plots[i].store=id; Game.plots[i].lvl=2; });
        Game.stats.projAdd=2; Game.cash=3000; Game.mallTier=2; Game.wave=8; recompute();
        ['shambler','runner','brute','spitter','bloater'].forEach((tp,i)=>{ spawnZombie(tp,false); const z=Game.zombies[Game.zombies.length-1]; z.x=CX-170+i*78; z.y=CY+150; z.hp=z.maxHp*0.7; });
        Object.assign(Game.stats.cardCounts,{cryo:1,fire:1,crit:1,critdmg:1}); Game.refugeOn=true; checkSynergies();
      }
      if(location.hash.indexOf('cards')>=0) openLevelUp();
      if(location.hash.indexOf('syn')>=0){ Game.stats.cardCounts.cryo=1; Game.stats.cardCounts.fire=1; Game.stats.slow=1; Game.stats.burn=1; checkSynergies(); openLevelUp(); }
      if(location.hash.indexOf('boss')>=0){ Game.wave=10; spawnZombie('brute',true); const b=Game.zombies[Game.zombies.length-1]; b.x=CX; b.y=CY-30; b.hp=b.maxHp*0.45; b.bstate='slamwind'; b.btimer=0.35; }
      if(location.hash.indexOf('attract')>=0){ Game.attract=true; setupAttract(); }
    }
  }, 350);

  requestAnimationFrame(loop);
}
boot();
