/**
 * אלה בטבע – מערכת ניהול עסק
 * Google Apps Script backend. Data lives in a Google Sheet in the owner's Drive,
 * receipts are saved as PDF files in a Drive folder.
 */

// Only these Google accounts may use the system.
const ALLOWED_EMAILS = ['elah262@gmail.com'];

const APP_TITLE = 'אלה בטבע · ניהול העסק';
const SPREADSHEET_NAME = 'אלה בטבע – מערכת ניהול (לא למחוק)';
const RECEIPTS_FOLDER_NAME = 'אלה בטבע – קבלות';

// type: s = text, n = number, b = boolean, j = JSON
const SCHEMA = {
  customers: { sheet: 'לקוחות ולידים', cols: [
    ['id', 'מזהה', 's'], ['name', 'שם', 's'], ['phone', 'טלפון', 's'],
    ['type', 'סוג', 's'], ['stage', 'שלב ליד', 's'], ['club', 'במועדון', 'b'],
    ['birthday', 'יום הולדת', 's'], ['notes', 'הערות', 's'], ['createdAt', 'נוצר', 's'],
  ]},
  products: { sheet: 'מלאי מוצרים', cols: [
    ['id', 'מזהה', 's'], ['name', 'שם מוצר', 's'], ['code', 'מק״ט', 's'],
    ['category', 'קטגוריה', 's'], ['cost', 'מחיר עלות', 'n'], ['price', 'מחיר ללקוח', 'n'],
    ['stock', 'במלאי', 'n'], ['minStock', 'מינימום', 'n'], ['notes', 'הערות', 's'],
    ['active', 'פעיל', 'b'],
  ]},
  sales: { sheet: 'הכנסות וקבלות', cols: [
    ['id', 'מזהה', 's'], ['date', 'תאריך', 's'], ['receiptNo', 'מספר קבלה', 's'],
    ['customerId', 'מזהה לקוח', 's'], ['customerName', 'שם לקוח', 's'], ['customerPhone', 'טלפון', 's'],
    ['items', 'פריטים', 'j'], ['total', 'סכום', 'n'], ['payment', 'אמצעי תשלום', 's'],
    ['kind', 'סוג הכנסה', 's'], ['status', 'סטטוס', 's'], ['notes', 'הערות', 's'],
    ['pdfUrl', 'קישור לקבלה', 's'], ['pdfId', 'מזהה קובץ', 's'], ['createdAt', 'נוצר', 's'],
  ]},
  expenses: { sheet: 'הוצאות', cols: [
    ['id', 'מזהה', 's'], ['date', 'תאריך', 's'], ['category', 'קטגוריה', 's'],
    ['description', 'תיאור', 's'], ['amount', 'סכום', 'n'], ['payment', 'אמצעי תשלום', 's'],
    ['notes', 'הערות', 's'], ['createdAt', 'נוצר', 's'],
  ]},
  followups: { sheet: 'פולואפים', cols: [
    ['id', 'מזהה', 's'], ['customerId', 'מזהה לקוח', 's'], ['customerName', 'שם', 's'],
    ['phone', 'טלפון', 's'], ['saleId', 'מזהה מכירה', 's'], ['type', 'סוג', 's'],
    ['due', 'תאריך יעד', 's'], ['status', 'סטטוס', 's'], ['products', 'מוצרים', 's'],
    ['note', 'הערה', 's'], ['doneAt', 'בוצע ב', 's'],
  ]},
  templates: { sheet: 'תבניות הודעה', cols: [
    ['id', 'מזהה', 's'], ['title', 'כותרת', 's'], ['category', 'קטגוריה', 's'],
    ['text', 'נוסח', 's'], ['order', 'סדר', 'n'],
  ]},
  posts: { sheet: 'תוכן למועדון', cols: [
    ['id', 'מזהה', 's'], ['date', 'תאריך', 's'], ['type', 'סוג', 's'], ['title', 'כותרת', 's'],
    ['body', 'תוכן', 's'], ['productId', 'מוצר', 's'], ['status', 'סטטוס', 's'],
  ]},
};

const DEFAULT_SETTINGS = {
  businessName: 'אלה בטבע',
  ownerName: 'אלה',
  businessId: '212040851',
  address: 'שעלבים',
  phone: '0556637932',
  email: 'elah262@gmail.com',
  receiptNext: '1',
  receiptDigits: '4',
  checkDays: '3',
  renewDays: '30',
  inactiveDays: '60',
  ceiling: '120000',
  clubLink: '',
};

