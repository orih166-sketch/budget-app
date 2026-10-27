# אלה בטבע – גרסת Vercel + Supabase

אותה מערכת בדיוק, באותו עיצוב ועם אותן פעולות. ההבדל הוא איפה היא רצה:

- **האתר** מתארח ב־**Vercel**, בכתובת קבועה כמו `ela-batevaa.vercel.app`.
- **הנתונים** (לקוחות, מכירות, מלאי והגדרות) והקבלות ב־PDF נשמרים ב־**Supabase**, במסד נתונים מאובטח.
- **כניסה** עם Google או עם קישור שנשלח למייל. רק כתובות שנמצאות ברשימת `allowed_users` במסד הנתונים יכולות להיכנס.

שני השירותים חינמיים בהיקף שהעסק צריך.

---

## שלב 1: Supabase (מסד הנתונים)

> מומלץ לפתוח את חשבון ה־Supabase **עם המייל של אלה** (`elah262@gmail.com`). כך הנתונים שייכים לה, וקישור הכניסה במייל יעבוד לה מיד. בלי הגדרת שרת מייל משלכם, Supabase שולחת מיילים רק לחברי הצוות של הפרויקט.

1. נכנסים ל־[supabase.com](https://supabase.com) ← **Start your project** ← התחברות עם Google.
2. **New project**:
   - Name: `ela-batevaa`
   - Region: **Central EU (Frankfurt)**
   - Database password: בוחרים סיסמה ושומרים אותה במקום בטוח.
3. כשהפרויקט מוכן: בתפריט בצד **SQL Editor** ← **New query** ← מדביקים את כל התוכן של הקובץ [`supabase.sql`](./supabase.sql) ← **Run**. אמורה להופיע ההודעה `Success`.
4. **Project Settings** (⚙️) ← **API** (או **Data API**). מעתיקים שני ערכים:
   - **Project URL**, למשל `https://abcd1234.supabase.co`
   - **anon public** key. אם מופיע **Publishable key**, לוקחים אותו.
5. שולחים לי את שני הערכים ואכניס אותם לקובץ `config.js`. אפשר גם לערוך אותו לבד. אין סכנה בשיתוף שני הערכים האלה: הם מיועדים להיות ציבוריים, והאבטחה נעשית בהרשאות שבמסד הנתונים. את **service_role** key לא משתפים אף פעם.

## שלב 2: Vercel (האתר)

1. נכנסים ל־[vercel.com](https://vercel.com) עם החשבון שמחובר ל־GitHub.
2. **Add New…** ← **Project** ← מייבאים את ה־repo `budget-app`.
3. לפני שלוחצים Deploy:
   - **Project Name:** `ela-batevaa`
   - **Root Directory:** לוחצים **Edit** ובוחרים `ela-batevaa/web`
   - **Framework Preset:** `Other`. אין Build Command ואין Install Command.
4. **Deploy**. בסוף מתקבלת כתובת, למשל `https://ela-batevaa.vercel.app`.

> Vercel מפרסם כברירת מחדל מה־branch `main`. אם הקוד עדיין לא מוזג ל־`main`, צריך למזג אותו או לבחור את ה־branch בהגדרות הפרויקט ב־Vercel.

## שלב 3: חיבור בין השניים

ב־Supabase: **Authentication** ← **URL Configuration**:
- **Site URL:** הכתובת מ־Vercel, למשל `https://ela-batevaa.vercel.app`
- **Redirect URLs** ← **Add URL:** אותה כתובת

## שלב 4 (רשות): כניסה עם Google

עד שהשלב הזה מוגדר, נכנסים עם **"שליחת קישור כניסה למייל"**. אם רוצים כניסה בלחיצה עם Google:

1. נכנסים ל־[console.cloud.google.com](https://console.cloud.google.com) ← יוצרים פרויקט חדש.
2. **APIs & Services** ← **OAuth consent screen**:
   - User type: **External**
   - App name: "אלה בטבע"
   - Support email: המייל של אלה
   - בסוף לוחצים **Publish app**.
3. **Credentials** ← **Create credentials** ← **OAuth client ID** ← סוג: **Web application**.
   - ב־**Authorized redirect URIs** מוסיפים: `https://<Project-URL-שלכם>/auth/v1/callback`
4. מעתיקים את **Client ID** ואת **Client secret**.
5. ב־Supabase: **Authentication** ← **Providers** ← **Google** ← מפעילים ומדביקים את שני הערכים ← **Save**.

אם מחליטים לוותר על Google, מגדירים בקובץ `config.js`: `GOOGLE_LOGIN: false`. הכפתור ייעלם וישארו רק כניסות עם קישור במייל.

## שלב 5: בטלפון של אלה

פותחים את כתובת ה־Vercel ונכנסים. אחר כך:
- **iPhone:** שיתוף ← **הוספה למסך הבית**
- **Android:** תפריט ⋮ ← **הוספה למסך הבית**

האפליקציה תופיע עם האייקון של הלוגו.

---

## הוספת משתמש נוסף (למשל מפתח)

ב־Supabase ← **SQL Editor** מריצים:
```sql
insert into public.allowed_users (email) values ('someone@gmail.com');
```
המשתמש הנוסף יראה ויוכל לערוך את כל נתוני העסק.

## גיבוי

ב־Supabase: **Table Editor** ← `records` ← **Export** ← CSV. במערכת עצמה יש גם ייצוא של ההכנסות וההוצאות לרואה החשבון.

## למפתחים

- `index.html`: נוצר מ־`../src` על ידי `node ../scripts/build.mjs`. לא עורכים אותו ידנית.
- `api.js`: שכבת הנתונים מול Supabase. היא חושפת את אותן פונקציות כמו `Code.gs`, ולכן הממשק (`src/App.html`) משותף לשתי הגרסאות.
- `supabase.sql`: הטבלאות, ההרשאות (RLS), מספור קבלות אטומי, עדכון מלאי אטומי ותיקיית הקבלות הפרטית.
- `config.js`: כתובת ומפתח ציבורי של Supabase.
