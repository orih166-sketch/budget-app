// ─────────────────────────────────────────────────────────────
//  כלכלת בית — GAS Sync Script v3
//  סנכרון WhatsApp → Google Sheets Budget + Supabase
//  + מחיקה דו-כיוונית: מחיקה בגיליון → מחיקה ב-Supabase
// ─────────────────────────────────────────────────────────────

const AUTOMATION_SHEET_ID = '1AgZo-7gnNKrP6iLIO06iap0OPrpej_1PgUp54JgLHcc';
const BUDGET_SHEET_ID     = '1qTt6B9lcJJgWT_pcwgMpiXnsE5dIBBYpxViaDBnAK5Y';
const SYNCED_COL          = 7; // Column G = ✓
const SBID_COL            = 8; // Column H = Supabase UUID (חדש)

// Supabase
const SUPABASE_URL    = 'https://tiyaxhovletymvsgqvgh.supabase.co';
const SUPABASE_KEY    = 'sb_publishable_vyzPFG1BGBejn0M_pz06MQ_eGnk_cp9';
const HOUSEHOLD_ID    = '8250ed1e-a5e7-4d2e-884d-303c7c2b75ee';
const FAMILY_ID       = '2ccdb3f5-9750-40a8-ae01-e00adbadd32f';

// ── UUID validation ──────────────────────────────────────────
function isUUID(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));
}

// ── Category mapping ─────────────────────────────────────────
function mapCategory(cat) {
  const map = {
    'סופר': 'super', 'קניות': 'super', 'grocery': 'super',
    'רכב': 'car', 'דלק': 'car', 'רכב + דלק': 'car', 'car': 'car', 'fuel': 'car',
    'חשבונות': 'bills', 'bills': 'bills',
    'ביטוחים': 'insurance', 'ביטוח': 'insurance', 'insurance': 'insurance',
    'אוכל בחוץ': 'dining', 'מסעדה': 'dining', 'מסעדות': 'dining', 'dining': 'dining',
    'ביגוד': 'bigud', 'bigud': 'bigud', 'clothing': 'bigud',
    'לימודים': 'education', 'חינוך': 'education', 'education': 'education',
    'רפואה': 'health', 'בריאות': 'health', 'רפואה ובריאות': 'health', 'health': 'health',
    'תחבורה': 'transport', 'transport': 'transport',
    'בית': 'home', 'הוצאות בית': 'home', 'home': 'home',
    'פינוקים': 'pampering', 'בילויים': 'pampering', 'בידור': 'pampering',
    'ספורט': 'pampering', 'pampering': 'pampering', 'recreation': 'pampering',
    'קוסמטיקה': 'cosmet', 'cosmet': 'cosmet',
    'ילדים': 'children', 'מסגרות ילדים': 'children', 'children': 'children',
    'חסכון': 'savings', 'חיסכון': 'savings', 'savings': 'savings',
    'צדקה': 'charity', 'charity': 'charity',
    'אירועים': 'events', 'מתנות': 'events', 'אירועים ומתנות': 'events', 'events': 'events',
    'שונות': 'other', 'אחר': 'other', 'other': 'other',
  };
  return map[(cat || '').trim()] || 'other';
}

// ── Date helpers ─────────────────────────────────────────────
function toISODate(day, monthNum, rawDate) {
  let year = new Date().getFullYear();
  if (rawDate instanceof Date) {
    year = rawDate.getFullYear();
  } else {
    const parts = String(rawDate).trim().split('/');
    if (parts.length >= 3) year = parseInt(parts[2], 10);
  }
  return year + '-' + String(monthNum).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

// ── Insert one transaction into Supabase → returns UUID or null ──
function insertToSupabase(description, isoDate, category, amount, sender, externalId) {
  const member = resolveMember(sender);
  const payload = {
    household_id: HOUSEHOLD_ID,
    family_id:    FAMILY_ID,
    date:         isoDate,
    description:  description,
    amount:       amount,
    type:         'expense',
    category_id:  mapCategory(category),
    source:       'whatsapp',
    member:       member,
    external_id:  externalId,
  };

  const res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/transactions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      // return=representation → מחזיר את השורה שנוספה כולל ה-UUID
      'Prefer':        'resolution=ignore-duplicates,return=representation',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    Logger.log('⚠️  Supabase error [' + externalId + ']: ' + code + ' ' + res.getContentText().substring(0, 200));
    return null;
  }

  try {
    const rows = JSON.parse(res.getContentText());
    const id = rows && rows.length > 0 ? rows[0].id : null;
    Logger.log('✅ Supabase [' + externalId + ']: ' + code + (id ? ' id=' + id : ' (dup)'));
    return id;
  } catch(e) {
    return null;
  }
}