const DEFAULT_TEMPLATES = [
  ['בדיקה אחרי 3 ימים', 'check3', 'היי {שם} \u{1F33F}\nרציתי לבדוק איך הולך עם {מוצרים}?\nכבר התחלת להשתמש? אשמח לשמוע אם זה עוזר לך \u{1F49A}\nאני כאן לכל שאלה,\nאלה'],
  ['חידוש אחרי חודש', 'renew30', 'היי {שם} \u{1F33F}\nעבר כבר חודש מאז שלקחת {מוצרים}.\nאיך היה? מרגישה שינוי?\nרוצה שאשמור לך חידוש כדי שלא ייגמר? \u{1F49A}\nאלה'],
  ['ליד חדש – היכרות', 'lead', 'היי {שם}, כאן אלה מ״אלה בטבע״ \u{1F33F}\nשמחה שפנית! ספרי לי קצת מה מעניין אותך – טיפוח, בריאות או משהו אחר – ואתאים לך בדיוק את מה שמתאים \u{1F49A}'],
  ['ליד – חזרה אחרי שיחה', 'lead', 'היי {שם} \u{1F33F}\nרק מזכירה את מה שדיברנו עליו. אם יש שאלות או שתרצי לנסות – אני כאן \u{1F49A}\nאלה'],
  ['הזמנה מוכנה לאיסוף', 'general', 'היי {שם} \u{1F33F}\nההזמנה שלך מוכנה! מתי נוח לך לאסוף?\nאלה'],
  ['שליחת קבלה', 'receipt', 'היי {שם} \u{1F33F}\nתודה רבה על הרכישה! \u{1F49A}\nמצרפת את הקבלה: {קבלה}\nאלה בטבע'],
  ['הזמנה למועדון', 'club', 'היי {שם} \u{1F33F}\nפתחתי מועדון לקוחות בוואטסאפ – טיפים, מוצרים חדשים והטבות רק לחברות המועדון \u{1F49A}\nלהצטרפות: {קישור}'],
  ['יום הולדת', 'general', 'מזל טוב {שם}! \u{1F389}\u{1F33F}\nמאחלת לך שנה בריאה, זוהרת ושמחה.\nמחכה לך הפתעה קטנה ממני בהזמנה הבאה \u{1F49A}\nאלה'],
];

/* ---------------- Web app entry ---------------- */

function doGet() {
  checkAccess_();
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function checkAccess_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (email && ALLOWED_EMAILS.map(function (e) { return e.toLowerCase(); }).indexOf(email) === -1) {
    throw new Error('אין הרשאה למערכת עבור ' + email);
  }
}

/* ---------------- Storage helpers ---------------- */

function ss_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SS_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* recreate below */ }
  }
  const ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  props.setProperty('SS_ID', ss.getId());
  const first = ss.getSheets()[0];
  Object.keys(SCHEMA).forEach(function (t) { sheet_(t, ss); });
  settingsSheet_(ss);
  ss.deleteSheet(first);
  seedTemplates_();
  return ss;
}

function sheet_(table, ss) {
  ss = ss || ss_();
  const def = SCHEMA[table];
  let sh = ss.getSheetByName(def.sheet);
  if (!sh) {
    sh = ss.insertSheet(def.sheet);
    sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, def.cols.length)
      .setValues([def.cols.map(function (c) { return c[1]; })])
      .setFontWeight('bold').setBackground('#E7EAD9');
    sh.setFrozenRows(1);
    def.cols.forEach(function (c, i) {
      if (c[2] !== 'n') sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@');
    });
  }
  return sh;
}

function settingsSheet_(ss) {
  ss = ss || ss_();
  let sh = ss.getSheetByName('הגדרות');
  if (!sh) {
    sh = ss.insertSheet('הגדרות');
    sh.setRightToLeft(true);
    sh.getRange(1, 1, sh.getMaxRows(), 2).setNumberFormat('@');
    const rows = [['מפתח', 'ערך']].concat(Object.keys(DEFAULT_SETTINGS).map(function (k) { return [k, DEFAULT_SETTINGS[k]]; }));
    sh.getRange(1, 1, rows.length, 2).setValues(rows);
    sh.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#E7EAD9');
  }
  return sh;
}

