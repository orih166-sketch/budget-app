# 🏠 כלכלת בית — מסמך Handoff לקלוד קוד

> **מטרה:** הפוך את האפלקציה הקיימת ב-`budget-deploy-six.vercel.app` לאפלקציה חיה, זורמת, ומלוטשת.
> **קוד נמצא ב:** `/Users/oriharel/קוד`
> **Tech Stack:** React + Vite + Firebase

---

## 1. סטאטוס נוכחי

האפלקציה קיימת אבל:
- עיצוב ישן ולא מלוטש
- סנכרון Google Sheets לא עובד
- אין ייבוא Excel
- אין push notifications
- אין PWA

---

## 2. Design System — חובה לשמור על זה בכל המסכים

```css
:root {
  /* רקעים */
  --bg:           #1a1830;   /* רקע ראשי */
  --bg2:          #201e35;   /* header / navbar */
  --card:         #252240;   /* כרטיסים */
  --card2:        #1e1c32;   /* כרטיסים משניים */

  /* זהב */
  --gold:         #c9a84c;   /* זהב ראשי */
  --gold-light:   #e8d48a;   /* זהב בהיר (כותרות) */
  --gold-dim:     #8a6f2a;   /* זהב כהה (קווים) */
  --gold-faint:   #c9a84c18; /* רקע זהב שקוף */
  --gold-border:  #c9a84c33; /* גבול עדין */
  --gold-border2: #c9a84c55; /* גבול חזק */

  /* טקסט */
  --text1:  #f0e8d0;  /* טקסט ראשי (קרם) */
  --text2:  #9a8a6a;  /* טקסט משני */
  --text3:  #5a5070;  /* טקסט חלש */

  /* סטטוס */
  --green: #4aaf7a;
  --red:   #e05252;
  --amber: #e8a020;
}
```

### לוגו
SVG בלבד — עיגול עם גבול זהב, 3 עמודות בר + קו עקום + $:
```jsx
<svg viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="17" fill="#1a1830" stroke="url(#gold-gradient)" strokeWidth="1.5"/>
  <defs>
    <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#e8d48a"/>
      <stop offset="50%" stopColor="#c9a84c"/>
      <stop offset="100%" stopColor="#8a6f2a"/>
    </linearGradient>
    <linearGradient id="bar-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#e8d48a"/>
      <stop offset="100%" stopColor="#c9a84c"/>
    </linearGradient>
  </defs>
  <rect x="8" y="18" width="4" height="8" rx="1" fill="url(#bar-gradient)"/>
  <rect x="14" y="13" width="4" height="13" rx="1" fill="url(#bar-gradient)"/>
  <rect x="20" y="9" width="4" height="17" rx="1" fill="url(#bar-gradient)"/>
  <path d="M10 20 Q17 10 24 8" stroke="#e8d48a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
  <circle cx="24" cy="8" r="2" fill="#e8d48a"/>
</svg>
```

### כללי עיצוב
- **RTL** בכל מקום: `dir="rtl"`, `direction: rtl`
- **פונט:** System UI / Heebo
- **כל כרטיס** — `border: 1px solid var(--gold-border)`, `border-radius: 14px`
- **קו זהב בראש כרטיס:** `::before { height: 2px; background: linear-gradient(90deg, transparent, var(--gold), transparent) }`
- **אנימציית נקודה מהבהבת** לחריגות:
```css
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
.dot-red { background: var(--red); animation: blink .8s infinite; }
.dot-amber { background: var(--amber); animation: blink 1.4s infinite; }
```

---

## 3. מבנה מסכים — 8 מסכים

### Navbar (קבוע בתחתית)
```
📊 דוחות | 💎 עושר | 🏠 בית (active) | 💳 עסקאות | ⚙️ הגדרות
```
- Active item: `color: var(--gold)` + נקודה זהב מתחת
- רקע: `var(--bg2)`, גבול עליון: `var(--gold-border)`

---

### מסך 1: בית (Dashboard)

