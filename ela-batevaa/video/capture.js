// Drives the preview app (sample data) through the guide storyboard and saves one
// phone screenshot per step plus the tap target, into shots/ and shots/storyboard.json.
// Usage: node capture.js   (run `node ../scripts/build.mjs` first)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'shots');
const APP = 'file://' + path.join(ROOT, '..', 'preview', 'index.html');
const VW = 390, VH = 844;

const FONT_DIR = path.join(ROOT, 'assets', 'fonts');
const FONT_CSS = [['Assistant', 'assistant', [400, 600, 700, 800]], ['Frank Ruhl Libre', 'frank-ruhl-libre', [500, 700]]]
  .flatMap(([fam, slug, ws]) => ws.flatMap((w) => ['hebrew', 'latin'].map((sub) =>
    `@font-face{font-family:'${fam}';font-weight:${w};src:url(https://fonts.local/${slug}-${sub}-${w}-normal.woff2) format('woff2');` +
    `unicode-range:${sub === 'hebrew' ? 'U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F' : 'U+0000-00FF,U+2000-206F,U+20AC'};}`))).join('\n');
const LIBS = {
  'html2canvas.min.js': require.resolve('html2canvas/dist/html2canvas.min.js'),
  'jspdf.umd.min.js': require.resolve('jspdf/dist/jspdf.umd.min.js'),
};