function readSettings_() {
  const values = settingsSheet_().getDataRange().getValues();
  const out = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { out[k] = DEFAULT_SETTINGS[k]; });
  for (let i = 1; i < values.length; i++) if (values[i][0]) out[values[i][0]] = String(values[i][1]);
  return out;
}

function writeSettings_(patch) {
  const sh = settingsSheet_();
  const values = sh.getDataRange().getValues();
  Object.keys(patch).forEach(function (k) {
    let row = -1;
    for (let i = 1; i < values.length; i++) if (values[i][0] === k) { row = i + 1; break; }
    if (row === -1) { sh.appendRow([k, String(patch[k])]); values.push([k, patch[k]]); }
    else sh.getRange(row, 2).setValue(String(patch[k]));
  });
}

function toCell_(v, type) {
  if (v === undefined || v === null) return '';
  if (type === 'j') return JSON.stringify(v);
  if (type === 'b') return v ? 'כן' : '';
  if (type === 'n') return Number(v) || 0;
  return String(v);
}

function fromCell_(v, type) {
  if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (type === 'j') { try { return v ? JSON.parse(v) : []; } catch (e) { return []; } }
  if (type === 'b') return v === true || v === 'כן' || v === 'TRUE';
  if (type === 'n') return Number(v) || 0;
  return v === undefined || v === null ? '' : String(v);
}

function readAll_(table) {
  const def = SCHEMA[table];
  const sh = sheet_(table);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, def.cols.length).getValues();
  return values.filter(function (r) { return r[0]; }).map(function (r) {
    const o = {};
    def.cols.forEach(function (c, i) { o[c[0]] = fromCell_(r[i], c[2]); });
    return o;
  });
}

function upsert_(table, rec) {
  const def = SCHEMA[table];
  const sh = sheet_(table);
  if (!rec.id) rec.id = uid_();
  const row = def.cols.map(function (c) { return toCell_(rec[c[0]], c[2]); });
  const idx = findRow_(sh, rec.id);
  if (idx > 0) sh.getRange(idx, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
  return rec;
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function getById_(table, id) {
  const sh = sheet_(table);
  const idx = findRow_(sh, id);
  if (idx < 0) return null;
  const def = SCHEMA[table];
  const r = sh.getRange(idx, 1, 1, def.cols.length).getValues()[0];
  const o = {};
  def.cols.forEach(function (c, i) { o[c[0]] = fromCell_(r[i], c[2]); });
  return o;
}

function uid_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
}

function addDays_(iso, days) {
  const p = iso.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2] + Number(days));
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function seedTemplates_() {
  if (readAll_('templates').length) return;
  DEFAULT_TEMPLATES.forEach(function (t, i) {
    upsert_('templates', { id: uid_(), title: t[0], category: t[1], text: t[2], order: i });
  });
}

/* ---------------- Public API (called from the browser) ---------------- */

// Single entry point for the browser. Arguments and results travel as JSON with emoji
// (surrogate pairs) \u-escaped, because google.script.run can corrupt them otherwise.
const API_ = {
  bootstrap: bootstrap, saveRecord: saveRecord, deleteRecord: deleteRecord, saveSettings: saveSettings,
  setReceiptStart: setReceiptStart, createSale: createSale, cancelSale: cancelSale, saveReceiptPdf: saveReceiptPdf,
  adjustStock: adjustStock, receiveStock: receiveStock, importProducts: importProducts,
};
function rpc(name, argsJson) {
  if (!Object.prototype.hasOwnProperty.call(API_, name)) throw new Error('פעולה לא מוכרת');
  const result = API_[name].apply(null, JSON.parse(argsJson || '[]'));
  return JSON.stringify(result).replace(/[\ud800-\udfff]/g, function (c) { return '\\u' + c.charCodeAt(0).toString(16); });
}

// Default templates saved before the emoji fix may contain U+FFFD; restore them from the defaults.
function repairTemplates_(templates) {
  templates.forEach(function (t) {
    if (String(t.text).indexOf('\uFFFD') === -1) return;
    const d = DEFAULT_TEMPLATES.filter(function (x) { return x[0] === t.title; })[0];
    if (!d) return;
    t.text = d[2];
    upsert_('templates', t);
  });
}