**Header:**
- שמאל: לוגו SVG (36px)
- מרכז: שם האפלקציה "כלכלת בית" בזהב בהיר
- ימין: פעמון 🔔 עם badge אדום לכמות התראות
- מתחת: ניווט חודשים — `‹ יוני 2026 ›` (לחיצה על המספר פותח grid בחירת חודש)

**רצועת שווי נקי:**
```
שווי נקי משפחתי    |    פנוי החודש
₪1,556,000         |    ₪2,290  (זהב)
↑ +₪6,133 החודש   |    חיסכון: 21% ✓ (ירוק)
```
עיצוב: `background: linear-gradient(135deg, var(--card), #221c08)`, גבול זהב כפול

**3 קופסאות:**
| הכנסות | הוצאות | נותר |
|--------|--------|------|
| ₪26,973 (זהב) | ₪6,210 (amber) | ₪2,290 (ירוק) |
| ✓ משכורות | 73% מהתקציב | 12 ימים |

**פס ניצול תקציב:**
- טקסט: "ניצול תקציב משתנות" + "73% · 12 ימים נותרו"
- Progress bar: `background: linear-gradient(90deg, var(--gold-dim), var(--gold))`

**קטגוריות תקציב (מקובצות):**

חלוקה ל-3 סקציות:
1. **חריגות** (border אדום, bg אדמדם)
2. **אזהרה** (border amber)
3. **בסדר** — מתקפל, מציג ספירה `9 קטגוריות בתקציב`

לכל קטגוריה:
- אמוג'י + שם + סכום נוכחי מתוך מתוכנן
- נקודה מהבהבת צבעונית
- כפתור פעמון 🔔/🔕 לסירוגין (toggle התראה)
- Progress bar צבעוני
- Pill: "⚠️ חרגת ב-₪220" / "נותר ₪120 · 93%"

---

### מסך 2: עסקאות

**Header:** חיפוש + פילטר

**כרטיס עסקה:**
```
🛒 שופרסל       אמש 18:42
   סופר          💳 כאל 1
                -₪287
```
- סכום: אדום (הוצאה) / ירוק (הכנסה)
- אמצעי תשלום: badge קטן (אשראי 1/2/3, מזומן, העברה, פייטר)
- עסקת אסטראי (תשלומים): badge "2/3" בזהב

**סינון:**
- חיפוש חופשי
- פילטר לפי: קטגוריה / חודש / אמצעי תשלום / סכום

**מיון:** תאריך (ברירת מחדל) / סכום / קטגוריה

---

### מסך 3: ייבוא ו-חיבור

**Tab 1: ייבוא Excel**

שלב 1: גרור קובץ או לחץ לבחירה
- `.xlsx`, `.csv` מכל חברות האשראי
- אנימציית זיהוי פורמט אוטומטי (ראה סעיף 7)

שלב 2: תצוגת Preview לפני אישור
- טבלה עם 5 שורות ראשונות
- mapping אוטומטי: תאריך / עסק / סכום / קטגוריה

שלב 3: אישור ויבוא
- "יובאו 47 עסקאות ✓"
- סימון כפילויות שזוהו

**Tab 2: חיבור בנק (Salt Edge)**

בנקים זמינים תמיד (לא נעלמים אחרי חיבור):
- בנק לאומי | בנק הפועלים | דיסקונט | מזרחי טפחות | ירושלים

כרטיסי אשראי:
- כאל | מקס | ישראכרט | ויזה כאל

לחיצה על בנק → modal אישור (עם הסבר שזה Salt Edge, ולא מאחסנים סיסמא) → WebView של Salt Edge → הצלחה + כמות עסקאות שסונכרנו

---

### מסך 4: תקציב

**חלק עליון: הוצאות קבועות**
- שכר דירה / משכנתא, חשמל, ארנונה, ביטוח, הלוואות
- `border-right: 3px solid var(--gold)` — visual indicator שזה קבוע
- לא נחשב ב-progress של משתנות