// ── Delete one transaction from Supabase by UUID ─────────────
function deleteFromSupabase(id) {
  if (!isUUID(id)) { Logger.log('⚠️  Invalid UUID: ' + id); return; }

  const url = SUPABASE_URL + '/rest/v1/transactions'
    + '?id=eq.' + id
    + '&household_id=eq.' + HOUSEHOLD_ID; // safety: only our own

  const res = UrlFetchApp.fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer':        'return=minimal',
    },
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code >= 200 && code < 300) {
    Logger.log('🗑️  Deleted from Supabase: ' + id);
  } else {
    Logger.log('⚠️  Delete failed [' + id + ']: ' + code + ' ' + res.getContentText().substring(0, 100));
  }
}

function resolveMember(sender) {
  if (!sender) return 'family';
  const s = String(sender).toLowerCase();
  if (s.includes('אורי') || s.includes('uri') || s.includes('ori')) return 'uri';
  if (s.includes('אפק') || s.includes('afek'))                       return 'afek';
  return 'family';
}

// ── Collect all Supabase UUIDs that are currently in the sheets ──
function getAllSheetSupabaseIds() {
  const ids = new Set();

  // גיליון אוטומציה — עמודה H
  const autoSS    = SpreadsheetApp.openById(AUTOMATION_SHEET_ID);
  const autoSheet = autoSS.getSheets()[0];
  const lastAutoRow = autoSheet.getLastRow();
  if (lastAutoRow > 1) {
    autoSheet.getRange(2, SBID_COL, lastAutoRow - 1, 1).getValues()
      .forEach(r => { if (isUUID(r[0])) ids.add(String(r[0])); });
  }

  // גיליון תקציב — עמודה E בכל לשונית חודש
  const budgetSS = SpreadsheetApp.openById(BUDGET_SHEET_ID);
  for (let m = 1; m <= 12; m++) {
    const sheet = budgetSS.getSheetByName(String(m));
    if (!sheet) continue;
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) continue;
    sheet.getRange(1, 5, lastRow, 1).getValues()
      .forEach(r => { if (isUUID(r[0])) ids.add(String(r[0])); });
  }

  return ids;
}

// ── syncDeletions: מזהה מחיקות בגיליון ומסנכרן ל-Supabase ──
// רץ כל 10 דקות. משווה snapshot קודם לגיליון הנוכחי.
function syncDeletions() {
  const props        = PropertiesService.getScriptProperties();
  const prevSnapshot = new Set(JSON.parse(props.getProperty('supabase_ids_snapshot') || '[]'));
  const currentIds   = getAllSheetSupabaseIds();

  if (prevSnapshot.size === 0) {
    // הרצה ראשונה — בנה snapshot בלבד, אל תמחק כלום
    props.setProperty('supabase_ids_snapshot', JSON.stringify([...currentIds]));
    Logger.log('syncDeletions: snapshot ראשוני נבנה (' + currentIds.size + ' רשומות)');
    return;
  }

  const deletedIds = [...prevSnapshot].filter(id => !currentIds.has(id));

  if (deletedIds.length > 0) {
    Logger.log('🗑️  נמצאו ' + deletedIds.length + ' שורות שנמחקו, מסנכרן ל-Supabase...');
    deletedIds.forEach(id => deleteFromSupabase(id));
  } else {
    Logger.log('syncDeletions: אין מחיקות');
  }

  // עדכן snapshot
  props.setProperty('supabase_ids_snapshot', JSON.stringify([...currentIds]));
}