function bootstrap() {
  checkAccess_();
  const ss = ss_();
  const data = { settings: readSettings_() };
  Object.keys(SCHEMA).forEach(function (t) { data[t] = readAll_(t); });
  repairTemplates_(data.templates);
  data.meta = {
    spreadsheetUrl: ss.getUrl(),
    email: Session.getActiveUser().getEmail(),
    today: today_(),
  };
  return data;
}

function saveRecord(table, rec) {
  checkAccess_();
  if (!SCHEMA[table]) throw new Error('טבלה לא מוכרת');
  if (table === 'sales') throw new Error('מכירות נשמרות דרך מסך המכירה');
  return withLock_(function () {
    if (!rec.createdAt && SCHEMA[table].cols.some(function (c) { return c[0] === 'createdAt'; })) rec.createdAt = nowIso_();
    return { changes: { [table]: [upsert_(table, rec)] } };
  });
}

function deleteRecord(table, id) {
  checkAccess_();
  if (table === 'sales') throw new Error('אי אפשר למחוק קבלה – אפשר רק לבטל אותה');
  return withLock_(function () {
    const sh = sheet_(table);
    const idx = findRow_(sh, id);
    if (idx > 0) sh.deleteRow(idx);
    return { removed: { [table]: [id] } };
  });
}

function saveSettings(patch) {
  checkAccess_();
  return withLock_(function () {
    delete patch.receiptNext; // changed only via setReceiptStart
    writeSettings_(patch);
    return { settings: readSettings_() };
  });
}

function setReceiptStart(n) {
  checkAccess_();
  return withLock_(function () {
    const used = readAll_('sales').filter(function (s) { return s.receiptNo; })
      .map(function (s) { return Number(s.receiptNo) || 0; });
    const max = used.length ? Math.max.apply(null, used) : 0;
    n = Math.floor(Number(n));
    if (!(n > max)) throw new Error('המספר חייב להיות גדול מהקבלה האחרונה (' + max + ')');
    writeSettings_({ receiptNext: n });
    return { settings: readSettings_() };
  });
}

/**
 * Creates a sale / income: assigns receipt number, updates stock, converts lead
 * to customer and schedules follow-ups.
 * sale: {date, customerId, customerName, customerPhone, items:[{productId,name,qty,price}],
 *        total, payment, kind:'sale'|'other', notes, withReceipt:boolean, followups:boolean}
 */
function createSale(sale) {
  checkAccess_();
  return withLock_(function () {
    const settings = readSettings_();
    const changes = { sales: [], products: [], followups: [], customers: [] };

    const rec = {
      id: uid_(),
      date: sale.date || today_(),
      customerId: sale.customerId || '',
      customerName: sale.customerName || '',
      customerPhone: sale.customerPhone || '',
      items: (sale.items || []).map(function (i) {
        return { productId: i.productId || '', name: i.name, qty: Number(i.qty) || 1, price: Number(i.price) || 0 };
      }),
      payment: sale.payment || '',
      kind: sale.kind || 'sale',
      status: 'active',
      notes: sale.notes || '',
      createdAt: nowIso_(),
    };
    rec.total = sale.total !== undefined && sale.total !== ''
      ? Number(sale.total)
      : rec.items.reduce(function (s, i) { return s + i.qty * i.price; }, 0);

    if (sale.withReceipt) {
      const n = Number(settings.receiptNext) || 1;
      rec.receiptNo = String(n);
      writeSettings_({ receiptNext: n + 1 });
    }

    rec.items.forEach(function (i) {
      if (!i.productId) return;
      const p = getById_('products', i.productId);
      if (!p) return;
      p.stock = (Number(p.stock) || 0) - i.qty;
      changes.products.push(upsert_('products', p));
    });

    if (rec.customerId) {
      const c = getById_('customers', rec.customerId);
      if (c && c.type !== 'customer') {
        c.type = 'customer';
        changes.customers.push(upsert_('customers', c));
      }
    }

    upsert_('sales', rec);
    changes.sales.push(rec);

    if (sale.followups && rec.customerId && rec.kind === 'sale') {
      const names = rec.items.map(function (i) { return i.name; }).join(', ');
      [['check3', settings.checkDays], ['renew30', settings.renewDays]].forEach(function (f) {
        changes.followups.push(upsert_('followups', {
          id: uid_(), customerId: rec.customerId, customerName: rec.customerName, phone: rec.customerPhone,
          saleId: rec.id, type: f[0], due: addDays_(rec.date, f[1]), status: 'open', products: names,
        }));
      });
    }

    return { changes: changes, settings: readSettings_() };
  });
}