**חלק תחתון: הוצאות משתנות**
קטגוריות (לפי הגיליון של המשתמש):
```
🏠 דיור          🛒 סופר         🍔 אוכל בחוץ
🚗 רכב + דלק    💊 רפואה        💄 קוסמטיקה
👕 ביגוד         🎁 פינוקים      📱 סלולר
✈️ נופש          🎓 חינוך        🐕 חיות מחמד
💰 חיסכון        📦 שונות
```

לכל קטגוריה: input לתקציב + progress שוטף + % ניצול

כפתור + הוסף קטגוריה

---

### מסך 5: עושר נקי (Net Worth)

**סיכום ראשי:**
```
שווי נקי: ₪1,556,000
נכסים: ₪1,656,000  |  התחייבויות: ₪100,000
```

**פירוט נכסים:**
| נכס | שווי |
|-----|------|
| 💰 איילון (קרן פנסיה) | ₪XXX,XXX |
| 💰 מגדל (קרן השתלמות) | ₪XXX,XXX |
| 💰 מור (גמל להשקעה) | ₪XXX,XXX |
| 💰 אנליסט (גמל) | ₪XXX,XXX |
| 🏦 חשבון עו"ש | ₪XXX,XXX |

**התחייבויות:**
| | |
|--|--|
| 🚗 הלוואת רכב | ₪100,000 נותר |
| | ₪2,100/חודש · מסתיים 03/2030 |

**סימולטור יעד:**
- input: "אני רוצה להגיע ל-₪2,000,000"
- חישוב: "בעוד 8 חודשים עם קצב חיסכון נוכחי"

**גרף מגמה:** נטו-וורת' לאורך 12 חודשים (line chart)

---

### מסך 6: דוחות

**Tab ראשי:** סקירה / תובנות / השוואה / ייצוא

**סקירה:**
- Pie chart — התפלגות הוצאות לפי קטגוריה (החודש)
- Bar chart — הכנסות vs הוצאות (6 חודשים)
- Line chart — נטו-וורת' בזמן

**תובנות:**
- "החודש הוצאת 32% יותר על אוכל בחוץ מהממוצע"
- "משכורת אורי הגיעה ב-28 לחודש (יום מוקדם יותר מהרגיל)"
- "שיעור החיסכון ירד מ-23% ל-21%"

**השוואה:** חודש נוכחי vs חודש קודם / ממוצע שנתי

**ייצוא:**
- כפתור "ייצוא לאקסל" → מוריד `.xlsx` עם כל העסקאות + גרפים
- SheetJS לבניית הקובץ

---

### מסך 7: הוספת עסקה

