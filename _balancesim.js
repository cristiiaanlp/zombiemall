/* Dev-only balance simulation: loads the game headless and drives a "decent
   player" AI (kites away from zombies, auto-builds, auto-picks damage cards),
   then reports how far it gets. Not shipped. Run: node _balancesim.js */
const fs=require('fs'), vm=require('vm');
function makeEl(id){ const ch=[]; const el={id,_cls:new Set(),style:{},dataset:{},children:ch,textContent:'',innerHTML:'',_onclick:null,
  classList:{add(){},remove(){},contains(){return false;},toggle(){}},
  set onclick(f){el._onclick=f;}, get onclick(){return el._onclick;},
  appendChild(c){ch.push(c);c.parentNode=el;return c;}, removeChild(c){const i=ch.indexOf(c);if(i>=0)ch.splice(i,1);return c;},
  get firstChild(){return ch[0];}, parentNode:null, querySelector(){return makeEl('q');}, querySelectorAll(){return [];},
  addEventListener(){}, getBoundingClientRect(){return{left:0,top:0,width:800,height:450};}, offsetWidth:1,value:''}; return el; }
const els={}; const getEl=id=>els[id]||(els[id]=makeEl(id));
const gStub={addColorStop(){}};
const ctxProxy=new Proxy({},{get(t,p){ if(p==='canvas')return els['game-canvas']; if(p==='createLinearGradient'||p==='createRadialGradient')return ()=>gStub; if(p==='measureText')return ()=>({width:8}); return ()=>{}; },set(){return true;}});
const canvasEl=makeEl('game-canvas'); canvasEl.getContext=()=>ctxProxy; els['game-canvas']=canvasEl;
const box={ _d:{}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=v;}, removeItem(k){delete this._d[k];} };
const sb={ console, Math, JSON, Date:{now:()=>Date.now()}, setTimeout:(f)=>{try{f();}catch(e){}return 0;}, setInterval:()=>1, clearInterval:()=>{},
  requestAnimationFrame:()=>0, localStorage:box, navigator:{maxTouchPoints:0,userAgent:'n',platform:'n',language:'en'},
  location:{hash:'',href:'http://localhost/'},
  AudioContext:function(){return{state:'running',currentTime:0,resume(){},destination:{},createOscillator(){return{type:'',frequency:{value:0},connect(){},start(){},stop(){}};},createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}};} };
sb.window=sb; sb.webkitAudioContext=sb.AudioContext; sb.window.devicePixelRatio=1; sb.window.innerWidth=800; sb.window.innerHeight=450;
sb.window.addEventListener=()=>{};
sb.document={getElementById:getEl,createElement:(t)=>{const e=makeEl('dyn'); if((t+'').toLowerCase()==='canvas'){e.getContext=()=>ctxProxy;e.toDataURL=()=>'data:';} return e;},querySelectorAll:()=>[],addEventListener(){},body:makeEl('body'),documentElement:{lang:'en'},hidden:false,fonts:{ready:Promise.resolve()}};
sb.CrazyGames=undefined;
let src=fs.readFileSync(__dirname+'/game.js','utf8');
src='(function(){\n'+src+'\n;globalThis.__T={Game,Input,update,startRun,recompute,eff,STORES,storeCost,afterBuild,fameTierIndex};\n})();';
const ctx=vm.createContext(sb); vm.runInContext(src,ctx,{filename:'game.js'});

function run(seed){
  const T=ctx.__T, G=T.Game, I=T.Input;
  T.startRun();
  const dt=1/60; let t=0, builtTimer=0;
  const dist=(a,b,c,d)=>Math.hypot(a-c,b-d);
  while(t<25*60){
    // ----- AI: pick a level-up card (bias to offense/survival) -----
    if(G.state==='levelup'){
      const cs=getEl('card-row').children;
      const pri=['SHOTGUN','ROCKET','+Projectile','+Damage','+Fire Rate','+Max HP','+Crit','+Regen','+Pierce','+Range','+Speed','+Magnet','LIFESTEAL'];
      let pick=null;
      for(const key of pri){ pick=[...cs].find(c=>c._onclick&&(c.innerHTML||'').indexOf(key)>=0); if(pick)break; }
      if(!pick) pick=[...cs].find(c=>c._onclick);
      if(pick&&pick._onclick) pick._onclick(); else G.state='playing';
      continue;
    }
    if(G.state!=='playing'){ G.state='playing'; }
    // ----- AI: kite (flee nearest + circle tangentially + hug center) -----
    const p=G.player; let near=1e9,nz=null;
    for(const z of G.zombies){ const d=dist(z.x,z.y,p.x,p.y); if(d<near){near=d;nz=z;} }
    const k=I.keys; k.w=k.a=k.s=k.d=false;
    let vx=0,vy=0;
    if(nz){ let ax=p.x-nz.x, ay=p.y-nz.y; const m=Math.hypot(ax,ay)||1; ax/=m; ay/=m;
      vx = ax + (-ay)*0.85; vy = ay + (ax)*0.85; }     // away + perpendicular (circle)
    vx += (640-p.x)*0.004; vy += (360-p.y)*0.004;       // bias to arena center
    if(Math.abs(vx)<0.05&&Math.abs(vy)<0.05){ vx=Math.cos(t*2); vy=Math.sin(t*2.3); }
    if(vx<-0.08)k.a=true; else if(vx>0.08)k.d=true;
    if(vy<-0.08)k.w=true; else if(vy>0.08)k.s=true;
    // ----- AI: build / upgrade (no menu; direct, mirrors the click handler) -----
    builtTimer+=dt;
    if(builtTimer>0.8){
      builtTimer=0;
      const order=['gun','cafe','gym','elec','market','armor','pharma','sports','jewel','security','rest','heli'];
      // build cheapest sensible store on an empty plot
      const empty=G.plots.find(pl=>!pl.store);
      if(empty){
        for(const id of order){ const def=T.STORES.find(s=>s.id===id); const cost=T.storeCost(def,empty);
          if(G.cash>=cost){ G.cash-=cost; empty.store=def.id; empty.lvl=1; G.buildDiscount=0;
            if(def.id==='pharma'){} T.recompute(); break; } }
      } else {
        // upgrade a damage/income store if rich
        const up=G.plots.filter(pl=>pl.store&&pl.lvl<5).sort((a,b)=>a.lvl-b.lvl)[0];
        if(up){ const def=T.STORES.find(s=>s.id===up.store); const cost=T.storeCost(def,up); if(G.cash>=cost*1.2){ G.cash-=cost; up.lvl++; T.recompute(); } }
      }
    }
    T.update(dt); t+=dt;
    if(G.state==='gameover') break;
  }
  const G2=ctx.__T.Game;
  return { wave:G2.wave, secs:Math.floor(G2.time), kills:G2.kills, stores:G2.plots.filter(p=>p.store).length, fame:Math.round(G2.fame), tier:ctx.__T.fameTierIndex(), hp:Math.max(0,Math.round(G2.stats.hp)), alive:G2.state!=='gameover' };
}

console.log('Balance sim — "decent kiting player" (auto-build, auto-card):\n');
for(let s=0;s<4;s++){
  const r=run(s);
  console.log(`run ${s+1}: died/ended wave ${r.wave} @ ${Math.floor(r.secs/60)}:${String(r.secs%60).padStart(2,'0')} · ${r.kills} kills · ${r.stores} stores · fame ${r.fame} (tier ${r.tier})` + (r.alive?' · SURVIVED 25min':''));
}
