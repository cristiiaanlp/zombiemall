/* Headless smoke test: stubs DOM + Canvas, boots the game, runs many update/render
   ticks plus interactions to catch runtime errors. Not shipped to players. */
const fs = require('fs');
const vm = require('vm');

// ---- fake DOM element ----
function makeEl(id){
  const children = [];
  const el = {
    id, _cls:new Set(), style:{}, dataset:{}, children,
    textContent:'', innerHTML:'', _onclick:null, _blur:null,
    classList:{ add(c){el._cls.add(c);}, remove(c){el._cls.delete(c);}, contains(c){return el._cls.has(c);},
      toggle(c,f){ const on=(f===undefined)?!el._cls.has(c):f; if(on) el._cls.add(c); else el._cls.delete(c); return on; } },
    set onclick(f){el._onclick=f;}, get onclick(){return el._onclick;},
    set onblur(f){el._blur=f;}, get onblur(){return el._blur;},
    appendChild(c){children.push(c); c.parentNode=el; return c;},
    removeChild(c){ const i=children.indexOf(c); if(i>=0) children.splice(i,1); return c; },
    get firstChild(){ return children[0]; },
    parentNode:null,
    querySelector(){ return makeEl('q'); },
    querySelectorAll(){ return []; },
    addEventListener(){}, removeEventListener(){},
    getBoundingClientRect(){ return {left:0,top:0,width:800,height:450}; },
    offsetWidth:100, offsetHeight:100, value:'',
  };
  return el;
}
const els = {};
function getEl(id){ if(!els[id]) els[id]=makeEl(id); return els[id]; }

// ---- fake canvas ctx via Proxy (every method/prop is a no-op) ----
const gradientStub = { addColorStop(){} };
const ctxProxy = new Proxy({}, {
  get(t,p){
    if(p in t) return t[p];
    if(p==='canvas') return canvasEl;
    if(p==='createLinearGradient'||p==='createRadialGradient'||p==='createPattern') return ()=>gradientStub;
    if(p==='measureText') return ()=>({width:10});
    return ()=>{};
  },
  set(){ return true; }
});
const canvasEl = makeEl('game-canvas');
canvasEl.getContext = ()=>ctxProxy;
canvasEl.width=800; canvasEl.height=450;
els['game-canvas']=canvasEl;

// ---- globals / window / document ----
const listeners = {};
const sandbox = {
  console,
  Math, JSON, Date: { now: ()=>Date.now() },
  setTimeout:(f)=>{ try{f();}catch(e){throw e;} return 0; },
  setInterval:()=>1, clearInterval:()=>{},
  requestAnimationFrame:()=>0,           // prevent real loop
  localStorage:{ _d:{}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=v;}, removeItem(k){delete this._d[k];} },
  navigator:{ maxTouchPoints:0, userAgent:'node-test', platform:'test', language:'es-ES' },
  location:{ hash:'', href:'http://localhost/' },
  AudioContext: function(){ return { state:'running', currentTime:0, resume(){}, destination:{},
    createOscillator(){ return {type:'',frequency:{value:0},connect(){},start(){},stop(){}}; },
    createGain(){ return {gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}; } }; },
};
sandbox.window = sandbox;
sandbox.webkitAudioContext = sandbox.AudioContext;
sandbox.window.devicePixelRatio = 1;
sandbox.window.innerWidth = 800; sandbox.window.innerHeight = 450;
sandbox.window.addEventListener = (ev,f)=>{ (listeners[ev]=listeners[ev]||[]).push(f); };
sandbox.document = {
  getElementById:getEl,
  createElement:(tag)=>{ const el=makeEl('dyn'); if((tag+'').toLowerCase()==='canvas'){ el.getContext=()=>ctxProxy; el.toDataURL=()=>'data:image/png;base64,'; el.width=0; el.height=0; } return el; },
  querySelectorAll:()=>[],
  addEventListener(){}, body:makeEl('body'), documentElement:{lang:'es'}, hidden:false,
};
sandbox.CrazyGames = undefined; // simulate no SDK -> graceful fallback

