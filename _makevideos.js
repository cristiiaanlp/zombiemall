/* Dev-only: capture attract-mode gameplay and render the two CrazyGames preview
   videos (landscape 16:9 + portrait 2:3), silent, no text, no black bars.
   Requires a local server on :8090 (python -m http.server 8090). */
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:8090/index.html#play-attract';
const FRAMES = path.join(__dirname, '_frames');
const CAPTURE_MS = 20000;     // capture ~20s, trim to 18s
const OUT_SECS = 18;

(async () => {
  if (fs.existsSync(FRAMES)) fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES);

  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox','--disable-gpu','--hide-scrollbars','--autoplay-policy=no-user-gesture-required','--window-size=1920,1080'],
    defaultViewport: { width:1920, height:1080, deviceScaleFactor:1 },
  });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil:'load' });
  // let it boot (loading -> menu -> startRun + attract) and warm up the action
  await new Promise(r=>setTimeout(r, 3500));

  const client = await page.target().createCDPSession();
  let n = 0, frames = [];
  client.on('Page.screencastFrame', async (f) => {
    frames.push(f.data);
    try { await client.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch(e){}
  });
  const t0 = Date.now();
  await client.send('Page.startScreencast', { format:'jpeg', quality:88, maxWidth:1920, maxHeight:1080, everyNthFrame:1 });
  await new Promise(r=>setTimeout(r, CAPTURE_MS));
  await client.send('Page.stopScreencast');
  const dur = (Date.now()-t0)/1000;
  await browser.close();

  // write frames
  frames.forEach((data,i)=>{ fs.writeFileSync(path.join(FRAMES, 'f'+String(i+1).padStart(5,'0')+'.jpg'), Buffer.from(data,'base64')); });
  const fps = Math.max(20, Math.min(60, Math.round(frames.length / dur)));
  console.log(`Captured ${frames.length} frames in ${dur.toFixed(1)}s -> ${fps} fps`);
  if(frames.length < 60){ console.error('Too few frames captured.'); process.exit(1); }

  const inGlob = path.join(FRAMES, 'f%05d.jpg');
  const run = (args, label) => {
    const r = spawnSync(ffmpeg, args, { stdio:['ignore','ignore','inherit'] });
    if (r.status!==0) { console.error(label+' FAILED'); process.exit(1); }
    console.log(label+' OK');
  };
  // Landscape 1920x1080 (16:9)
  run(['-y','-framerate',String(fps),'-i',inGlob,'-t',String(OUT_SECS),
       '-vf','scale=1920:1080:flags=lanczos','-c:v','libx264','-preset','medium','-crf','20',
       '-pix_fmt','yuv420p','-movflags','+faststart','-an', path.join(__dirname,'preview_landscape.mp4')], 'Landscape');
  // Portrait 1080x1620 (2:3): centre-crop the 16:9 frame, no black bars
  run(['-y','-framerate',String(fps),'-i',inGlob,'-t',String(OUT_SECS),
       '-vf','crop=720:1080:600:0,scale=1080:1620:flags=lanczos','-c:v','libx264','-preset','medium','-crf','20',
       '-pix_fmt','yuv420p','-movflags','+faststart','-an', path.join(__dirname,'preview_portrait.mp4')], 'Portrait');

  fs.rmSync(FRAMES, { recursive:true, force:true });
  const mb = f => (fs.statSync(path.join(__dirname,f)).size/1048576).toFixed(1);
  console.log(`DONE -> preview_landscape.mp4 (${mb('preview_landscape.mp4')} MB), preview_portrait.mp4 (${mb('preview_portrait.mp4')} MB)`);
})().catch(e=>{ console.error(e); process.exit(1); });
