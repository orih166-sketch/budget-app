// Renders video.html frame by frame into out/ela-batevaa-guide.mp4 (1080x1920, 30fps, with click/whoosh sounds).
// Usage: node capture.js && node render.js [--preview]   (--preview writes a few still frames only)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'out');
const FPS = 30;
const preview = process.argv.includes('--preview');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const story = JSON.parse(fs.readFileSync(path.join(ROOT, 'shots', 'storyboard.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await page.addInitScript((s) => { window.STORY = s; }, story);
  await page.goto('file://' + path.join(ROOT, 'video.html'));
  const total = await page.evaluate(() => window.ready);
  const events = await page.evaluate(() => window.EVENTS);
  const frames = Math.round(total * FPS);
  console.log(`duration ${total.toFixed(1)}s, ${frames} frames`);

  if (preview) {
    const times = process.argv.filter((a) => /^\d+(\.\d+)?$/.test(a)).map(Number);
    for (const t of times.length ? times : [1.5, 5, 9, 14, 30, total - 2]) {
      await page.evaluate((x) => window.renderAt(x), t);
      await page.screenshot({ path: path.join(OUT, `still-${t}.png`) });
    }
    await browser.close();
    return;
  }

  const silent = path.join(OUT, 'video-silent.mp4');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < frames; f++) {
    await page.evaluate((x) => window.renderAt(x), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`frame ${f}/${frames}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();

  const evFile = path.join(OUT, 'events.json');
  fs.writeFileSync(evFile, JSON.stringify({ total, events }));
  const wav = path.join(OUT, 'sfx.wav');
  execFileSync('python3', [path.join(ROOT, 'sfx.py'), evFile, wav], { stdio: 'inherit' });
  const final = path.join(OUT, 'ela-batevaa-guide.mp4');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', final], { stdio: 'inherit' });
  console.log('done:', final);
})();
