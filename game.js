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
  { id:'cafe',    name:'Cafetería',    ico:'☕', cost:20,   income:2, buff:null,                       desc:'Ingresos puros baratos.' },
  { id:'gun',     name:'Armería',      ico:'🔫', cost:40,   income:1, buff:{k:'dmg',   v:0.12},        desc:'+12% daño de arma.' },
  { id:'pharma',  name:'Farmacia',     ico:'💊', cost:80,   income:1, buff:{k:'heals', v:1},           desc:'Cura al construir + sana 1 HP/s.' },
  { id:'rest',    name:'Restaurante',  ico:'🍔', cost:120,  income:3, buff:{k:'regen', v:0.6},         desc:'+0.6 HP/s regeneración.' },
  { id:'gym',     name:'Gimnasio',     ico:'🏋️', cost:100,  income:1, buff:{k:'speed', v:0.08},        desc:'+8% velocidad.' },
  { id:'market',  name:'Supermercado', ico:'🛒', cost:200,  income:5, buff:{k:'cash',  v:0.06},        desc:'+6% ingresos por kill.' },
  { id:'security',name:'Seguridad',    ico:'🛡️', cost:250,  income:1, buff:{k:'turret',v:1},           desc:'Despliega una torreta automática.' },
  { id:'elec',    name:'Electrónica',  ico:'⚡', cost:180,  income:2, buff:{k:'rate',  v:0.10},        desc:'+10% cadencia de disparo.' },
  { id:'sports',  name:'Deportes',     ico:'🎯', cost:500,  income:2, buff:{k:'proj',  v:0.5},         desc:'+1 proyectil cada 2 niveles.' },
  { id:'armor',   name:'Outfitter',    ico:'🦺', cost:350,  income:2, buff:{k:'maxhp', v:15},          desc:'+15 vida máxima por nivel.' },
  { id:'jewel',   name:'Joyería',      ico:'💎', cost:400,  income:8, buff:{k:'xp',    v:0.05},         desc:'+5% XP, gran ingreso.' },
  { id:'heli',    name:'Helipuerto',   ico:'🚁', cost:1500, income:15,buff:{k:'airstrike',v:1},        desc:'Ataque aéreo cada 25s.' },
];

// Enemy archetypes (see GDD §8). Stats are multiplied by wave scaling at spawn.
const ENEMIES = {
  shambler:{ name:'Shambler', r:13, hpMul:1.0, spd:38,  dmg:1.0, color:'#7fae5a', bounty:1.0, fromWave:1 },
  runner:  { name:'Runner',   r:11, hpMul:0.7, spd:95,  dmg:0.8, color:'#caa54a', bounty:1.1, fromWave:3 },
  brute:   { name:'Brute',    r:22, hpMul:3.4, spd:30,  dmg:1.8, color:'#5a8f6a', bounty:2.6, fromWave:5 },
  spitter: { name:'Spitter',  r:13, hpMul:1.0, spd:34,  dmg:1.0, color:'#9b6ad6', bounty:1.5, fromWave:6, ranged:true },
  bloater: { name:'Bloater',  r:18, hpMul:2.0, spd:30,  dmg:1.4, color:'#88b04a', bounty:2.0, fromWave:8, explodes:true },
};

