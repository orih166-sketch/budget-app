// Builds src/Logo.html (embedded logo) and preview/index.html (standalone demo with a mock backend).
// Usage: node scripts/build.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(root, 'src', f), 'utf8');

const logo = readFileSync(join(root, 'assets', 'logo-640.jpg')).toString('base64');
writeFileSync(join(root, 'src', 'Logo.html'), `<script>window.LOGO_SRC = 'data:image/jpeg;base64,${logo}';</script>\n`);

const mock = readFileSync(join(root, 'preview', 'mock.js'), 'utf8');
const html = src('Index.html').replace(/<\?!= include\('(\w+)'\); \?>/g, (_, name) =>
  (name === 'Logo' ? `<script>\n${mock}\n</script>\n` : '') + src(`${name}.html`));
writeFileSync(join(root, 'preview', 'index.html'), html);

// Single-file page for copy-paste deployment: deploy/Index.html + src/Code.gs are all Apps Script needs.
mkdirSync(join(root, 'deploy'), { recursive: true });
const inlined = src('Index.html').replace(/<\?!= include\('(\w+)'\); \?>/g, (_, name) => src(`${name}.html`));
writeFileSync(join(root, 'deploy', 'Index.html'), inlined);
writeFileSync(join(root, 'deploy', 'Code.gs'), src('Code.gs'));
// Web version for Vercel: same UI, Supabase backend (web/api.js) instead of Apps Script.
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const web = src('Index.html')
  .replace('<base target="_top">', '<title>אלה בטבע · ניהול העסק</title>\n  <link rel="manifest" href="/manifest.webmanifest">\n  <link rel="icon" href="/icon.jpg">\n  <link rel="apple-touch-icon" href="/icon.jpg">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-title" content="אלה בטבע">')
  .replace(/<\?!= include\('(\w+)'\); \?>/g, (_, name) =>
    src(`${name}.html`) + (name === 'Logo' ? `<script src="${SUPABASE_JS}"></script>\n<script src="/config.js"></script>\n<script src="/api.js"></script>\n` : ''));
writeFileSync(join(root, 'web', 'index.html'), web);
console.log('built src/Logo.html, preview/index.html, deploy/Index.html and web/index.html');
