#!/bin/bash
cd "$(dirname "$0")"

echo "=== שלב 1: יצירת טבלאות Supabase להתראות ==="
node scripts/setup-notifications-db.js
echo ""

echo "=== שלב 2: commit + push ל-GitHub ==="
git add -A
git commit -m "feat: smart notifications - budget alerts, recurring reminders, weekly summary" || echo "(no new commits)"
git push origin main
echo ""

echo "✅ הכל עלה! Vercel יפרס אוטומטית תוך ~30 שניות."
echo "כתובת: https://kalkalet-bait.vercel.app"
read -p "לחץ Enter לסגירה..."