// Level-up cards (weapon + passive). Some are "rare".
const CARD_POOL = [
  { id:'dmg',    ico:'💢', name:'+Daño',        desc:'+20% daño',            apply:s=>s.dmgMult+=0.20 },
  { id:'rate',   ico:'🔥', name:'+Cadencia',    desc:'+15% disparo',         apply:s=>s.rateMult+=0.15 },
  { id:'proj',   ico:'🎯', name:'+Proyectil',   desc:'+1 bala',              apply:s=>s.projAdd+=1 },
  { id:'pierce', ico:'🏹', name:'+Perforación', desc:'Atraviesa +1',         apply:s=>s.pierce+=1 },
  { id:'speed',  ico:'👟', name:'+Velocidad',   desc:'+12% movimiento',      apply:s=>s.spdMult+=0.12 },
  { id:'maxhp',  ico:'❤️', name:'+Vida máx',    desc:'+25 vida y cura',      apply:s=>{s.maxHp+=25;s.hp+=25;} },
  { id:'regen',  ico:'➕', name:'+Regen',       desc:'+0.5 HP/s',            apply:s=>s.regen+=0.5 },
  { id:'magnet', ico:'🧲', name:'+Imán',        desc:'+40 recogida',         apply:s=>s.magnet+=40 },
  { id:'crit',   ico:'💥', name:'+Crítico',     desc:'+8% prob. crítico',    apply:s=>s.crit+=0.08 },
  { id:'range',  ico:'📡', name:'+Alcance',     desc:'+60 alcance',          apply:s=>s.range+=60 },
  // rare
  { id:'shotgun',ico:'🔫', name:'ESCOPETA',     desc:'Disparo en abanico',   rare:true, apply:s=>{s.shotgun=true;s.projAdd+=2;} },
  { id:'rocket', ico:'🚀', name:'COHETES',      desc:'Balas explosivas',     rare:true, apply:s=>{s.explosive=true;} },
  { id:'vamp',   ico:'🩸', name:'VAMPIRISMO',   desc:'Roba vida al matar',   rare:true, apply:s=>{s.lifesteal+=0.5;} },
];

// Meta upgrades (persistent, bought with tokens). cost grows per level.
const META = [
  { id:'startHp',   name:'Vida inicial',  desc:'+30 vida máx', max:5, cost:l=>40+l*40,  val:l=>l*30 },
  { id:'startCash', name:'Caja inicial',  desc:'+$120 al empezar', max:5, cost:l=>30+l*30, val:l=>l*120 },
  { id:'income',    name:'Ingresos',      desc:'+8% ingresos globales', max:5, cost:l=>50+l*50, val:l=>l*0.08 },
  { id:'damage',    name:'Potencia fuego',desc:'+10% daño inicial', max:5, cost:l=>50+l*45, val:l=>l*0.10 },
  { id:'cheaper',   name:'Construcción',  desc:'-6% coste tiendas', max:5, cost:l=>60+l*50, val:l=>l*0.06 },
  { id:'magnet',    name:'Imán',          desc:'+25 recogida', max:4, cost:l=>40+l*30, val:l=>l*25 },
  { id:'revive',    name:'Revivir gratis',desc:'1 revivir por partida', max:1, cost:()=>250, val:l=>l },
  { id:'pharmaStart',name:'Farmacia base',desc:'Empiezas con Farmacia', max:1, cost:()=>200, val:l=>l },
];

/* ---------------------------------------------------------------------------
   1. SAVE / META PERSISTENCE
--------------------------------------------------------------------------- */
const Save = {
  data:{ tokens:0, meta:{}, muted:false, bestWave:0 },
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
  sdk:null, ready:false,
  async init(){
    try{
      if(window.CrazyGames && window.CrazyGames.SDK){
        this.sdk = window.CrazyGames.SDK;
        await this.sdk.init();
        this.ready = true;
      }
    }catch(e){ this.ready=false; }
  },
  gameplayStart(){ try{ if(this.ready) this.sdk.game.gameplayStart(); }catch(e){} },
  gameplayStop(){ try{ if(this.ready) this.sdk.game.gameplayStop(); }catch(e){} },
  happytime(){ try{ if(this.ready) this.sdk.game.happytime(); }catch(e){} },
  // rewarded ad: resolves true if reward should be granted
  rewardedAd(){
    return new Promise(resolve=>{
      if(!this.ready){ resolve(true); return; }   // no SDK -> grant in dev/standalone
      try{
        Game.pauseForAd(true);
        this.sdk.ad.requestAd('rewarded',{
          adFinished:()=>{ Game.pauseForAd(false); resolve(true); },
          adError:()=>{ Game.pauseForAd(false); resolve(false); },
          adStarted:()=>{},
        });
      }catch(e){ Game.pauseForAd(false); resolve(false); }
    });
  },
};

