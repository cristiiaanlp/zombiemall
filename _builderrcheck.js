/* Loads the ACTUAL uploaded build with the real CrazyGames SDK script and
   reports any console errors / page errors / failed requests, plus whether the
   SDK initialised. Catches "broken build" / integration problems. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r=>setTimeout(r,ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new', args:['--no-sandbox'] });
  const page = await browser.newPage();
  const errors=[], failed=[], logs=[];
  page.on('pageerror', e => errors.push('pageerror: '+e.message));
  page.on('console', m => { if(m.type()==='error') logs.push('console.error: '+m.text()); });
  page.on('requestfailed', r => { const u=r.url(); if(!u.startsWith('data:')) failed.push(r.method()+' '+u+'  ('+(r.failure()&&r.failure().errorText)+')'); });
  page.on('response', r => { if(r.status()>=400) failed.push('HTTP '+r.status()+'  '+r.url()); });

  await page.goto('http://localhost:8094/index.html', { waitUntil:'networkidle2', timeout:30000 }).catch(e=>errors.push('goto: '+e.message));
  await sleep(4000);

  const state = await page.evaluate(()=>({
    hasSDKscript: !!document.querySelector('script[src*="crazygames"]'),
    sdkPresent: !!(window.CrazyGames && window.CrazyGames.SDK),
    cgReady: (typeof CG!=='undefined') ? CG.ready : 'n/a',
    cgEnv: (typeof CG!=='undefined') ? CG.env : 'n/a',
    gameState: (typeof Game!=='undefined') ? Game.state : 'n/a',
    menuVisible: !document.getElementById('menu').classList.contains('hidden'),
    bgImg: getComputedStyle(document.getElementById('menu')).backgroundImage.slice(0,60),
  })).catch(e=>({err:e.message}));

  await browser.close();
  console.log('\n=== BUILD + SDK CHECK (real SDK script) ===');
  console.log('  SDK <script> tag present :', state.hasSDKscript);
  console.log('  window.CrazyGames.SDK    :', state.sdkPresent);
  console.log('  CG.ready / CG.env        :', state.cgReady, '/', state.cgEnv);
  console.log('  Game.state               :', state.gameState);
  console.log('  Menu visible             :', state.menuVisible);
  console.log('  Menu bg-image            :', state.bgImg, '...');
  console.log('\n  Page errors   :', errors.length); errors.forEach(e=>console.log('     • '+e));
  console.log('  Console errors:', logs.length);   logs.slice(0,8).forEach(e=>console.log('     • '+e));
  console.log('  Failed requests:', failed.length); failed.forEach(e=>console.log('     • '+e));
  const clean = errors.length===0 && state.gameState!=='n/a' && state.menuVisible;
  console.log(clean ? '\n  ✅ Build loads to menu with no fatal errors.' : '\n  ⚠️ Something to look at above.');
})().catch(e=>{ console.error(e); process.exit(1); });
