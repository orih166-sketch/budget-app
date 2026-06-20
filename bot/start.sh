#!/bin/bash
# WhatsApp Bot — run script
# Usage: bash bot/start.sh

cd "$(dirname "$0")/.."

echo ""
echo "🤖  WhatsApp Budget Bot"
echo "─────────────────────────────────────"

# Load .env to display config (not exported to child — node handles it)
SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d= -f2)
HOUSEHOLD_ID=$(grep HOUSEHOLD_ID .env | cut -d= -f2)
ALLOWED=$(grep ALLOWED_NUMBER .env | cut -d= -f2)
HAS_KEY=$(grep -c SUPABASE_SERVICE_KEY .env 2>/dev/null || echo 0)

echo "📡  Supabase:      $SUPABASE_URL"
echo "🏠  Household:     $HOUSEHOLD_ID"
echo "📱  מספר מורשה:    $ALLOWED"
if [ "$HAS_KEY" -gt 0 ]; then
  echo "🔑  Service Key:   ✅ מוגדר"
else
  echo "🔑  Service Key:   ⚠️  חסר — משתמש ב-Anon Key"
fi
echo "─────────────────────────────────────"
echo ""

if [ "$ALLOWED" = "972501234567" ]; then
  echo "❌  עדיין מספר ברירת מחדל. ערוך את .env:"
  echo "    ALLOWED_NUMBER=972XXXXXXXXX"
  echo ""
  exit 1
fi

echo "🚀  מפעיל בוט... סרוק את ה-QR שיופיע"
echo ""

node --env-file=.env bot/whatsapp-bot.js