/* ---------------------------------------------------------------------------
   3. AUDIO (tiny WebAudio synth, fully mutable)
--------------------------------------------------------------------------- */
const Audio2 = {
  ctx:null, muted:false,
  init(){ try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} this.muted = Save.data.muted; },
  resume(){ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },
  blip(freq,dur,type,vol){
    if(this.muted || !this.ctx) return;
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

function resize(){
  dpr = Math.min(window.devicePixelRatio||1, 2);
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
}
window.addEventListener('resize', resize);

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
  player:null, zombies:[], bullets:[], gems:[], coins:[], particles:[], texts:[], turrets:[], spits:[],
  plots:[], stats:null,
  cash:0, time:0, wave:1, waveTimer:0, kills:0, bossesKilled:0,
  spawnTimer:0, incomeTimer:0, airstrikeTimer:0,
  level:1, xp:0, xpNext:11,
  buffs:null, income:0,
  activePlot:null,
  boostTimer:0, reviveUsed:false, freeReviveAvail:false,
  comebackTimer:0,
  shake:0,

  pauseForAd(on){
    if(on){ this._prevState=this.state; this.state='ad'; CG.gameplayStop(); }
    else { this.state=this._prevState||'playing'; if(this.state==='playing') CG.gameplayStart(); }
  },
};

/* base player stats (modified by meta + cards) */
function freshStats(){
  const m=Save.data.meta;
  const startHp = 100 + (META[0].val(Save.metaLvl('startHp')));
  return {
    hp:startHp, maxHp:startHp,
    dmg:10, dmgMult:1 + META[3].val(Save.metaLvl('damage')),
    rate:2.2, rateMult:1,        // shots per second base
    projAdd:0 + (Save.metaLvl('damage')>=5?0:0),
    pierce:0, range:300,
    spd:185, spdMult:1,
    regen:0, magnet:80 + META[5].val(Save.metaLvl('magnet')),
    crit:0.05, critMul:2,
    shotgun:false, explosive:false, lifesteal:0,
    cardCounts:{},
  };
}

/* ---------------------------------------------------------------------------
   7. RUN LIFECYCLE
--------------------------------------------------------------------------- */
function startRun(){
  const s = freshStats();
  Game.stats = s;
  Game.player = { x:CX, y:CY+120, r:14, fireCd:0, hitFlash:0, dir:0 };
  Game.zombies=[]; Game.bullets=[]; Game.gems=[]; Game.coins=[]; Game.particles=[]; Game.texts=[]; Game.turrets=[]; Game.spits=[];
  Game.plots = makePlots();
  Game.cash = 50 + META[1].val(Save.metaLvl('startCash'));
  Game.time=0; Game.wave=1; Game.waveTimer=0; Game.kills=0; Game.bossesKilled=0;
  Game.spawnTimer=0; Game.incomeTimer=0; Game.airstrikeTimer=0;
  Game.level=1; Game.xp=0; Game.xpNext=11;
  Game.boostTimer=0; Game.reviveUsed=false;
  Game.freeReviveAvail = Save.metaLvl('revive')>0;
  Game.comebackTimer=0; Game.shake=0;
  // meta: start with pharmacy
  if(Save.metaLvl('pharmaStart')>0){ Game.plots[0].store='pharma'; Game.plots[0].lvl=1; }
  recompute();
  s.hp = s.maxHp;
  Game.state='playing';
  showWaveBanner('OLEADA 1');
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
    if(!p.store) continue;
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
function spawnInterval(){ return Math.max(0.16, 1.0 - Game.wave*0.045) * (Game.comebackTimer>0?1.5:1); }

function spawnZombie(type, isBoss){
  const def = ENEMIES[type] || ENEMIES.shambler;
  // spawn from a random edge
  const edge = Math.floor(Math.random()*4);
  let x,y;
  if(edge===0){ x=Math.random()*W; y=-30; }
  else if(edge===1){ x=W+30; y=Math.random()*H; }
  else if(edge===2){ x=Math.random()*W; y=H+30; }
  else { x=-30; y=Math.random()*H; }
  const waveHp = 10 * Math.pow(1.12, Game.wave);
  const z = {
    type, x, y, r:def.r, color:def.color,
    hp: waveHp*def.hpMul*(isBoss?40:1),
    maxHp: waveHp*def.hpMul*(isBoss?40:1),
    spd: def.spd*(isBoss?0.7:1),
    dmg: (4+Game.wave*0.6)*def.dmg*(isBoss?2.5:1),
    bounty: def.bounty*(isBoss?60:1)*(1+Game.wave*0.05),
    hitFlash:0, atkCd:0, ranged:def.ranged, explodes:def.explodes, boss:isBoss||false,
    r2: isBoss? def.r*2.4 : def.r,
  };
  if(isBoss){ z.r=def.r*2.4; z.color='#c0392b'; z.name='THE MALL COP'; }
  Game.zombies.push(z);
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
    showWaveBanner('⚠ JEFE — OLEADA '+Game.wave);
  } else {
    showWaveBanner('OLEADA '+Game.wave);
  }
  recompute();
}