// ── Main sync: WhatsApp → Sheets + Supabase ──────────────────
function syncWhatsAppExpenses() {
  const automationSS    = SpreadsheetApp.openById(AUTOMATION_SHEET_ID);
  const automationSheet = automationSS.getSheets()[0];
  const budgetSS        = SpreadsheetApp.openById(BUDGET_SHEET_ID);

  const lastRow = automationSheet.getLastRow();
  if (lastRow <= 1) return;

  const data = automationSheet.getRange(2, 1, lastRow - 1, SBID_COL).getValues();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row[6] === '✓') continue; // already synced

    const description = String(row[0]).trim();
    const rawDate     = row[1];
    const category    = String(row[2]).trim();
    const rawAmount   = row[3];
    const sender      = String(row[4] || '').trim();

    if (!description
      || description === 'description'
      || description.startsWith('{')
      || description.startsWith('[')) continue;

    let amount;
    if (typeof rawAmount === 'number') {
      amount = rawAmount;
    } else {
      amount = parseFloat(String(rawAmount).replace(/[^\d.]/g, ''));
    }
    if (!amount || isNaN(amount) || amount <= 0) continue;

    let day, monthNum;
    if (rawDate instanceof Date) {
      day      = rawDate.getDate();
      monthNum = rawDate.getMonth() + 1;
    } else {
      const p = String(rawDate).trim().split('/');
      if (p.length < 2) continue;
      day      = parseInt(p[0], 10);
      monthNum = parseInt(p[1], 10);
    }
    if (!monthNum || monthNum < 1 || monthNum > 12) continue;

    const isoDate    = toISODate(day, monthNum, rawDate);
    const externalId = 'wa_' + isoDate + '_r' + (i + 2);

    // 1. Write to budget Google Sheet
    const monthSheet = budgetSS.getSheetByName(String(monthNum));
    if (!monthSheet) {
      Logger.log('⚠️  Sheet not found for month: ' + monthNum);
    } else {
      const insertRow = findNextTransactionRow(monthSheet);
      monthSheet.getRange(insertRow, 1, 1, 4).setValues([[
        description, day + '/' + monthNum, category, amount
      ]]);
      Logger.log('📋 Sheets row ' + insertRow + ': ' + description + ' ₪' + amount);
    }

    // 2. Write to Supabase → get UUID back
    const supabaseId = insertToSupabase(description, isoDate, category, amount, sender, externalId);

    // 3. Mark as synced + store UUID in column H
    automationSheet.getRange(i + 2, SYNCED_COL).setValue('✓');
    if (supabaseId) {
      automationSheet.getRange(i + 2, SBID_COL).setValue(supabaseId);
    }
  }

  Logger.log('Done.');
}

// ── Backfill: re-sync ALL valid rows to Supabase ─────────────
function backfillToSupabase() {
  const automationSS    = SpreadsheetApp.openById(AUTOMATION_SHEET_ID);
  const automationSheet = automationSS.getSheets()[0];

  const lastRow = automationSheet.getLastRow();
  if (lastRow <= 1) { Logger.log('No data'); return; }

  const data = automationSheet.getRange(2, 1, lastRow - 1, SBID_COL).getValues();
  let inserted = 0, skipped = 0;

  for (let i = 0; i < data.length; i++) {
    const row         = data[i];
    const description = String(row[0]).trim();
    const rawDate     = row[1];
    const category    = String(row[2]).trim();
    const rawAmount   = row[3];
    const sender      = String(row[4] || '').trim();

    if (!description
      || description === 'description'
      || description.startsWith('{')
      || description.startsWith('[')) { skipped++; continue; }

    let amount;
    if (typeof rawAmount === 'number') {
      amount = rawAmount;
    } else {
      amount = parseFloat(String(rawAmount).replace(/[^\d.]/g, ''));
    }
    if (!amount || isNaN(amount) || amount <= 0) { skipped++; continue; }

    let day, monthNum;
    if (rawDate instanceof Date) {
      day      = rawDate.getDate();
      monthNum = rawDate.getMonth() + 1;
    } else {
      const p = String(rawDate).trim().split('/');
      if (p.length < 2) { skipped++; continue; }
      day      = parseInt(p[0], 10);
      monthNum = parseInt(p[1], 10);
    }
    if (!monthNum || monthNum < 1 || monthNum > 12) { skipped++; continue; }

    const isoDate    = toISODate(day, monthNum, rawDate);
    const externalId = 'wa_' + isoDate + '_r' + (i + 2);

    const supabaseId = insertToSupabase(description, isoDate, category, amount, sender, externalId);
    if (supabaseId) {
      // Store UUID in column H if not already there
      if (!isUUID(row[7])) {
        automationSheet.getRange(i + 2, SBID_COL).setValue(supabaseId);
      }
      inserted++;
    }
  }

  Logger.log('Backfill done. Inserted: ' + inserted + ', Skipped: ' + skipped);
}