async function routes(ctx) {
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: FONT_CSS, contentType: 'text/css' }));
  await ctx.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await ctx.route('https://fonts.local/**', (r) => r.fulfill({ body: fs.readFileSync(path.join(FONT_DIR, r.request().url().split('/').pop())), contentType: 'font/woff2' }));
  await ctx.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ body: fs.readFileSync(LIBS[r.request().url().split('/').pop()]), contentType: 'application/javascript' }));
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, timezoneId: 'Asia/Jerusalem', locale: 'he-IL' });
  await routes(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await page.clock.setFixedTime(new Date('2026-10-27T10:15:00+02:00'));
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#app:not([hidden])');
  await page.waitForTimeout(900);

  const steps = [];
  let n = 0;
  const settle = (ms) => page.waitForTimeout(ms || 550);
  const shoot = async () => {
    const file = `s${String(n++).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    return file;
  };
  const box = async (sel) => {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await settle(250);
    const b = await el.boundingBox();
    return { x: (b.x + b.width / 2) / VW, y: (b.y + b.height / 2) / VH };
  };

  // chapter: chip label; caption: headline; sel: tap target; act: what to do after the shot
  async function step(chapter, caption, sel, act) {
    const target = sel ? await box(sel) : null;
    const img = await shoot();
    steps.push({ chapter, caption, img, target, tap: !!(sel && act !== 'hover') });
    if (typeof act === 'function') await act(page.locator(sel).first());
    else if (sel && act !== 'hover') await page.locator(sel).first().click();
    await settle();
  }
  const scrollTo = async (sel) => { await page.locator(sel).first().evaluate((e) => e.scrollIntoView({ block: 'start' })); await page.evaluate(() => window.scrollBy(0, -12)); await settle(300); };
  const top = async () => { await page.evaluate(() => window.scrollTo(0, 0)); await settle(250); };
  const esc = async () => { await page.keyboard.press('Escape'); await settle(400); };

  // ---- 1. Home
  const C1 = 'מסך הבית';
  await step(C1, 'פותחים את הקישור מהטלפון – והמערכת נפתחת בחשבון שלך', null);
  await scrollTo('.section.grid-4');
  await step(C1, 'הכנסות, הוצאות ורווח החודש, ומעקב אחרי תקרת עוסק פטור', null);
  await scrollTo('.grid.cols-2');
  await step(C1, 'מה מחכה לטיפול היום: פולואפים, מלאי נמוך ולידים', null);
  await top();

  // ---- 2. Sale & receipt
  const C2 = 'מכירה וקבלה';
  await step(C2, 'מכירה חדשה? לוחצים על הכפתור הירוק', '.fab');
  await step(C2, 'מחפשים לקוח לפי שם או טלפון – או מוסיפים חדש', '#s_csearch', (l) => l.fill('רותם'));
  await step(C2, 'בוחרים את הלקוחה מהרשימה', '#s_cres .row[data-id]');
  await step(C2, 'מוסיפים מוצרים מהמלאי בלחיצה', '#s_pres .row[data-id] >> nth=1');
  await step(C2, 'אפשר כמה מוצרים – הכמות והמחיר ניתנים לשינוי', '#s_pres .row[data-id] >> nth=3');
  await step(C2, 'הפלוס מגדיל כמות, והסכום מתעדכן לבד', '#s_cart [data-inc="0"]');
  await step(C2, 'בוחרים איך שילמו', '#s_pay button[data-v="ביט"]');
  await step(C2, 'שמירה – והקבלה מופקת אוטומטית עם מספר רץ', '.overlay [data-save]', async (l) => {
    await l.click();
    await page.waitForFunction(() => window.__lastPdf, null, { timeout: 60000 });
    await settle(900);
  });
  await step(C2, 'הקבלה מוכנה – שולחים ללקוחה בוואטסאפ בלחיצה', '.overlay [data-wa]', 'hover');
  const pdf = await page.evaluate(() => window.__lastPdf);
  fs.writeFileSync(path.join(OUT, 'receipt.pdf'), Buffer.from(pdf.b64, 'base64'));
  execFileSync('pdftoppm', ['-png', '-singlefile', '-scale-to-x', '780', '-scale-to-y', '-1', path.join(OUT, 'receipt.pdf'), path.join(OUT, 'receipt')]);
  steps.push({ chapter: C2, caption: 'כך נראית הקבלה: לוגו, מספר עוסק ומספור רץ. שמורה גם בדרייב', img: 'receipt.png', target: null, tap: false, kind: 'paper' });
  await esc();
  await top();
  await step(C2, 'המלאי ירד לבד, ונקבעו שני פולואפים ללקוחה', null);

  // ---- 3. Follow-ups & customers
  const C3 = 'פולואפים ולקוחות';
  await step(C3, 'פולואפים: מה צריך לטפל בו היום', '#bottomnav [data-view="followups"]');
  await step(C3, 'אחרי 3 ימים: ״התחלת להשתמש? זה עוזר?״ ואחרי חודש: ״לחדש?״', '.fu [data-action="fuWa"] >> nth=0');
  await step(C3, 'ההודעה מוכנה עם השם והמוצר – אפשר לערוך ולשלוח', '.overlay [data-send]', 'hover');
  await esc();
  await step(C3, 'שלחת? ״בוצע״ – והמשימה יורדת מהרשימה', '.fu [data-action="fuDone"] >> nth=0');
  await step(C3, 'לקוחות ולידים – הכול במקום אחד', '#bottomnav [data-view="customers"]');
  await step(C3, 'ליד חדש מוואטסאפ? לוחצים ״ליד״', '#topbar [data-action="newLead"]');
  await step(C3, 'שם וטלפון – ותזכורת לחזור אליו נקבעת לבד', '#c_name', async (l) => {
    await l.fill('טל אבני');
    await page.fill('#c_phone', '052-555-1234');
    await page.locator('#c_name').focus();
  });
  await step(C3, 'שומרים, והליד נכנס לרשימה ולפולואפים', '.overlay [data-save]');
  await step(C3, 'לוחצים על לקוחה כדי לפתוח את הכרטיס שלה', '.list .row:has-text("נועה כהן")');
  await step(C3, 'כרטיס לקוח: היסטוריית רכישות, הודעה ומכירה חדשה', null);
  await esc();

  // ---- 4. Money, stock & club
  const C4 = 'כספים, מלאי ומועדון';
  await step(C4, 'הכנסות והוצאות – לפי חודש ולפי שנה', '#bottomnav [data-view="finance"]');
  await step(C4, 'גרף שנתי, וייצוא מסודר לרואה החשבון', '[data-action="exportCsv"]', 'hover');
  await top();
  await step(C4, 'הוצאה חדשה: לוחצים ״הוצאה״', '#topbar [data-action="newExpense"]');
  await step(C4, 'סכום, קטגוריה – ושמירה', '#e_amount', async (l) => {
    await l.fill('85');
    await page.click('#e_cat button[data-v="משלוחים ואריזה"]');
    await page.fill('#e_desc', 'שקיות ומדבקות');
  });
  await step(C4, 'סכום, קטגוריה – ושמירה', '.overlay [data-save]');
  await step(C4, 'מלאי, מועדון והגדרות נמצאים ב״עוד״', '#bottomnav [data-action="moreMenu"]');
  await step(C4, 'מלאי מוצרים', '[data-go="inventory"]');
  await scrollTo('.tabs');
  await step(C4, 'רואים מה יש בבית ומה עומד להיגמר. הפלוס והמינוס מעדכנים מיד', '.product [data-d="1"] >> nth=0');
  await top();
  await step(C4, 'הגיע משלוח מפוראבר? ״קליטת סחורה״', '#topbar [data-action="receiveStock"]');
  await step(C4, 'מזינים כמויות – המלאי מתעדכן וההוצאה נרשמת', null);
  await esc();
  await page.click('#bottomnav [data-action="moreMenu"]'); await settle();
  await step(C4, 'מועדון הלקוחות', '[data-go="club"]');
  await step(C4, 'בוחרים סוג תוכן לקבוצת הוואטסאפ', '.idea[data-type="new_product"]', async (l) => {
    await l.click(); await settle();
    await page.selectOption('#po_prod', { label: 'קרם ג׳ל אלוורה' });
  });
  await step(C4, 'ההודעה נבנית לבד – משלימים ושולחים לקבוצה', '.overlay [data-send]', 'hover');
  await esc();
  await page.click('#bottomnav [data-action="moreMenu"]'); await settle();
  await step(C4, 'הודעות מהירות', '[data-go="templates"]');
  await step(C4, 'נוסחים קבועים לוואטסאפ – {שם} מתמלא לבד', null);
  await page.click('#bottomnav [data-action="moreMenu"]'); await settle();
  await step(C4, 'הגדרות', '[data-go="settings"]');
  await step(C4, 'פרטי העסק בקבלה, מספור הקבלות וימי הפולואפ', null);

  fs.writeFileSync(path.join(OUT, 'storyboard.json'), JSON.stringify(steps, null, 1));
  console.log('captured', steps.length, 'steps');
  await browser.close();
})();