function cancelSale(id, restock) {
  checkAccess_();
  return withLock_(function () {
    const s = getById_('sales', id);
    if (!s) throw new Error('המכירה לא נמצאה');
    const changes = { sales: [], products: [], followups: [] };
    s.status = 'cancelled';
    changes.sales.push(upsert_('sales', s));
    if (restock) {
      (s.items || []).forEach(function (i) {
        if (!i.productId) return;
        const p = getById_('products', i.productId);
        if (!p) return;
        p.stock = (Number(p.stock) || 0) + Number(i.qty || 0);
        changes.products.push(upsert_('products', p));
      });
    }
    readAll_('followups').forEach(function (f) {
      if (f.saleId === id && f.status === 'open') {
        f.status = 'skipped';
        changes.followups.push(upsert_('followups', f));
      }
    });
    return { changes: changes };
  });
}

function saveReceiptPdf(saleId, base64, fileName) {
  checkAccess_();
  return withLock_(function () {
    const s = getById_('sales', saleId);
    if (!s) throw new Error('המכירה לא נמצאה');
    const folder = receiptsFolder_(s.date.slice(0, 4));
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), 'application/pdf', fileName);
    if (s.pdfId) { try { DriveApp.getFileById(s.pdfId).setTrashed(true); } catch (e) { /* ignore */ } }
    const file = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* sharing restricted */ }
    s.pdfId = file.getId();
    s.pdfUrl = file.getUrl();
    return { changes: { sales: [upsert_('sales', s)] } };
  });
}

function receiptsFolder_(year) {
  const props = PropertiesService.getScriptProperties();
  let root = null;
  const id = props.getProperty('RECEIPTS_FOLDER_ID');
  if (id) { try { root = DriveApp.getFolderById(id); } catch (e) { root = null; } }
  if (!root) {
    root = DriveApp.createFolder(RECEIPTS_FOLDER_NAME);
    props.setProperty('RECEIPTS_FOLDER_ID', root.getId());
  }
  const it = root.getFoldersByName(year);
  return it.hasNext() ? it.next() : root.createFolder(year);
}

function adjustStock(productId, delta) {
  checkAccess_();
  return withLock_(function () {
    const p = getById_('products', productId);
    if (!p) throw new Error('המוצר לא נמצא');
    p.stock = (Number(p.stock) || 0) + Number(delta);
    return { changes: { products: [upsert_('products', p)] } };
  });
}

/** items: [{productId, qty}], expense: optional expense record */
function receiveStock(items, expense) {
  checkAccess_();
  return withLock_(function () {
    const changes = { products: [], expenses: [] };
    items.forEach(function (i) {
      const p = getById_('products', i.productId);
      if (!p || !Number(i.qty)) return;
      p.stock = (Number(p.stock) || 0) + Number(i.qty);
      changes.products.push(upsert_('products', p));
    });
    if (expense && Number(expense.amount)) {
      expense.createdAt = nowIso_();
      changes.expenses.push(upsert_('expenses', expense));
    }
    return { changes: changes };
  });
}

/** rows: [{name, code, category, cost, price, stock, minStock}] – matches by code, then name */
function importProducts(rows) {
  checkAccess_();
  return withLock_(function () {
    const existing = readAll_('products');
    const out = [];
    rows.forEach(function (r) {
      if (!r.name) return;
      const match = existing.filter(function (p) {
        return (r.code && p.code && String(p.code) === String(r.code)) || p.name.trim() === String(r.name).trim();
      })[0];
      const rec = match || { id: uid_(), active: true, minStock: 1 };
      ['name', 'code', 'category', 'cost', 'price', 'stock', 'minStock', 'notes'].forEach(function (k) {
        if (r[k] !== undefined && r[k] !== '') rec[k] = r[k];
      });
      out.push(upsert_('products', rec));
    });
    return { changes: { products: out } };
  });
}

/** Run once from the editor to create the spreadsheet and grant permissions. */
function setup() {
  const ss = ss_();
  receiptsFolder_(today_().slice(0, 4));
  Logger.log('הכול מוכן! הגיליון: ' + ss.getUrl());
}