// ── backfillSupabaseIds: מלא עמודה H לשורות קיימות ──────────
// הרץ פעם אחת כדי לאכלס UUID בשורות שכבר סונכרנו
function backfillSupabaseIds() {
  const autoSS    = SpreadsheetApp.openById(AUTOMATION_SHEET_ID);
  const autoSheet = autoSS.getSheets()[0];
  const lastRow   = autoSheet.getLastRow();
  if (lastRow <= 1) return;

  const data = autoSheet.getRange(2, 1, lastRow - 1, SBID_COL).getValues();
  let filled = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (isUUID(row[SBID_COL - 1])) continue; // כבר יש UUID
    if (row[6] !== '✓') continue;             // לא סונכרן

    const rawDate = row[1];
    let day, monthNum;
    if (rawDate instanceof Date) {
      day = rawDate.getDate();
      monthNum = rawDate.getMonth() + 1;
    } else {
      const p = String(rawDate).trim().split('/');
      if (p.length < 2) continue;
      day = parseInt(p[0], 10);
      monthNum = parseInt(p[1], 10);
    }

    const isoDate    = toISODate(day, monthNum, rawDate);
    const externalId = 'wa_' + isoDate + '_r' + (i + 2);

    const url = SUPABASE_URL + '/rest/v1/transactions'
      + '?external_id=eq.' + encodeURIComponent(externalId)
      + '&select=id&limit=1';

    const res = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
      muteHttpExceptions: true,
    });

    if (res.getResponseCode() === 200) {
      const rows = JSON.parse(res.getContentText());
      if (rows && rows.length > 0) {
        autoSheet.getRange(i + 2, SBID_COL).setValue(rows[0].id);
        filled++;
      }
    }

    Utilities.sleep(50); // rate limiting
  }

  Logger.log('backfillSupabaseIds done. Filled: ' + filled + ' UUIDs in column H');
}

// ── App → Sheets reverse sync ─────────────────────────────────
function syncAppToSheets() {
  const props    = PropertiesService.getScriptProperties();
  const lastSync = props.getProperty('app_last_sync') ||
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since    = new Date(new Date(lastSync).getTime() - 60 * 1000).toISOString();
  const now      = new Date().toISOString();

  const syncedIds = new Set(JSON.parse(props.getProperty('app_synced_ids') || '[]'));

  // Fetch both newly created AND recently updated manual transactions
  const url = SUPABASE_URL + '/rest/v1/transactions'
    + '?or=(source.is.null,source.eq.manual)'
    + '&household_id=eq.' + HOUSEHOLD_ID
    + '&updated_at=gte.' + encodeURIComponent(since)
    + '&select=id,description,date,category_id,amount,type';

  const res = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code !== 200) {
    Logger.log('syncAppToSheets error ' + code + ': ' + res.getContentText().substring(0, 200));
    return;
  }

  const transactions = JSON.parse(res.getContentText());
  if (!transactions.length) { Logger.log('syncAppToSheets: nothing new'); return; }

  const budgetSS = SpreadsheetApp.openById(BUDGET_SHEET_ID);
  let inserted = 0;
  let updated  = 0;

  for (var i = 0; i < transactions.length; i++) {
    var tx      = transactions[i];
    var d       = new Date(tx.date);
    var day     = d.getDate();
    var monthNum= d.getMonth() + 1;
    var sheet   = budgetSS.getSheetByName(String(monthNum));

    if (!sheet) { Logger.log('syncAppToSheets: no sheet for month ' + monthNum); continue; }

    if (syncedIds.has(tx.id)) {
      // Already in Sheets — find the row by UUID in column E and UPDATE it
      var lastRow = sheet.getLastRow();
      if (lastRow < 1) continue;
      var colE    = sheet.getRange(1, 5, lastRow, 1).getValues();
      var foundRow = -1;
      for (var r = 0; r < colE.length; r++) {
        if (String(colE[r][0]).trim() === tx.id) { foundRow = r + 1; break; }
      }
      if (foundRow > 0) {
        sheet.getRange(foundRow, 1, 1, 4).setValues([[
          tx.description || '', day + '/' + monthNum, toCategoryLabel(tx.category_id), tx.amount
        ]]);
        Logger.log('✏️  App→Sheets UPDATE: ' + tx.description + ' ₪' + tx.amount + ' [' + tx.id + ']');
        updated++;
      } else {
        Logger.log('⚠️  syncAppToSheets: UUID not found in col E for ' + tx.id);
      }
    } else {
      // New transaction — INSERT a new row
      var insertRow = findNextTransactionRow(sheet);
      // עמודה E מאחסנת את ה-UUID של Supabase לצורך מעקב מחיקות
      sheet.getRange(insertRow, 1, 1, 5).setValues([[
        tx.description || '', day + '/' + monthNum, toCategoryLabel(tx.category_id), tx.amount, tx.id
      ]]);
      Logger.log('📱 App→Sheets INSERT: ' + tx.description + ' ₪' + tx.amount + ' [' + tx.id + ']');
      syncedIds.add(tx.id);
      inserted++;
    }
  }

  const trimmed = [...syncedIds].slice(-500);
  props.setProperty('app_synced_ids', JSON.stringify(trimmed));
  props.setProperty('app_last_sync', now);
  Logger.log('syncAppToSheets done. Inserted: ' + inserted + ', Updated: ' + updated);
}

