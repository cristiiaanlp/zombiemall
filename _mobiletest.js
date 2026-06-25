/* Dev-only: real touch test on an emulated phone (Chrome). Verifies the mobile
   controls actually work: virtual joystick moves the hero, tapping a build plot
   opens the build menu, and portrait shows the rotate overlay. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r=>setTimeout(r,ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new',
    args:['--no-sandbox','--disable-gpu','--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const results = [];
  const ok = (name,cond,extra='') => { results.push(`${cond?'PASS':'FAIL'}  ${name}${extra?'  ('+extra+')':''}`); };

  // ---- emulate a landscape phone with touch ----
  await page.setViewport({ width:844, height:390, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  await page.goto('http://localhost:8093/index.html#play', { waitUntil:'load' });
  await sleep(2500);
  const client = await page.target().createCDPSession();
  const touch = async (type, x, y) => client.send('Input.dispatchTouchEvent',{ type, touchPoints: type==='touchEnd'?[]:[{x,y}] });

  // 0) is touch detected + did the run start?
  const env = await page.evaluate(()=>({ isTouch: (typeof isTouch!=='undefined'?isTouch:null), state: (typeof Game!=='undefined'?Game.state:null) }));
  ok('touch detected', env.isTouch===true, 'isTouch='+env.isTouch);
  ok('game running', env.state==='playing', 'state='+env.state);

  // 1) rotate overlay hidden in landscape
  const rotHiddenLandscape = await page.evaluate(()=>document.getElementById('rotate').classList.contains('hidden'));
  ok('landscape: no rotate prompt', rotHiddenLandscape);

  // 2) virtual joystick moves the hero
  const p0 = await page.evaluate(()=>({x:Game.player.x,y:Game.player.y}));
  await touch('touchStart', 200, 320);                 // empty area (lower-left)
  await sleep(60);
  const joyVisible = await page.evaluate(()=>!document.getElementById('joystick').classList.contains('hidden'));
  for(let i=0;i<10;i++){ await touch('touchMove', 200-70, 320+30); await sleep(40); }   // drag to move
  await touch('touchEnd');
  const p1 = await page.evaluate(()=>({x:Game.player.x,y:Game.player.y}));
  const moved = Math.hypot(p1.x-p0.x,p1.y-p0.y);
  ok('joystick appears on touch', joyVisible);
  ok('joystick moves the hero', moved>15, 'moved '+moved.toFixed(0)+'px');

  // 3) tapping a build plot opens the build menu
  const plotScreen = await page.evaluate(()=>{
    const pl = Game.plots.find(p=>!p.store) || Game.plots[0];
    return { sx: offX + pl.x*scale, sy: offY + pl.y*scale };
  });
  await touch('touchStart', plotScreen.sx, plotScreen.sy);
  await sleep(40); await touch('touchEnd');
  await sleep(150);
  const buildOpen = await page.evaluate(()=>Game.state==='build' && !document.getElementById('build-menu').classList.contains('hidden'));
  ok('tap plot opens build menu', buildOpen);
  // close it
  await page.evaluate(()=>{ try{ closeBuild(); }catch(e){} });

  // 4) portrait shows the rotate overlay
  await page.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  await sleep(400);
  const rotShownPortrait = await page.evaluate(()=>!document.getElementById('rotate').classList.contains('hidden'));
  ok('portrait: shows rotate prompt', rotShownPortrait);

  await browser.close();
  console.log('\n=== MOBILE TOUCH TEST ===');
  results.forEach(r=>console.log('  '+r));
  const fails = results.filter(r=>r.startsWith('FAIL')).length;
  console.log(fails? `\n${fails} FAILED` : '\nALL PASS — mobile controls work.');
  process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