/* ---------------------------------------------------------------------------
   11. UPDATE
--------------------------------------------------------------------------- */
function update(dt){
  const s=Game.stats, e=eff(), p=Game.player;
  Game.time += dt;
  Game.waveTimer += dt;
  if(Game.waveTimer >= 45) nextWave();

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
  if(mv.x||mv.y) p.dir = Math.atan2(mv.y,mv.x);
  if(p.hitFlash>0) p.hitFlash-=dt;

  // --- player auto fire ---
  p.fireCd -= dt;
  if(p.fireCd<=0){
    const target = nearestZombie(p.x,p.y,e.range);
    if(target){
      fireWeapon(p.x,p.y,target,e);
      p.fireCd = 1/e.rate;
      Audio2.shoot();
    }
  }

  // --- turrets ---
  for(const t of Game.turrets){
    t.cd-=dt;
    if(t.cd<=0){
      const tg=nearestZombie(t.x,t.y,260);
      if(tg){ fireBullet(t.x,t.y,tg.x,tg.y, e.dmg*0.5, 0, false); t.cd=0.6; }
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
  const si=spawnInterval();
  while(Game.spawnTimer>=si && Game.zombies.length<260){
    Game.spawnTimer-=si;
    const burst = 1 + Math.floor(Game.wave/6);
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
          damageZombie(z,dmg,isCrit);
          if(b.explosive){ explode(b.x,b.y,55,b.dmg*0.6); dead=true; break; }
          if(b.hitSet) b.hitSet.add(z);
          b.pierce--;
          if(b.pierce<0){ dead=true; break; }
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
    const ang=Math.atan2(p.y-z.y, p.x-z.x);
    const d=dist(z.x,z.y,p.x,p.y);
    if(z.ranged && d<340){
      // stop & spit
      z.atkCd-=dt;
      if(z.atkCd<=0){ z.atkCd=2.2;
        Game.spits.push({x:z.x,y:z.y,vx:Math.cos(ang)*240,vy:Math.sin(ang)*240,life:2,dmg:z.dmg}); }
    } else {
      z.x += Math.cos(ang)*z.spd*dt;
      z.y += Math.sin(ang)*z.spd*dt;
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

  if(s.hp<=0) onPlayerDead();

  // periodic HUD refresh
  UI.refreshHUD();
}

function fireWeapon(x,y,target,e){
  const baseAng = Math.atan2(target.y-y, target.x-x);
  const n = e.proj;
  if(e.shotgun){
    const spread=0.5;
    for(let i=0;i<n;i++){
      const a = baseAng + (i-(n-1)/2)*(spread/Math.max(1,n-1)) + (n===1?0:0);
      fireBulletAng(x,y,a,e.dmg,e.pierce,e.explosive);
    }
  } else {
    for(let i=0;i<n;i++){
      const a = baseAng + (i-(n-1)/2)*0.12;
      fireBulletAng(x,y,a,e.dmg,e.pierce,e.explosive);
    }
  }
}
function fireBulletAng(x,y,ang,dmg,pierce,explosive){
  const sp=560;
  Game.bullets.push({x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,r:5,dmg,pierce,explosive,life:1.2,hitSet:new Set()});
}
function fireBullet(x,y,tx,ty,dmg,pierce,explosive){
  const ang=Math.atan2(ty-y,tx-x); fireBulletAng(x,y,ang,dmg,pierce,explosive);
}

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
  const gain = Math.ceil(z.bounty * (1+Game.buffs.cash) * (1+META[2].val(Save.metaLvl('income'))));
  Game.cash += gain;
  addText(z.x,z.y,'+$'+gain,'#ffcf3f',13);
  Audio2.coin();
  // xp gem
  Game.gems.push({x:z.x,y:z.y,val: z.boss?40: (1+Math.floor(Game.wave*0.2)) });
  // particles
  for(let i=0;i<(z.boss?28:6);i++) spawnParticle(z.x,z.y,z.color);
  // lifesteal
  if(Game.stats.lifesteal>0){ Game.stats.hp=Math.min(eff().maxHp, Game.stats.hp+Game.stats.lifesteal); }
  if(z.explodes){ explode(z.x,z.y,60, 8+Game.wave); spawnZombie('shambler',false); spawnZombie('shambler',false); }
  if(z.boss){ Game.bossesKilled++; Game.cash+=200+Game.wave*20; Game.shake=14; addText(z.x,z.y-30,'BOSS!','#ff4d5e',24);
    // guaranteed level up reward
    gainXp(Game.xpNext); }
}

function explode(x,y,radius,dmg){
  for(let i=0;i<14;i++) spawnParticle(x,y,'#ff8a3c');
  for(const z of Game.zombies.slice()){
    if(dist(x,y,z.x,z.y)<radius+z.r) damageZombie(z,dmg,false);
  }
}

function hurtPlayer(dmg){
  const p=Game.player, s=Game.stats;
  if(p.hitFlash>0.4) return;
  s.hp-=dmg; p.hitFlash=0.5; Game.shake=Math.min(10,Game.shake+4);
  Audio2.hurt();
  addText(p.x,p.y-20,'-'+Math.round(dmg),'#ff4d5e',14);
}

function onPlayerDead(){
  if(Game.state!=='playing') return;
  // free revive from meta
  if(Game.freeReviveAvail && !Game.reviveUsed){
    Game.freeReviveAvail=false; Game.reviveUsed=true;
    addText(Game.player.x,Game.player.y-40,'¡REVIVIDO!','#36e0c8',22);
    Game.stats.hp=Game.stats.maxHp+Game.buffs.maxhp;
    Game.zombies=Game.zombies.filter(z=>dist(z.x,z.y,Game.player.x,Game.player.y)>220);
    return;
  }
  endRun();
}

function gainXp(v){
  Game.xp += v * (1+Game.buffs.xp);
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

  // floor
  ctx.fillStyle='#10131f'; ctx.fillRect(0,0,W,H);
  drawFloorGrid();

  // mall atrium (center) — tier by store count
  drawMall();

  // plots
  for(const p of Game.plots) drawPlot(p);

  // gems
  for(const g of Game.gems){ ctx.fillStyle='#5dff8f'; ctx.beginPath(); ctx.arc(g.x,g.y,5,0,7); ctx.fill(); }

  // turrets
  for(const t of Game.turrets){ ctx.fillStyle='#9fb0ff'; ctx.fillRect(t.x-7,t.y-7,14,14); ctx.fillStyle='#33405f'; ctx.fillRect(t.x-2,t.y-12,4,10); }

  // zombies
  for(const z of Game.zombies) drawZombie(z);

  // spits
  for(const sp of Game.spits){ ctx.fillStyle='#b388ff'; ctx.beginPath(); ctx.arc(sp.x,sp.y,6,0,7); ctx.fill(); }

  // bullets
  ctx.fillStyle='#ffe98a';
  for(const b of Game.bullets){ ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.fill(); }

  // player
  drawPlayer();

  // particles
  for(const pa of Game.particles){ ctx.globalAlpha=Math.max(0,pa.life*2); ctx.fillStyle=pa.color; ctx.beginPath(); ctx.arc(pa.x,pa.y,pa.r,0,7); ctx.fill(); }
  ctx.globalAlpha=1;

  // floating texts
  ctx.textAlign='center'; ctx.font='bold 12px Trebuchet MS';
  for(const t of Game.texts){ ctx.globalAlpha=Math.max(0,t.life*1.4); ctx.fillStyle=t.color; ctx.font='bold '+t.size+'px Trebuchet MS'; ctx.fillText(t.txt,t.x,t.y); }
  ctx.globalAlpha=1;

  ctx.restore();
}

function drawFloorGrid(){
  ctx.strokeStyle='rgba(255,255,255,.03)'; ctx.lineWidth=1;
  for(let x=0;x<=W;x+=64){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<=H;y+=64){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}

function drawMall(){
  const built = Game.plots.filter(p=>p.store).length;
  const tier = built>=9?3:built>=5?2:built>=1?1:0;
  const colors=['#2a2030','#3a2d4a','#2d4a55','#4a3d22'];
  const glow=['#000','#6a4a8a','#36e0c8','#ffcf3f'];
  ctx.save();
  ctx.shadowColor=glow[tier]; ctx.shadowBlur=tier*12;
  ctx.fillStyle=colors[tier];
  roundRect(CX-110,CY-78,220,156,16); ctx.fill();
  ctx.shadowBlur=0;
  // roof sign
  ctx.fillStyle=tier>=2?'#36e0c8':'#6a7299';
  ctx.font='bold 22px Trebuchet MS'; ctx.textAlign='center';
  ctx.fillText('🏬',CX,CY-20);
  ctx.fillStyle='#dfe7ff'; ctx.font='bold 13px Trebuchet MS';
  ctx.fillText('MALL',CX,CY+6);
  ctx.fillStyle='#8b96b8'; ctx.font='11px Trebuchet MS';
  ctx.fillText(['ABANDONADO','OPERATIVO','FORTIFICADO','MEGA-MALL'][tier],CX,CY+26);
  ctx.restore();
}

function drawPlot(p){
  if(p.store){
    const def=STORES.find(s=>s.id===p.store);
    const tierGlow = p.lvl>=4?'#ffcf3f':p.lvl>=2?'#36e0c8':'#5a6a99';
    ctx.save();
    ctx.shadowColor=tierGlow; ctx.shadowBlur=8;
    ctx.fillStyle='#222a40'; roundRect(p.x-30,p.y-30,60,60,10); ctx.fill();
    ctx.shadowBlur=0;
    ctx.font='28px Trebuchet MS'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(def.ico,p.x,p.y-2);
    // level pips
    for(let i=0;i<5;i++){ ctx.fillStyle=i<p.lvl?tierGlow:'#39435f'; ctx.fillRect(p.x-22+i*9,p.y+18,7,4); }
    ctx.textBaseline='alphabetic';
    ctx.restore();
  } else {
    // empty plot — pulsing if affordable cheapest store
    const t=(Game.time*2)%2;
    const pulse=0.4+0.3*Math.sin(Game.time*4);
    ctx.strokeStyle=`rgba(54,224,200,${pulse})`; ctx.lineWidth=2.5; ctx.setLineDash([6,6]);
    roundRect(p.x-28,p.y-28,56,56,10); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=`rgba(54,224,200,${pulse})`; ctx.font='22px Trebuchet MS'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('+',p.x,p.y); ctx.textBaseline='alphabetic';
  }
}

function drawZombie(z){
  ctx.save();
  ctx.fillStyle = z.hitFlash>0 ? '#fff' : z.color;
  ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,7); ctx.fill();
  // eyes
  ctx.fillStyle='#1a1a1a';
  ctx.beginPath(); ctx.arc(z.x-z.r*0.3,z.y-z.r*0.2,z.r*0.16,0,7); ctx.arc(z.x+z.r*0.3,z.y-z.r*0.2,z.r*0.16,0,7); ctx.fill();
  // hp bar (only if damaged)
  if(z.hp<z.maxHp){
    const w=z.r*2, hpw=w*(z.hp/z.maxHp);
    ctx.fillStyle='#400'; ctx.fillRect(z.x-z.r,z.y-z.r-8,w,4);
    ctx.fillStyle=z.boss?'#ff4d5e':'#5dff8f'; ctx.fillRect(z.x-z.r,z.y-z.r-8,hpw,4);
  }
  if(z.boss){ ctx.fillStyle='#fff'; ctx.font='bold 12px Trebuchet MS'; ctx.textAlign='center'; ctx.fillText('👮 '+z.name, z.x, z.y-z.r-14); }
  ctx.restore();
}

function drawPlayer(){
  const p=Game.player;
  ctx.save();
  // body
  ctx.fillStyle = p.hitFlash>0 ? '#ff6e7e' : '#36e0c8';
  ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill();
  ctx.fillStyle='#04201a'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*0.55,0,7); ctx.fill();
  // gun direction
  ctx.strokeStyle='#eaf0ff'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+Math.cos(p.dir)*p.r*1.5,p.y+Math.sin(p.dir)*p.r*1.5); ctx.stroke();
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
  if(Game.state==='playing') update(dt);
  if(['playing','paused','levelup','build','gameover','ad'].includes(Game.state)) render();
}

/* ---------------------------------------------------------------------------
   15. UI CONTROLLER (DOM overlays)
--------------------------------------------------------------------------- */
const $ = id=>document.getElementById(id);
const UI = {
  screens:['loading','menu','howto','meta','hud','build-menu','levelup','pause','gameover'],
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
    $('lvl-text').textContent = 'Lv '+Game.level;
    $('btn-boost').disabled = Game.boostTimer>0;
    $('btn-boost').textContent = Game.boostTimer>0 ? ('x2 INGRESOS '+Math.ceil(Game.boostTimer)+'s') : '🎬 x2 INGRESOS 60s';
  },

  showGameOver(secs, tokens){
    this.hideAll();
    const won = Game.wave>20;
    $('go-title').textContent = won?'¡VICTORIA!':'FIN DE LA PARTIDA · Oleada '+Game.wave;
    $('go-stats').innerHTML = `Sobreviviste <b>${fmtTime(secs)}</b> · ${Game.kills} zombis · ${Game.plots.filter(p=>p.store).length} tiendas · Récord oleada ${Save.data.bestWave}`;
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
      card.innerHTML=`<div class="mc-name">${m.name}</div><div class="mc-desc">${m.desc}</div>
        <div class="mc-pips">${pips}</div>
        <button class="btn mc-buy">${maxed?'MÁX':cost+' 🪙'}</button>`;
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
  return Math.round(def.cost * cheaper);
}

function openBuild(plot){
  Game.activePlot=plot;
  Game.state='build';
  const list=$('build-list'); list.innerHTML='';
  $('build-title').textContent = plot.store ? 'Mejorar tienda' : 'Construir tienda';

  if(plot.store){
    const def=STORES.find(s=>s.id===plot.store);
    const cost=storeCost(def,plot);
    const maxed = plot.lvl>=5;
    const row=storeRow(def, maxed?'MÁX':('$'+fmt(cost)), maxed?false:Game.cash>=cost,
      `Nivel ${plot.lvl} → ${plot.lvl+1} · ${def.desc} · +$${(def.income*Math.pow(1.5,plot.lvl)).toFixed(0)}/s`);
    if(!maxed) row.onclick=()=>{ if(Game.cash>=cost){ Game.cash-=cost; plot.lvl++; afterBuild(def,plot); } };
    list.appendChild(row);
  } else {
    STORES.forEach(def=>{
      const unlocked = Save.data.bestWave>0 || def.cost<=250 || true; // all available; gate by cost only
      const cost=storeCost(def,plot);
      const afford=Game.cash>=cost;
      const row=storeRow(def, '$'+fmt(cost), afford, def.desc+' · +$'+def.income+'/s');
      row.onclick=()=>{ if(Game.cash>=cost){ Game.cash-=cost; plot.store=def.id; plot.lvl=1; afterBuild(def,plot); } };
      list.appendChild(row);
    });
  }
  UI.show('build-menu');
}

function storeRow(def, costTxt, afford, desc){
  const row=document.createElement('div'); row.className='store-row'+(afford?'':' locked');
  row.innerHTML=`<div class="s-ico">${def.ico}</div>
    <div class="s-main"><div class="s-name">${def.name}</div><div class="s-desc">${desc}</div></div>
    <div class="s-cost ${afford?'':'cant'}">${costTxt}</div>`;
  return row;
}

function afterBuild(def, plot){
  Audio2.build();
  for(let i=0;i<14;i++) spawnParticle(plot.x,plot.y,'#36e0c8');
  // pharmacy heal burst
  if(def.id==='pharma'){ Game.stats.hp=Math.min(eff().maxHp, Game.stats.hp+8*plot.lvl); }
  recompute();
  // refresh menu (stay open for chained upgrades)
  openBuild(plot);
}

function closeBuild(){ UI.hide('build-menu'); if(Game.state==='build') Game.state='playing'; }

/* ---------------------------------------------------------------------------
   17. LEVEL UP CARDS
--------------------------------------------------------------------------- */
function openLevelUp(){
  Game.state='levelup';
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
    el.innerHTML=`<div class="lc-ico">${c.ico}</div><div class="lc-name">${c.name}</div><div class="lc-desc">${c.desc}</div>`;
    el.onclick=()=>{ c.apply(Game.stats); Audio2.build(); recompute(); UI.hide('levelup'); Game.state='playing'; };
    row.appendChild(el);
  });
}

