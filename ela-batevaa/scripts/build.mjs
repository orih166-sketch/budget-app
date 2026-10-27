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
console.log('built src/Logo.html, preview/index.html and deploy/Index.html');
