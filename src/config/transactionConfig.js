// ─── Fix #5: Decoupled config — all family-specific mappings live here ──────
// To add a new user, edit SENDER_PATTERNS only. The hook stays untouched.

export const SENDER_PATTERNS = [
  { user: 'uri',  match: (s) => s.includes('אורי') || s.includes('uri')  || s.includes('ori')  },
  { user: 'afek', match: (s) => s.includes('אפק')  || s.includes('afek')                        },
]

export function mapSender(sender) {
  if (!sender) return 'family'
  const s = sender.toLowerCase()
  for (const { user, match } of SENDER_PATTERNS) {
    if (match(s)) return user
  }
  return 'family'
}

export const CAT_MAP = {
  // English IDs (from bot / Cal import)
  super:'super', car:'car', bills:'bills', insurance:'insurance',
  dining:'dining', bigud:'bigud', education:'education', health:'health',
  transport:'transport', home:'home', pampering:'pampering', cosmet:'cosmet',
  children:'children', savings:'savings', charity:'charity', events:'events',
  other:'other', salary_uri:'salary_uri', salary_afek:'salary_afek', other_in:'other_in',
  // Legacy English IDs (backward compat)
  grocery:'super', fuel:'car', clothing:'bigud', recreation:'pampering',
  salary:'salary_uri', freelance:'other_in',
  // Hebrew labels (from Google Sheets Comet tab)
  'סופר':'super', 'רכב + דלק':'car', 'חשבונות':'bills', 'ביטוחים':'insurance',
  'אוכל בחוץ':'dining', 'ביגוד':'bigud', 'לימודים':'education', 'רפואה':'health',
  'תחבורה':'transport', 'הוצאות בית':'home', 'ספורט':'pampering', 'פינוקים':'pampering',
  'קוסמטיקה':'cosmet', 'מסגרות ילדים':'children', 'חסכון':'savings', 'צדקה':'charity',
  'אירועים ומתנות':'events', 'אחר':'other', 'משכורת אורי':'salary_uri',
  'משכורת אפק':'salary_afek', 'הכנסה אחרת':'other_in',
  // Legacy Hebrew labels
  'דלק':'car', 'ביטוח':'insurance', 'מסעדות':'dining', 'חינוך':'education',
  'בריאות':'health', 'בית':'home', 'בילויים':'pampering', 'משכורת':'salary_uri',
}
