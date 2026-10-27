/* Local preview backend: mimics the Apps Script API on top of localStorage.
   Used only by preview/index.html – never deployed. */
(function () {
  const KEY = 'ela-preview-db-v1';
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => iso(new Date());
  const addDays = (s, n) => { const p = s.split('-').map(Number); return iso(new Date(p[0], p[1] - 1, p[2] + Number(n))); };
  const uid = () => Math.random().toString(36).slice(2, 14);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const SETTINGS = {
    businessName: 'אלה בטבע', ownerName: 'אלה', businessId: '212040851', address: 'שעלבים', phone: '0556637932',
    email: 'elah262@gmail.com', receiptNext: '1', receiptDigits: '4', checkDays: '3', renewDays: '30', inactiveDays: '60',
    ceiling: '120000', clubLink: '',
  };
  const TEMPLATES = [
    ['בדיקה אחרי 3 ימים', 'check3', 'היי {שם} 🌿\nרציתי לבדוק איך הולך עם {מוצרים}?\nכבר התחלת להשתמש? אשמח לשמוע אם זה עוזר לך 💚\nאני כאן לכל שאלה,\nאלה'],
    ['חידוש אחרי חודש', 'renew30', 'היי {שם} 🌿\nעבר כבר חודש מאז שלקחת {מוצרים}.\nאיך היה? מרגישה שינוי?\nרוצה שאשמור לך חידוש כדי שלא ייגמר? 💚\nאלה'],
    ['ליד חדש – היכרות', 'lead', 'היי {שם}, כאן אלה מ״אלה בטבע״ 🌿\nשמחה שפנית! ספרי לי קצת מה מעניין אותך – טיפוח, בריאות או משהו אחר – ואתאים לך בדיוק את מה שמתאים 💚'],
    ['ליד – חזרה אחרי שיחה', 'lead', 'היי {שם} 🌿\nרק מזכירה את מה שדיברנו עליו. אם יש שאלות או שתרצי לנסות – אני כאן 💚\nאלה'],
    ['הזמנה מוכנה לאיסוף', 'general', 'היי {שם} 🌿\nההזמנה שלך מוכנה! מתי נוח לך לאסוף?\nאלה'],
    ['שליחת קבלה', 'receipt', 'היי {שם} 🌿\nתודה רבה על הרכישה! 💚\nמצרפת את הקבלה: {קבלה}\nאלה בטבע'],
    ['הזמנה למועדון', 'club', 'היי {שם} 🌿\nפתחתי מועדון לקוחות בוואטסאפ – טיפים, מוצרים חדשים והטבות רק לחברות המועדון 💚\nלהצטרפות: {קישור}'],
    ['יום הולדת', 'general', 'מזל טוב {שם}! 🎉🌿\nמאחלת לך שנה בריאה, זוהרת ושמחה.\nמחכה לך הפתעה קטנה ממני בהזמנה הבאה 💚\nאלה'],
  ];

  function seed() {
    const t = today();
    const db = { settings: clone(SETTINGS), customers: [], products: [], sales: [], expenses: [], followups: [], templates: [], posts: [] };
    TEMPLATES.forEach((x, i) => db.templates.push({ id: uid(), title: x[0], category: x[1], text: x[2], order: i }));
    const prods = [
      ['ג׳ל אלוורה לשתייה 1 ליטר', '715', 'שתייה ותזונה', 89, 119, 6, 3],
      ['אלו ליפס – שפתון אלוורה', '022', 'טיפוח הפנים', 12, 20, 14, 5],
      ['קרם ג׳ל אלוורה', '061', 'טיפוח הגוף', 44, 60, 2, 3],
      ['פרופוליס דבורים', '027', 'תוספי תזונה', 72, 98, 0, 2],
      ['אלו היט לושן', '064', 'טיפוח הגוף', 44, 60, 5, 2],
      ['פוראבר דיילי – מולטי ויטמין', '439', 'תוספי תזונה', 62, 85, 4, 2],
      ['משחת שיניים ברייט', '028', 'היגיינה', 22, 30, 9, 4],
      ['מארז C9 לניקוי וחידוש', '475', 'מארזים', 420, 560, 1, 1],
    ];
    prods.forEach((p) => db.products.push({ id: uid(), name: p[0], code: p[1], category: p[2], cost: p[3], price: p[4], stock: p[5], minStock: p[6], active: true, notes: '' }));
    const people = [
      ['נועה כהן', '0521234567', 'customer', true], ['מיכל לוי', '0547654321', 'customer', true], ['דנה אברהם', '0501112233', 'customer', false],
      ['רותם שמש', '0539876543', 'customer', true], ['יעל ברק', '0584445566', 'customer', false], ['שירה גולן', '0527778899', 'lead', false],
      ['הדס מור', '0546667788', 'lead', false], ['אורי טל', '0503334455', 'customer', false],
    ];
    people.forEach((p, i) => db.customers.push({ id: uid(), name: p[0], phone: p[1], type: p[2], club: p[3], stage: p[2] === 'lead' ? (i === 5 ? 'חדש' : 'בשיחה') : '', birthday: '', notes: '', createdAt: addDays(t, -40 + i * 4) + 'T10:00:00' }));
    const C = db.customers, PR = db.products;
    const mk = (daysAgo, ci, items, pay) => {
      const date = addDays(t, -daysAgo);
      const its = items.map(([pi, q]) => ({ productId: PR[pi].id, name: PR[pi].name, qty: q, price: PR[pi].price }));
      const s = { id: uid(), date, receiptNo: db.settings.receiptNext, customerId: C[ci].id, customerName: C[ci].name, customerPhone: C[ci].phone, items: its,
        total: its.reduce((a, i) => a + i.qty * i.price, 0), payment: pay, kind: 'sale', status: 'active', notes: '', pdfUrl: '', pdfId: '', createdAt: date + 'T12:00:00' };
      db.settings.receiptNext = String(Number(db.settings.receiptNext) + 1);
      db.sales.push(s);
      [['check3', 3], ['renew30', 30]].forEach(([type, d]) => {
        const due = addDays(date, d);
        db.followups.push({ id: uid(), customerId: s.customerId, customerName: s.customerName, phone: s.customerPhone, saleId: s.id, type, due,
          status: due < addDays(t, -1) ? 'done' : 'open', products: its.map((i) => i.name).join(', '), note: '', doneAt: due < addDays(t, -1) ? due : '' });
      });
    };
    mk(95, 4, [[0, 1]], 'פייבוקס');
    mk(70, 7, [[5, 1]], 'ביט');
    mk(31, 0, [[0, 1], [1, 2]], 'פייבוקס');
    mk(30, 1, [[2, 1]], 'ביט');
    mk(12, 2, [[4, 1], [6, 1]], 'מזומן');
    mk(3, 3, [[0, 2]], 'העברה בנקאית');
    mk(1, 0, [[1, 1]], 'פייבוקס');
    db.followups.push({ id: uid(), customerId: C[5].id, customerName: C[5].name, phone: C[5].phone, saleId: '', type: 'lead', due: t, status: 'open', products: '', note: 'התעניינה בג׳ל אלוורה', doneAt: '' });
    db.expenses.push({ id: uid(), date: addDays(t, -35), category: 'רכישת מוצרים מפוראבר', description: 'הזמנת מלאי חודשית', amount: 420, payment: 'אשראי', notes: '', createdAt: '' });
    db.expenses.push({ id: uid(), date: addDays(t, -6), category: 'שירותים דיגיטליים', description: 'קנבה פרו', amount: 20, payment: 'אשראי', notes: '', createdAt: '' });
    db.expenses.push({ id: uid(), date: addDays(t, -2), category: 'כנסים והדרכות', description: 'כרטיס ליום הצלחה', amount: 40, payment: 'אשראי', notes: '', createdAt: '' });
    db.posts.push({ id: uid(), date: addDays(t, 2), type: 'tip', title: 'שתייה נכונה של ג׳ל אלוורה', body: '🌿 הטיפ של אלה לשבוע\n\nכדאי לשתות את ג׳ל האלוורה בבוקר על קיבה ריקה, 30–60 מ״ל, ולשמור את הבקבוק במקרר אחרי הפתיחה.\n\nשאלות? אני כאן 💚', productId: PR[0].id, status: 'planned' });
    return db;
  }

  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
  if (!db) db = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } };
  const upsert = (t, rec) => { if (!rec.id) rec.id = uid(); const i = db[t].findIndex((x) => x.id === rec.id); if (i >= 0) db[t][i] = rec; else db[t].push(rec); return clone(rec); };
  const get = (t, id) => db[t].find((x) => x.id === id);

  const api = {
    bootstrap() {
      return Object.assign(clone(db), { meta: { spreadsheetUrl: 'https://docs.google.com/spreadsheets/', email: 'elah262@gmail.com', today: today() } });
    },
    saveRecord(t, rec) { if (!rec.createdAt && ['customers', 'expenses'].includes(t)) rec.createdAt = today() + 'T09:00:00'; return { changes: { [t]: [upsert(t, rec)] } }; },
    deleteRecord(t, id) { db[t] = db[t].filter((x) => x.id !== id); return { removed: { [t]: [id] } }; },
    saveSettings(p) { delete p.receiptNext; Object.assign(db.settings, p); return { settings: clone(db.settings) }; },
    setReceiptStart(n) {
      const max = Math.max(0, ...db.sales.filter((s) => s.receiptNo).map((s) => Number(s.receiptNo)));
      if (!(n > max)) throw new Error('המספר חייב להיות גדול מהקבלה האחרונה (' + max + ')');
      db.settings.receiptNext = String(n); return { settings: clone(db.settings) };
    },
    createSale(sale) {
      const ch = { sales: [], products: [], followups: [], customers: [] };
      const rec = { id: uid(), date: sale.date || today(), customerId: sale.customerId || '', customerName: sale.customerName || '', customerPhone: sale.customerPhone || '',
        items: sale.items.map((i) => ({ productId: i.productId || '', name: i.name, qty: Number(i.qty) || 1, price: Number(i.price) || 0 })),
        payment: sale.payment || '', kind: sale.kind || 'sale', status: 'active', notes: sale.notes || '', pdfUrl: '', pdfId: '', createdAt: new Date().toISOString().slice(0, 19) };
      rec.total = sale.total !== undefined && sale.total !== '' ? Number(sale.total) : rec.items.reduce((s, i) => s + i.qty * i.price, 0);
      if (sale.withReceipt) { rec.receiptNo = db.settings.receiptNext; db.settings.receiptNext = String(Number(rec.receiptNo) + 1); }
      rec.items.forEach((i) => { const p = get('products', i.productId); if (p) { p.stock = (Number(p.stock) || 0) - i.qty; ch.products.push(clone(p)); } });
      const c = get('customers', rec.customerId);
      if (c && c.type !== 'customer') { c.type = 'customer'; ch.customers.push(clone(c)); }
      ch.sales.push(upsert('sales', rec));
      if (sale.followups && rec.customerId && rec.kind === 'sale') {
        const names = rec.items.map((i) => i.name).join(', ');
        [['check3', db.settings.checkDays], ['renew30', db.settings.renewDays]].forEach(([type, d]) => {
          ch.followups.push(upsert('followups', { id: uid(), customerId: rec.customerId, customerName: rec.customerName, phone: rec.customerPhone, saleId: rec.id, type, due: addDays(rec.date, d), status: 'open', products: names, note: '', doneAt: '' }));
        });
      }
      return { changes: ch, settings: clone(db.settings) };
    },
    cancelSale(id, restock) {
      const s = get('sales', id); const ch = { sales: [], products: [], followups: [] };
      s.status = 'cancelled'; ch.sales.push(clone(s));
      if (restock) s.items.forEach((i) => { const p = get('products', i.productId); if (p) { p.stock += i.qty; ch.products.push(clone(p)); } });
      db.followups.forEach((f) => { if (f.saleId === id && f.status === 'open') { f.status = 'skipped'; ch.followups.push(clone(f)); } });
      return { changes: ch };
    },
    saveReceiptPdf(id, b64, name) {
      const s = get('sales', id);
      window.__lastPdf = { name, b64 };
      s.pdfId = 'local'; s.pdfUrl = 'data:application/pdf;base64,' + b64.slice(0, 0) + '#preview';
      return { changes: { sales: [clone(s)] } };
    },
    adjustStock(id, d) { const p = get('products', id); p.stock = (Number(p.stock) || 0) + Number(d); return { changes: { products: [clone(p)] } }; },
    receiveStock(items, exp) {
      const ch = { products: [], expenses: [] };
      items.forEach((i) => { const p = get('products', i.productId); if (p) { p.stock += Number(i.qty); ch.products.push(clone(p)); } });
      if (exp && Number(exp.amount)) ch.expenses.push(upsert('expenses', exp));
      return { changes: ch };
    },
    importProducts(rows) {
      const out = [];
      rows.forEach((r) => {
        const m = db.products.find((p) => (r.code && p.code === String(r.code)) || p.name === r.name);
        const rec = m || { id: uid(), active: true, minStock: 1 };
        Object.keys(r).forEach((k) => { if (r[k] !== '' && r[k] !== undefined) rec[k] = r[k]; });
        out.push(upsert('products', rec));
      });
      return { changes: { products: out } };
    },
  };

  function runner(success, failure) {
    return new Proxy({}, {
      get(_, prop) {
        if (prop === 'withSuccessHandler') return (fn) => runner(fn, failure);
        if (prop === 'withFailureHandler') return (fn) => runner(success, fn);
        return (...args) => setTimeout(() => {
          try { const r = api[prop](...clone(args)); save(); success && success(clone(r)); }
          catch (e) { failure && failure(e); }
        }, 120);
      },
    });
  }
  window.google = { script: { run: runner(null, null) } };
  window.__resetPreview = () => { localStorage.removeItem(KEY); location.reload(); };
})();