/* ---------------------------------------------------------------------------
   18. PAUSE
--------------------------------------------------------------------------- */
function pauseGame(){ if(Game.state!=='playing') return; Game.state='paused'; CG.gameplayStop(); UI.show('pause'); }
function resumeGame(){ if(Game.state!=='paused') return; UI.hide('pause'); Game.state='playing'; CG.gameplayStart(); }
window.addEventListener('blur', ()=>{ if(Game.state==='playing') pauseGame(); });

/* ---------------------------------------------------------------------------
   19. WIRE UP BUTTONS
--------------------------------------------------------------------------- */
function bindUI(){
  $('btn-play').onclick=()=>{ Audio2.resume(); startRun(); };
  $('btn-meta').onclick=()=>{ UI.buildMeta(); UI.show('meta'); };
  $('btn-meta-close').onclick=()=>UI.hide('meta');
  $('btn-howto').onclick=()=>UI.show('howto');
  $('btn-howto-close').onclick=()=>UI.hide('howto');

  $('btn-mute').onclick=()=>{ const m=Audio2.toggleMute(); $('btn-mute').textContent=m?'🔇':'🔊'; };
  $('btn-pause-mute').onclick=()=>{ const m=Audio2.toggleMute(); $('btn-pause-mute').textContent=m?'🔇 Sonido':'🔊 Sonido'; };

  $('btn-build-close').onclick=closeBuild;
  $('btn-pause').onclick=pauseGame;
  $('btn-resume').onclick=resumeGame;
  $('btn-quit').onclick=()=>{ UI.hideAll(); Game.state='menu'; UI.show('menu'); UI.updateTokens(); CG.gameplayStop(); };

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
  $('btn-retry').onclick=()=>startRun();
  $('btn-menu').onclick=()=>{ UI.hideAll(); Game.state='menu'; UI.show('menu'); UI.updateTokens(); };
}

/* ---------------------------------------------------------------------------
   20. BOOT
--------------------------------------------------------------------------- */
async function boot(){
  Save.load();
  Audio2.init();
  resize();
  bindUI();
  if(Save.data.muted) $('btn-mute').textContent='🔇';
  isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints>0;

  // fake-but-real load progress while SDK initializes
  let prog=0;
  const fill=$('loadbar-fill');
  const iv=setInterval(()=>{ prog=Math.min(90,prog+8+Math.random()*12); fill.style.width=prog+'%'; },90);
  await CG.init();
  clearInterval(iv); fill.style.width='100%';

  setTimeout(()=>{
    UI.hideAll(); Game.state='menu'; UI.show('menu'); UI.updateTokens();
  }, 350);

  requestAnimationFrame(loop);
}
boot();