// ── Helpers ───────────────────────────────────────────────────
function findNextTransactionRow(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const vals    = sheet.getRange(1, 2, lastRow, 1).getValues();
  let lastDateRow = -1;

  for (let i = 0; i < vals.length; i++) {
    const v = vals[i][0];
    if (v instanceof Date) {
      lastDateRow = i + 1;
    } else if (typeof v === 'string' && /^\d{1,2}\/\d{1,2}/.test(v)) {
      lastDateRow = i + 1;
    }
  }

  return lastDateRow === -1 ? findFirstEmptyRowAfter(sheet, 29) : lastDateRow + 1;
}

function findFirstEmptyRowAfter(sheet, startRow) {
  const lastRow = Math.max(sheet.getLastRow(), startRow);
  const vals    = sheet.getRange(startRow, 1, lastRow - startRow + 2, 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (!vals[i][0]) return startRow + i;
  }
  return lastRow + 1;
}

function toCategoryLabel(catId) {
  const map = {
    'super': 'סופר', 'car': 'רכב + דלק', 'bills': 'חשבונות',
    'insurance': 'ביטוחים', 'dining': 'אוכל בחוץ', 'bigud': 'ביגוד',
    'education': 'לימודים', 'health': 'רפואה', 'transport': 'תחבורה',
    'home': 'הוצאות בית', 'pampering': 'פינוקים', 'cosmet': 'קוסמטיקה',
    'children': 'מסגרות ילדים', 'savings': 'חסכון', 'charity': 'צדקה',
    'events': 'אירועים ומתנות', 'other': 'אחר',
    'salary_uri': 'משכורת אורי', 'salary_afek': 'משכורת אפק', 'other_in': 'הכנסה אחרת',
  };
  return map[catId] || catId;
}

// ── תזכורות תשלומים חוזרים (יומי, 08:00) ────────────────────
function sendRecurringReminders() {
  // מחר
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var tDay   = tomorrow.getDate();
  var tMonth = tomorrow.getMonth() + 1;
  var tYear  = tomorrow.getFullYear();

  // שאב את recurring_rules מ-Supabase
  var url = SUPABASE_URL + '/rest/v1/recurring_rules'
    + '?household_id=eq.' + HOUSEHOLD_ID
    + '&select=description,amount,type,interval,day_of_month,start_date,end_date';

  var res = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) {
    Logger.log('sendRecurringReminders fetch error: ' + res.getContentText().substring(0,200));
    return;
  }

  var rules = JSON.parse(res.getContentText());
  var reminders = [];

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    var start = new Date(rule.start_date + 'T00:00:00');
    var end   = rule.end_date ? new Date(rule.end_date + 'T00:00:00') : null;

    // בדוק אם העסקה תתרחש מחר
    var fires = false;
    if (rule.interval === 'monthly') {
      var dom = rule.day_of_month || start.getDate();
      fires = (dom === tDay);
    } else if (rule.interval === 'yearly') {
      fires = (start.getDate() === tDay && (start.getMonth() + 1) === tMonth);
    } else if (rule.interval === 'weekly') {
      fires = (tomorrow.getDay() === start.getDay());
    }

    if (!fires) continue;
    if (start > tomorrow) continue;
    if (end && end < tomorrow) continue;

    reminders.push('• ' + rule.description + ': ₪' + rule.amount
      + ' (' + (rule.type === 'expense' ? 'הוצאה' : 'הכנסה') + ')');
  }

  if (!reminders.length) { Logger.log('sendRecurringReminders: אין תשלומים מחר'); return; }

  var msg = '📅 תזכורת לתשלומים מחר (' + tDay + '/' + tMonth + '):\n'
    + reminders.join('\n');

  queueWhatsAppNotification('recurring_reminder', msg);
  Logger.log('sendRecurringReminders: ' + reminders.length + ' תשלומים');
}