Form פשוט:
- סכום (מקלדת מספרים, גדול ובולט)
- תאריך (ברירת מחדל: היום)
- קטגוריה (dropdown עם אמוג'ים)
- עסק / תיאור
- אמצעי תשלום (אשראי 1/2/3 / מזומן / העברה / פייטר / צ'ק)
- תשלומים? toggle → אם כן: "תשלום מס' X מתוך Y"
- מי שילם: אורי / אפק / ביחד

---

### מסך 8: הגדרות

```
👤 פרופיל משפחתי
   אורי הראל 💞 אפק הראל
   "משפחת הראל"

💰 פיננסי
   הכנסות חודשיות → sub-screen:
     אורי:  ₪14,200
     אפק:   ₪12,773
     סה"כ:  ₪26,973
   אמצעי תשלום
   קטגוריות
   מטבע ושפה

🔗 חיבורים
   בנק לאומי (מחובר ✓)
   בוט WhatsApp (פעיל ✓)
   Google Sheets (toggle — כבוי)

🔔 התראות
   עסקה חדשה (on)
   חריגה מתקציב (on)
   משכורת נכנסה (on)
   סיכום שבועי (off)

🎨 מראה
   מצב כהה (on)
   הצגת סכומים (on)

💾 דאטה וגיבוי
   ייצוא לאקסל
   גיבוי אוטומטי

⚠️ אזור מסוכן
   נתק בנק
   מחק את כל הנתונים
```

---

## 4. Firebase Schema

```
/users/{userId}
  name: string
  email: string
  householdId: string
  salary: number

/households/{householdId}
  name: "משפחת הראל"
  members: [userId1, userId2]
  currency: "ILS"
  monthlyIncome: 26973

/transactions/{txId}
  householdId: string
  amount: number          // שלילי = הוצאה
  merchant: string
  category: string
  date: Timestamp
  paymentMethod: string   // "credit1" | "credit2" | "credit3" | "cash" | "transfer" | "paybox" | "check"
  paidBy: string          // userId
  isInstallment: boolean
  installmentNumber: number
  installmentTotal: number
  source: string          // "manual" | "excel-import" | "whatsapp-bot" | "salt-edge"
  dedupHash: string       // לבדיקת כפילויות

/budgets/{householdId}/{year-month}
  categories: {
    [categoryName]: {
      planned: number
      isFixed: boolean
    }
  }

/netWorth/{householdId}/{year-month}
  assets: {
    ayalon: number
    migdal: number
    mor: number
    analyst: number
    bankAccount: number
  }
  liabilities: {
    carLoan: number
  }
  total: number
```

---

## 5. תיקוני באגים חובה

### באג #1 — גיבריש בייבוא CSV (עברית Windows-1255)

```js
// src/utils/fileImport.js
export async function readFileWithEncoding(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 3));

  // זיהוי BOM
  const isUTF8BOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;

  if (isUTF8BOM) {
    return new TextDecoder('utf-8').decode(buffer);
  }

  // נסה UTF-8 — אם יש תווי שאלה → עבור ל-windows-1255
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (utf8.includes('�') || countQuestionMarks(utf8) > 5) {
    return new TextDecoder('windows-1255').decode(buffer);
  }

  return utf8;
}

function countQuestionMarks(str) {
  return (str.match(/\?/g) || []).length;
}
```

### באג #2 — תאריכים הפוכים (DD/MM/YYYY → JS Date)

```js
// src/utils/dateUtils.js
export function parseIsraeliDate(dateStr) {
  // תומך: DD/MM/YYYY | DD.MM.YYYY | DD-MM-YYYY
  const [d, m, y] = dateStr.split(/[\/\.\-]/).map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
}
```

### באג #3 — כפילויות (Excel + WhatsApp + בנק)

```js
// src/utils/dedup.js
export function generateTxHash(tx) {
  const dateStr = tx.date.toISOString().split('T')[0];
  const merchantClean = tx.merchant.trim().slice(0, 8).toLowerCase();
  const amount = Math.abs(tx.amount).toFixed(0);
  return `${dateStr}_${amount}_${merchantClean}`;
}

// לפני שמירה ל-Firestore:
const hash = generateTxHash(tx);
const existing = await db.collection('transactions')
  .where('householdId', '==', householdId)
  .where('dedupHash', '==', hash)
  .limit(1).get();

if (!existing.empty) return; // כפילות — לא שומרים
```

### באג #4 — RTL + סימן ₪

```jsx
// תמיד לעטוף סכומים ב-dir="ltr"
<span dir="ltr">₪{amount.toLocaleString('he-IL')}</span>

// הוצאה vs הכנסה
const color = amount < 0 ? 'var(--red)' : 'var(--green)';
const display = `${amount < 0 ? '-' : '+'}₪${Math.abs(amount).toLocaleString('he-IL')}`;
```

---

## 6. זיהוי פורמט Excel אוטומטי

כל חברת אשראי מייצאת קובץ עם headers שונים:

```js
// src/utils/formatDetector.js
const FORMATS = {
  cal: {
    name: 'כאל',
    detect: (headers) => headers.some(h => h.includes('כאל') || h.includes('CAL')),
    mapping: { date: 'תאריך עסקה', merchant: 'שם בית עסק', amount: 'סכום חיוב' }
  },
  max: {
    name: 'מקס',
    detect: (headers) => headers.some(h => h.includes('מקס') || h.includes('MAX')),
    mapping: { date: 'תאריך', merchant: 'בית עסק', amount: 'סכום' }
  },
  isracard: {
    name: 'ישראכרט',
    detect: (headers) => headers.some(h => h.includes('ישראכרט')),
    mapping: { date: 'תאריך רכישה', merchant: 'שם בית העסק', amount: 'סכום עסקה' }
  },
  discount: {
    name: 'דיסקונט',
    detect: (headers) => headers.some(h => h.includes('דיסקונט') || h.includes('DISCOUNT')),
    mapping: { date: 'תאריך', merchant: 'פרטי העסקה', amount: 'זכות/חובה' }
  }
};

export function detectFormat(headers) {
  for (const [key, format] of Object.entries(FORMATS)) {
    if (format.detect(headers)) return { key, ...format };
  }
  return null; // פורמט לא מזוהה — בקש מהמשתמש לבחור ידנית
}
```

---

## 7. WhatsApp Bot → Firebase

הבוט כבר קורא SMS מהבנק. צריך להוסיף שורות אלה לקוד הבוט הקיים:

```js
// בקוד הבוט — אחרי שמנתחים הודעת SMS:
const admin = require('firebase-admin');
const db = admin.firestore();

async function saveTxToFirebase(parsedTx) {
  const hash = generateTxHash(parsedTx);

  // בדיקת כפילות
  const existing = await db.collection('transactions')
    .where('dedupHash', '==', hash).limit(1).get();

  if (!existing.empty) return;

  await db.collection('transactions').add({
    ...parsedTx,
    source: 'whatsapp-bot',
    householdId: 'harel-family',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
```

---

## 8. Push Notifications (Firebase Cloud Messaging)

```js
// src/notifications.js
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const messaging = getMessaging();
  const token = await getToken(messaging, {
    vapidKey: process.env.VITE_FIREBASE_VAPID_KEY
  });

  // שמור token ב-Firestore
  await saveUserToken(token);
  return token;
}

// onMessage — כשהאפלקציה פתוחה
onMessage(getMessaging(), (payload) => {
  showInAppNotification(payload);
});
```

**public/firebase-messaging-sw.js** (Service Worker):
```js
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({ /* config */ });
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/logo192.png'
  });
});
```

**סוגי notifications לשלוח:**
- עסקה חדשה: "🛒 שופרסל — ₪287"
- חריגה: "⚠️ חרגת בקטגוריית אוכל בחוץ"
- משכורת: "💰 משכורת אורי נכנסה — ₪14,200"
- סיכום שבועי (ראשון): "📊 הוצאתם ₪4,210 השבוע"

---

## 9. PWA Setup (במקום חנות)

### vite.config.js
```js
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'כלכלת בית',
        short_name: 'כלכלת בית',
        description: 'ניהול פינאנסי פרימיום למשפחה',
        theme_color: '#1a1830',
        background_color: '#1a1830',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'he',
        dir: 'rtl',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
}
```

### package.json — הוסף:
```bash
npm install vite-plugin-pwa -D
```

---

## 10. ניווט חודשים — אופציה B

```jsx
function MonthNav({ current, onChange }) {
  const [showGrid, setShowGrid] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => onChange(-1)}>‹</button>
        <span onClick={() => setShowGrid(!showGrid)} style={{ cursor: 'pointer' }}>
          {formatMonth(current)}
        </span>
        <button onClick={() => onChange(+1)}>›</button>
      </div>

      {showGrid && (
        <div className="month-grid"> {/* grid 4x3 של כל חודשי השנה */}
          {MONTHS.map(m => (
            <div key={m} onClick={() => { onChange(m); setShowGrid(false); }}>
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 11. אנימציות נדרשות

- **Skeleton loading** בכל כרטיס בטעינה ראשונה (shimmer זהב)
- **Slide in מימין** כשנכנסים ל-sub-screen (הגדרות → הכנסות)
- **Toast notification** לאחר ייבוא Excel ("יובאו 47 עסקאות ✓")
- **Confetti** כשמגיעים ליעד חיסכון 🎉
- **Progress bar** מתמלא בהדרגה בטעינה

---

## 12. מידע ספציפי למשפחה

```js
// src/data/household.js
export const HOUSEHOLD = {
  id: 'harel-family',
  name: 'משפחת הראל',
  members: {
    uri: { name: 'אורי הראל', salary: 14200, color: '#4aaf7a' },
    afek: { name: 'אפק הראל', salary: 12773, color: '#6a9acc' }
  },
  totalIncome: 26973,
  savingsRate: 0.21,
  savingsMonthly: 5633,
  carLoan: {
    remaining: 100000,
    monthlyPayment: 2100,
    endDate: '2030-03'
  },
  savingsFunds: ['איילון', 'מגדל', 'מור', 'אנליסט'],
  paymentMethods: ['אשראי 1', 'אשראי 2', 'אשראי 3', 'מזומן', 'העברה בנקאית', 'פייטר', "צ'ק"]
};

export const BUDGET_CATEGORIES = [
  { id: 'housing', name: 'דיור', emoji: '🏠', isFixed: true, default: 5000 },
  { id: 'grocery', name: 'סופר', emoji: '🛒', isFixed: false, default: 1800 },
  { id: 'dining', name: 'אוכל בחוץ', emoji: '🍔', isFixed: false, default: 600 },
  { id: 'car', name: 'רכב + דלק', emoji: '🚗', isFixed: false, default: 900 },
  { id: 'medical', name: 'רפואה', emoji: '💊', isFixed: false, default: 500 },
  { id: 'cosmetics', name: 'קוסמטיקה', emoji: '💄', isFixed: false, default: 500 },
  { id: 'clothing', name: 'ביגוד', emoji: '👕', isFixed: false, default: 500 },
  { id: 'treats', name: 'פינוקים', emoji: '🎁', isFixed: false, default: 400 },
  { id: 'mobile', name: 'סלולר', emoji: '📱', isFixed: true, default: 200 },
  { id: 'vacation', name: 'נופש', emoji: '✈️', isFixed: false, default: 1000 },
  { id: 'education', name: 'חינוך', emoji: '🎓', isFixed: false, default: 300 },
  { id: 'pets', name: 'חיות מחמד', emoji: '🐕', isFixed: false, default: 400 },
  { id: 'savings', name: 'חיסכון', emoji: '💰', isFixed: true, default: 5633 },
  { id: 'other', name: 'שונות', emoji: '📦', isFixed: false, default: 500 }
];
```

---

## 13. רצף הפיתוח המומלץ לקלוד קוד

**שלב 1 — תשתית (יום 1-2):**
1. הגדר Design System (CSS variables)
2. צור Logo SVG component
3. צור Navbar component
4. הגדר Firebase schema + rules
5. הגדר routing (React Router)

**שלב 2 — מסכים ראשיים (יום 3-5):**
1. Dashboard (מסך בית)
2. Transactions (עסקאות)
3. Budget (תקציב)

**שלב 3 — ייבוא נתונים (יום 6-7):**
1. Excel import + encoding fix
2. Format auto-detection
3. Deduplication

**שלב 4 — פיצ'רים מתקדמים (יום 8-10):**
1. Net Worth מסך
2. Reports + charts
3. Push notifications
4. PWA setup

**שלב 5 — הגמרה (יום 11):**
1. Settings מסך
2. Animations + skeleton loading
3. Testing on mobile

---

## 14. Dependencies נדרשות

```bash
npm install firebase
npm install react-router-dom
npm install recharts              # גרפים
npm install xlsx                  # SheetJS לייבוא Excel
npm install date-fns              # עיבוד תאריכים
npm install vite-plugin-pwa -D    # PWA
```

---

*מסמך זה נוצר על ידי Claude · כלכלת בית · גרסה 1.0 · 2026*
