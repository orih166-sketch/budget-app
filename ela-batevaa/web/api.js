/* אלה בטבע – Supabase backend for the web (Vercel) version.
   Exposes the same server API the Apps Script version has (google.script.run.*),
   so App.html works unchanged. Requires config.js (SUPABASE_URL, SUPABASE_ANON_KEY). */
(function () {
  'use strict';
  const cfg = window.ELA_CONFIG || {};
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  window.__sb = sb;

  const DEFAULT_SETTINGS = {
    businessName: 'אלה בטבע', ownerName: 'אלה', businessId: '212040851', address: 'שעלבים', phone: '0556637932',
    email: 'elah262@gmail.com', receiptNext: '1', receiptDigits: '4', checkDays: '3', renewDays: '30', inactiveDays: '60',
    ceiling: '120000', clubLink: '',
  };
  const DEFAULT_TEMPLATES = [
    ['בדיקה אחרי 3 ימים', 'check3', 'היי {שם} 🌿\nרציתי לבדוק איך הולך עם {מוצרים}?\nכבר התחלת להשתמש? אשמח לשמוע אם זה עוזר לך 💚\nאני כאן לכל שאלה,\nאלה'],
    ['חידוש אחרי חודש', 'renew30', 'היי {שם} 🌿\nעבר כבר חודש מאז שלקחת {מוצרים}.\nאיך היה? מרגישה שינוי?\nרוצה שאשמור לך חידוש כדי שלא ייגמר? 💚\nאלה'],
    ['ליד חדש – היכרות', 'lead', 'היי {שם}, כאן אלה מ״אלה בטבע״ 🌿\nשמחה שפנית! ספרי לי קצת מה מעניין אותך – טיפוח, בריאות או משהו אחר – ואתאים לך בדיוק את מה שמתאים 💚'],
    ['ליד – חזרה אחרי שיחה', 'lead', 'היי {שם} 🌿\nרק מזכירה את מה שדיברנו עליו. אם יש שאלות או שתרצי לנסות – אני כאן 💚\nאלה'],
    ['הזמנה מוכנה לאיסוף', 'general', 'היי {שם} 🌿\nההזמנה שלך מוכנה! מתי נוח לך לאסוף?\nאלה'],
    ['שליחת קבלה', 'receipt', 'היי {שם} 🌿\nתודה רבה על הרכישה! 💚\nמצרפת את הקבלה: {קבלה}\nאלה בטבע'],
    ['הזמנה למועדון', 'club', 'היי {שם} 🌿\nפתחתי מועדון לקוחות בוואטסאפ – טיפים, מוצרים חדשים והטבות רק לחברות המועדון 💚\nלהצטרפות: {קישור}'],
    ['יום הולדת', 'general', 'מזל טוב {שם}! 🎉🌿\nמאחלת לך שנה בריאה, זוהרת ושמחה.\nמחכה לך הפתעה קטנה ממני בהזמנה הבאה 💚\nאלה'],
  ];
  const KINDS = ['customers', 'products', 'sales', 'expenses', 'followups', 'templates', 'posts'];
  const RECEIPT_LINK_SECONDS = 60 * 60 * 24 * 365 * 3;

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => iso(new Date());
  const nowIso = () => { const d = new Date(); return today() + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
  const addDays = (s, n) => { const p = s.split('-').map(Number); return iso(new Date(p[0], p[1] - 1, p[2] + Number(n))); };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 12);

  const fail = (error) => { if (error) throw new Error(error.message || String(error)); };

  async function upsert(kind, rec) {
    if (!rec.id) rec.id = uid();
    const { error } = await sb.from('records').upsert({ id: rec.id, kind: kind, data: rec, updated_at: new Date().toISOString() });
    fail(error);
    return rec;
  }
  async function getOne(id) {
    const { data, error } = await sb.from('records').select('data').eq('id', id).maybeSingle();
    fail(error);
    return data ? data.data : null;
  }
  async function readAll() {
    const out = [];
    const size = 1000;
    for (let from = 0; ; from += size) {
      const { data, error } = await sb.from('records').select('id,kind,data').order('id').range(from, from + size - 1);
      fail(error);
      out.push.apply(out, data);
      if (data.length < size) break;
    }
    return out;
  }
  async function readSettings() {
    const row = await getOne('settings');
    return Object.assign({}, DEFAULT_SETTINGS, row || {});
  }
  async function writeSettings(patch) {
    const cur = (await getOne('settings')) || {};
    const next = Object.assign({}, cur, patch);
    const { error } = await sb.from('records').upsert({ id: 'settings', kind: 'settings', data: next, updated_at: new Date().toISOString() });
    fail(error);
    return Object.assign({}, DEFAULT_SETTINGS, next);
  }
  async function stock(pid, delta) {
    const { data, error } = await sb.rpc('adjust_stock', { pid: pid, delta: Number(delta) });
    fail(error);
    return data;
  }

  const api = {
    async rpc(name, argsJson) {
      if (name === 'rpc' || typeof api[name] !== 'function') throw new Error('פעולה לא מוכרת');
      return api[name].apply(api, JSON.parse(argsJson || '[]'));
    },
    async bootstrap() {
      const { data: { session } } = await sb.auth.getSession();
      const { data: allowed, error } = await sb.rpc('is_allowed');
      fail(error);
      if (!allowed) throw new Error('NOT_ALLOWED');
      const rows = await readAll();
      const out = { settings: Object.assign({}, DEFAULT_SETTINGS) };
      KINDS.forEach((k) => { out[k] = []; });
      rows.forEach((r) => {
        if (r.kind === 'settings') Object.assign(out.settings, r.data);
        else if (out[r.kind]) out[r.kind].push(r.data);
      });
      if (!out.templates.length) {
        for (let i = 0; i < DEFAULT_TEMPLATES.length; i++) {
          const t = DEFAULT_TEMPLATES[i];
          out.templates.push(await upsert('templates', { id: uid(), title: t[0], category: t[1], text: t[2], order: i }));
        }
      }
      out.meta = {
        spreadsheetUrl: '',
        email: session && session.user ? session.user.email : '',
        today: today(),
        storageNote: 'הנתונים והקבלות נשמרים במסד נתונים מאובטח (Supabase), ורק משתמשים מורשים יכולים לגשת אליהם.',
      };
      return out;
    },

    async saveRecord(kind, rec) {
      if (KINDS.indexOf(kind) === -1) throw new Error('טבלה לא מוכרת');
      if (kind === 'sales') throw new Error('מכירות נשמרות דרך מסך המכירה');
      if (!rec.createdAt && ['customers', 'sales', 'expenses'].indexOf(kind) !== -1) rec.createdAt = nowIso();
      return { changes: { [kind]: [await upsert(kind, rec)] } };
    },

    async deleteRecord(kind, id) {
      if (kind === 'sales') throw new Error('אי אפשר למחוק קבלה – אפשר רק לבטל אותה');
      const { error } = await sb.from('records').delete().eq('id', id).eq('kind', kind);
      fail(error);
      return { removed: { [kind]: [id] } };
    },

    async saveSettings(patch) {
      delete patch.receiptNext;
      return { settings: await writeSettings(patch) };
    },

    async setReceiptStart(n) {
      const { data, error } = await sb.from('records').select('data').eq('kind', 'sales');
      fail(error);
      const max = data.reduce((m, r) => Math.max(m, Number(r.data.receiptNo) || 0), 0);
      n = Math.floor(Number(n));
      if (!(n > max)) throw new Error('המספר חייב להיות גדול מהקבלה האחרונה (' + max + ')');
      return { settings: await writeSettings({ receiptNext: String(n) }) };
    },

    async createSale(sale) {
      const settings = await readSettings();
      const changes = { sales: [], products: [], followups: [], customers: [] };
      const rec = {
        id: uid(), date: sale.date || today(),
        customerId: sale.customerId || '', customerName: sale.customerName || '', customerPhone: sale.customerPhone || '',
        items: (sale.items || []).map((i) => ({ productId: i.productId || '', name: i.name, qty: Number(i.qty) || 1, price: Number(i.price) || 0 })),
        payment: sale.payment || '', kind: sale.kind || 'sale', status: 'active', notes: sale.notes || '',
        pdfUrl: '', pdfPath: '', createdAt: nowIso(),
      };
      rec.total = sale.total !== undefined && sale.total !== '' ? Number(sale.total) : rec.items.reduce((s, i) => s + i.qty * i.price, 0);
      if (sale.withReceipt) {
        const { data, error } = await sb.rpc('next_receipt_no');
        fail(error);
        rec.receiptNo = String(data);
      }
      await upsert('sales', rec);
      changes.sales.push(rec);
      for (const i of rec.items) {
        if (!i.productId) continue;
        const p = await stock(i.productId, -i.qty);
        if (p) changes.products.push(p);
      }
      if (rec.customerId) {
        const c = await getOne(rec.customerId);
        if (c && c.type !== 'customer') { c.type = 'customer'; changes.customers.push(await upsert('customers', c)); }
      }
      if (sale.followups && rec.customerId && rec.kind === 'sale') {
        const names = rec.items.map((i) => i.name).join(', ');
        for (const f of [['check3', settings.checkDays], ['renew30', settings.renewDays]]) {
          changes.followups.push(await upsert('followups', {
            id: uid(), customerId: rec.customerId, customerName: rec.customerName, phone: rec.customerPhone,
            saleId: rec.id, type: f[0], due: addDays(rec.date, f[1]), status: 'open', products: names, note: '', doneAt: '',
          }));
        }
      }
      return { changes: changes, settings: await readSettings() };
    },

    async cancelSale(id, restock) {
      const s = await getOne(id);
      if (!s) throw new Error('המכירה לא נמצאה');
      const changes = { sales: [], products: [], followups: [] };
      s.status = 'cancelled';
      changes.sales.push(await upsert('sales', s));
      if (restock) {
        for (const i of s.items || []) {
          if (!i.productId) continue;
          const p = await stock(i.productId, Number(i.qty) || 0);
          if (p) changes.products.push(p);
        }
      }
      const { data, error } = await sb.from('records').select('data').eq('kind', 'followups');
      fail(error);
      for (const r of data) {
        if (r.data.saleId === id && r.data.status === 'open') {
          r.data.status = 'skipped';
          changes.followups.push(await upsert('followups', r.data));
        }
      }
      return { changes: changes };
    },

    async saveReceiptPdf(saleId, b64, fileName) {
      const s = await getOne(saleId);
      if (!s) throw new Error('המכירה לא נמצאה');
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = s.date.slice(0, 4) + '/receipt-' + String(s.receiptNo || saleId).padStart(4, '0') + '-' + saleId + '.pdf';
      const bucket = sb.storage.from('receipts');
      const up = await bucket.upload(path, new Blob([bytes], { type: 'application/pdf' }), { upsert: true, contentType: 'application/pdf' });
      fail(up.error);
      const signed = await bucket.createSignedUrl(path, RECEIPT_LINK_SECONDS, { download: fileName });
      fail(signed.error);
      s.pdfPath = path;
      s.pdfUrl = signed.data.signedUrl;
      return { changes: { sales: [await upsert('sales', s)] } };
    },

    async adjustStock(productId, delta) {
      const p = await stock(productId, delta);
      if (!p) throw new Error('המוצר לא נמצא');
      return { changes: { products: [p] } };
    },

    async receiveStock(items, expense) {
      const changes = { products: [], expenses: [] };
      for (const i of items) {
        if (!Number(i.qty)) continue;
        const p = await stock(i.productId, Number(i.qty));
        if (p) changes.products.push(p);
      }
      if (expense && Number(expense.amount)) {
        expense.createdAt = nowIso();
        changes.expenses.push(await upsert('expenses', expense));
      }
      return { changes: changes };
    },

    async importProducts(rows) {
      const { data, error } = await sb.from('records').select('data').eq('kind', 'products');
      fail(error);
      const existing = data.map((r) => r.data);
      const out = [];
      for (const r of rows) {
        if (!r.name) continue;
        const match = existing.find((p) => (r.code && p.code && String(p.code) === String(r.code)) || String(p.name).trim() === String(r.name).trim());
        const rec = match || { id: uid(), active: true, minStock: 1 };
        ['name', 'code', 'category', 'cost', 'price', 'stock', 'minStock', 'notes'].forEach((k) => { if (r[k] !== undefined && r[k] !== '') rec[k] = r[k]; });
        out.push(await upsert('products', rec));
        if (!match) existing.push(rec);
      }
      return { changes: { products: out } };
    },
  };

  /* ---------- google.script.run compatible runner ---------- */
  function runner(success, failure) {
    return new Proxy({}, {
      get(_, prop) {
        if (prop === 'withSuccessHandler') return (fn) => runner(fn, failure);
        if (prop === 'withFailureHandler') return (fn) => runner(success, fn);
        return (...args) => {
          const fn = api[prop];
          if (!fn) { if (failure) failure(new Error('פעולה לא מוכרת: ' + String(prop))); return; }
          Promise.resolve().then(() => fn.apply(api, JSON.parse(JSON.stringify(args))))
            .then((r) => success && success(r))
            .catch((e) => failure && failure(e));
        };
      },
    });
  }

  /* ---------- login screen ---------- */
  let listening = false;
  function loginScreen(message) {
    if (!listening) {
      listening = true;
      sb.auth.onAuthStateChange((ev, session) => { if (session && ev === 'SIGNED_IN') location.reload(); });
    }
    const sp = document.getElementById('splash');
    sp.classList.add('error');
    sp.innerHTML =
      '<img class="splash-logo" src="' + window.LOGO_SRC + '" alt="אלה בטבע">' +
      '<div class="card card-pad" style="width:min(380px,calc(100vw - 32px));text-align:center;display:flex;flex-direction:column;gap:12px">' +
        '<b style="font-family:var(--font-display);font-size:22px;color:var(--olive-deep)">כניסה למערכת</b>' +
        (message ? '<div class="banner" style="margin:0;text-align:start">' + message + '</div>' : '') +
        (cfg.GOOGLE_LOGIN !== false ? '<button class="btn block" id="lgGoogle">כניסה עם Google</button><div class="faint" style="font-size:13px">או</div>' : '') +
        '<input class="input" id="lgEmail" type="email" dir="ltr" placeholder="כתובת המייל שלך" autocomplete="email">' +
        '<button class="btn secondary block" id="lgMagic">שליחת קישור כניסה למייל</button>' +
        '<div class="muted" id="lgMsg" style="font-size:14px;min-height:20px"></div>' +
      '</div>';
    const g = document.getElementById('lgGoogle');
    if (g) g.onclick = async () => {
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
      if (error) document.getElementById('lgMsg').textContent = error.message;
    };
    document.getElementById('lgMagic').onclick = async () => {
      const email = document.getElementById('lgEmail').value.trim();
      const msg = document.getElementById('lgMsg');
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'נא להזין כתובת מייל תקינה'; return; }
      msg.textContent = 'שולחת...';
      const { error } = await sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
      msg.textContent = error ? 'השליחה נכשלה: ' + error.message : 'נשלח! פתחי את המייל ולחצי על הקישור כדי להיכנס.';
    };
  }

  window.__logout = async () => { await sb.auth.signOut(); location.reload(); };

  // App.html calls bootstrap() on load; it waits here until there is a signed-in session.
  let ready;
  const gate = new Promise((r) => { ready = r; });
  const realBootstrap = api.bootstrap;
  api.bootstrap = async function () {
    await gate;
    try {
      return await realBootstrap.call(api);
    } catch (e) {
      if (e && e.message === 'NOT_ALLOWED') {
        const { data } = await sb.auth.getSession();
        const email = (data.session && data.session.user.email) || '';
        await sb.auth.signOut();
        loginScreen('החשבון ' + email + ' לא מורשה למערכת. אפשר להתחבר עם חשבון אחר.');
        return new Promise(() => {});
      }
      throw e;
    }
  };
  window.google = { script: { run: runner(null, null) } };

  if (!cfg.SUPABASE_URL || /YOUR-PROJECT/.test(cfg.SUPABASE_URL)) {
    document.addEventListener('DOMContentLoaded', () => loginScreen('חסרות הגדרות חיבור ל־Supabase בקובץ config.js.'));
    return;
  }
  sb.auth.getSession().then(({ data }) => {
    if (data.session) ready();
    else {
      const show = () => loginScreen('');
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
    }
  });
})();
