// הגדרות החיבור ל-Supabase. ממלאים מתוך Supabase → Project Settings → API.
// המפתח הזה (anon / publishable) ציבורי מטבעו: האבטחה נעשית בהרשאות שבמסד הנתונים (supabase.sql).
window.ELA_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',
  GOOGLE_LOGIN: true, // false = כניסה רק עם קישור במייל
};