// ── סיכום שבועי (ראשון, 20:00) ───────────────────────────────
function sendWeeklySummary() {
  var now  = new Date();
  var week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  var since = week.toISOString().slice(0, 10);

  var url = SUPABASE_URL + '/rest/v1/transactions'
    + '?household_id=eq.' + HOUSEHOLD_ID
    + '&type=eq.expense'
    + '&date=gte.' + since
    + '&select=description,amount,category_id'
    + '&order=amount.desc&limit=100';

  var res = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) return;

  var txns = JSON.parse(res.getContentText());
  if (!txns.length) return;

  // קבץ לפי קטגוריה
  var byCategory = {};
  var total = 0;
  for (var i = 0; i < txns.length; i++) {
    var t = txns[i];
    var cat = toCategoryLabel(t.category_id || 'other');
    byCategory[cat] = (byCategory[cat] || 0) + t.amount;
    total += t.amount;
  }

  // מיין לפי סכום יורד
  var sorted = Object.entries(byCategory).sort(function(a,b){ return b[1]-a[1]; });
  var lines = sorted.slice(0, 5).map(function(e){
    return '• ' + e[0] + ': ₪' + e[1].toFixed(0);
  });

  var d1 = week.getDate() + '/' + (week.getMonth()+1);
  var d2 = now.getDate()  + '/' + (now.getMonth()+1);
  var msg = '📊 סיכום שבועי (' + d1 + '-' + d2 + ')\n'
    + 'סה"כ הוצאות: ₪' + total.toFixed(0) + '\n\n'
    + 'קטגוריות מובילות:\n' + lines.join('\n');

  queueWhatsAppNotification('weekly_summary', msg);
  Logger.log('sendWeeklySummary: ₪' + total.toFixed(0) + ', ' + txns.length + ' עסקאות');
}

// ── הוסף הודעה לתור WhatsApp ─────────────────────────────────
function queueWhatsAppNotification(type, message) {
  var url = SUPABASE_URL + '/rest/v1/pending_notifications';
  UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    payload: JSON.stringify({
      household_id: HOUSEHOLD_ID,
      type:         type,
      message:      message,
    }),
    muteHttpExceptions: true,
  });
}

// ── Trigger setup ─────────────────────────────────────────────
function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });

  // WhatsApp → Sheets + Supabase (every 10 min)
  ScriptApp.newTrigger('syncWhatsAppExpenses').timeBased().everyMinutes(10).create();
  // App → Sheets reverse sync (every 10 min)
  ScriptApp.newTrigger('syncAppToSheets').timeBased().everyMinutes(10).create();
  // מחיקות (every 10 min)
  ScriptApp.newTrigger('syncDeletions').timeBased().everyMinutes(10).create();
  // תזכורות תשלומים חוזרים — יומי בשעה 8 בבוקר
  ScriptApp.newTrigger('sendRecurringReminders').timeBased()
    .everyDays(1).atHour(8).create();
  // סיכום שבועי — ראשון בשעה 20
  ScriptApp.newTrigger('sendWeeklySummary').timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(20).create();

  Logger.log('Triggers created: syncWhatsAppExpenses + syncAppToSheets + syncDeletions (every 10 min) + sendRecurringReminders (daily 8am) + sendWeeklySummary (Sunday 8pm)');
}