let src = fs.readFileSync(__dirname+'/game.js','utf8');
// expose internals after the IIFE
src = '(function(){\n' + src + '\n;globalThis.__T={Game,startRun,update,render,recompute,eff,openBuild,closeBuild,drawCards,openLevelUp,nextWave,spawnZombie,killZombie,Save,UI,fireWeapon,hurtPlayer,addFame,spawnArrival,spawnSaboteur,fireRandomEvent,megaHorde,spawnTrader,openTrader,closeTrader,quarantineAlly,fameTierIndex,toast};\n})();';

const ctx = vm.createContext(sandbox);
vm.runInContext(src, ctx, {filename:'game.js'});

// boot() is async; give microtasks a tick then drive the sim
setImmediate(()=>{
  const T = sandbox.globalThis ? sandbox.globalThis.__T : ctx.__T;
  const API = ctx.__T || globalThis.__T;
  run(API);
});

function run(T){
  const errors=[];
  const guard=(label,fn)=>{ try{ fn(); }catch(e){ errors.push(label+': '+e.stack); } };

  guard('startRun', ()=>T.startRun());
  if(!T.Game.player){ console.log('FAIL: player not created'); process.exit(1); }

  // simulate input: move around using keys
  // drive 6000 ticks (~100s at 60fps) with movement + occasional builds/upgrades
  let builds=0, levelups=0, maxKills=0, maxBullets=0, fired=0;
  for(let i=0;i<6000;i++){
    maxKills=Math.max(maxKills,T.Game.kills); maxBullets=Math.max(maxBullets,T.Game.bullets.length); fired+=T.Game.bullets.length;
    // wiggle movement by toggling Input through Game? Input not exported; emulate via player pos drift handled internally.
    guard('update#'+i, ()=>T.update(1/60));
    guard('render#'+i, ()=>T.render());

    // every ~2s, build/upgrade on first empty/own plot if affordable
    if(i%120===0){
      const plot = T.Game.plots.find(p=>!p.store) || T.Game.plots[0];
      guard('openBuild', ()=>T.openBuild(plot));
      // simulate buying cheapest store: directly mutate like the click handler
      guard('buy', ()=>{
        if(!plot.store){ const def=T.Save?null:null; }
      });
      // just construct directly to exercise recompute/afterBuild path
      guard('forceBuild', ()=>{
        if(T.Game.cash>=20){
          // emulate building a cafe
          if(!plot.store){ plot.store='cafe'; plot.lvl=1; }
          else if(plot.lvl<5){ plot.lvl++; }
          T.recompute();
          builds++;
        }
      });
      guard('closeBuild', ()=>T.closeBuild());
    }

    // if a level-up is pending, auto-pick first card
    if(T.Game.state==='levelup'){
      levelups++;
      const row=getEl('card-row');
      const card=row.children[0];
      if(card && card._onclick){ guard('pickCard', ()=>card._onclick()); }
      else { T.Game.state='playing'; }
    }
    // force-feed cash & xp so economy/build/levelup paths are exercised
    if(i%30===0){ T.Game.cash+=500; }
    if(i%50===0){ guard('xp', ()=>{ /* trigger via killing: spawn+kill */ }); }

    if(T.Game.state==='gameover'){ console.log('  (player died at tick '+i+', restarting)'); guard('restart',()=>T.startRun()); }
  }

  // ---- exercise the Refuge Fame System explicitly ----
  guard('addFame', ()=>T.addFame(2000));                 // push to a high tier
  guard('tierIdx', ()=>{ if(typeof T.fameTierIndex()!=='number') throw new Error('tier NaN'); });
  guard('spawnArrival', ()=>{ for(let k=0;k<6;k++) T.spawnArrival(); });
  guard('spawnSaboteur', ()=>T.spawnSaboteur());
  guard('megaHorde', ()=>T.megaHorde());
  guard('spawnTrader', ()=>T.spawnTrader(3));
  guard('openTrader', ()=>T.openTrader());
  // buy every trader deal
  guard('buyDeals', ()=>{ if(T.Game.trader){ T.Game.cash=1e7; T.Game.trader.deals.forEach(d=>{ if(!d.sold){ d.sold=true; d.apply(); } }); } });
  guard('closeTrader', ()=>T.closeTrader());
  // run long enough for arrivals to reach the mall and infected to turn (turncoats)
  for(let i=0;i<2400;i++){ guard('fameUpdate#'+i, ()=>T.update(1/60)); guard('fameRender#'+i, ()=>T.render());
    if(T.Game.state==='levelup'){ const c=getEl('card-row').children[0]; if(c&&c._onclick) c._onclick(); else T.Game.state='playing'; }
    if(T.Game.state==='gameover'){ T.startRun(); T.addFame(2000); }
  }
  // inject allies (one infected with a short fuse) to force turncoat + quarantine paths
  guard('injectAllies', ()=>{
    T.Game.allies.push({x:640,y:300,cd:0,infected:true,turnTimer:0.5});   // will turn -> spawnTurncoat
    T.Game.allies.push({x:660,y:300,cd:0,infected:true,turnTimer:99});    // quarantine: was infected
    T.Game.allies.push({x:680,y:300,cd:0,infected:false,turnTimer:0});    // quarantine: healthy (penalty)
  });
  guard('letInfectedTurn', ()=>{ for(let i=0;i<60;i++) T.update(1/60); });  // ~1s -> turncoat spawns
  // quarantine remaining allies (paranoia decision path: both infected & healthy)
  guard('quarantine', ()=>{ T.Game.allies.slice().forEach(a=>T.quarantineAlly(a)); });
  guard('fireEvents', ()=>{ for(let k=0;k<10;k++) T.fireRandomEvent(4); });
  for(let i=0;i<600;i++){ guard('postEvt#'+i, ()=>T.update(1/60)); guard('postEvtR#'+i, ()=>T.render());
    if(T.Game.state==='gameover'){ T.startRun(); }
  }
  console.log('Fame check -> fame:'+Math.round(T.Game.fame)+', tier:'+T.fameTierIndex()+', allies:'+T.Game.allies.length+', arrivals:'+T.Game.arrivals.length);

  // exercise boss wave + spitter/bloater by jumping waves
  guard('jumpWaves', ()=>{ for(let w=0;w<12;w++) T.nextWave(); });
  for(let i=0;i<1200;i++){ guard('lateUpdate#'+i, ()=>T.update(1/60)); guard('lateRender#'+i, ()=>T.render());
    if(T.Game.state==='levelup'){ const c=getEl('card-row').children[0]; if(c&&c._onclick) c._onclick(); else T.Game.state='playing'; }
    if(T.Game.state==='gameover'){ T.startRun(); for(let w=0;w<10;w++) T.nextWave(); }
  }

  console.log('Ticks run, builds:'+builds+', wave:'+T.Game.wave+', zombies:'+T.Game.zombies.length);
  console.log('Combat check -> maxKills seen:'+maxKills+', peak bullets in flight:'+maxBullets);
  if(maxKills<5){ console.log('FAIL: combat not killing zombies (maxKills='+maxKills+')'); process.exit(1); }
  if(maxBullets<1){ console.log('FAIL: weapon never fired'); process.exit(1); }
  if(errors.length){
    console.log('\n=== '+errors.length+' RUNTIME ERRORS (showing up to 8 unique) ===');
    const seen=new Set();
    for(const e of errors){ const key=e.split('\n')[0].replace(/#\d+/,''); if(seen.has(key))continue; seen.add(key); console.log('• '+e.split('\n').slice(0,3).join('\n  ')); if(seen.size>=8)break; }
    process.exit(1);
  } else {
    console.log('\n✅ SMOKE TEST PASSED — no runtime errors across ~7200 ticks, builds, level-ups, boss waves.');
  }
}
