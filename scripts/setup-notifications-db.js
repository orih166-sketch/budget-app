/**
 * setup-notifications-db.js
 * יוצר טבלאות pending_notifications + fcm_tokens בסופאבייס
 * רץ אוטומטית מ-push.command
 */
import { createClient } from '@supabase/supabase-js'
import https from 'https'

const SUPABASE_URL        = 'https://tiyaxhovletymvsgqvgh.supabase.co'
const SUPABASE_ANON_KEY   = 'sb_publishable_vyzPFG1BGBejn0M_pz06MQ_eGnk_cp9'
const SUPABASE_SERVICE_KEY= 'sb_secret_dl0__1l7BNvZEPY9t4BQAg_iK1vqUlq'

// Use Management API with service key via direct pg connection
// We'll create an RPC function first, then call it, then drop it
const sql = `
CREATE TABLE IF NOT EXISTS public.pending_notifications (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid         REFERENCES public.households(id) ON DELETE CASCADE,
  type         text         NOT NULL,
  message      text         NOT NULL,
  sent_at      timestamptz,
  created_at   timestamptz  DEFAULT now()
);
ALTER TABLE public.pending_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pending_notifications' AND policyname='anon insert notif') THEN
    EXECUTE 'CREATE POLICY "anon insert notif" ON public.pending_notifications FOR INSERT TO anon WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pending_notifications' AND policyname='anon select notif') THEN
    EXECUTE 'CREATE POLICY "anon select notif" ON public.pending_notifications FOR SELECT TO anon USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pending_notifications' AND policyname='anon update notif') THEN
    EXECUTE 'CREATE POLICY "anon update notif" ON public.pending_notifications FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      text         NOT NULL,
  household_id uuid         REFERENCES public.households(id) ON DELETE CASCADE,
  token        text         UNIQUE NOT NULL,
  updated_at   timestamptz  DEFAULT now()
);
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fcm_tokens' AND policyname='anon all fcm') THEN
    EXECUTE 'CREATE POLICY "anon all fcm" ON public.fcm_tokens FOR ALL TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;
`

async function runSQL() {
  // Step 1: Create a temporary RPC function via REST (using service key as anon — trick)
  // Actually: use the pg query endpoint via Management REST API
  const projectRef = 'tiyaxhovletymvsgqvgh'

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const options = {
      hostname: 'api.supabase.com',
      path:     `/v1/projects/${projectRef}/database/query`,
      method:   'POST',
      headers:  {
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
        // Try with service key as bearer (project management token)
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }

    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// Alternative: use Supabase JS client + rpc to exec SQL
// This requires a pg_execute or exec_sql function to exist
async function tryViaClient() {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Try calling a built-in function
  const { data, error } = await sb.rpc('exec_sql', { query: sql })
  return { data, error }
}

async function main() {
  console.log('🔧 יוצר טבלאות Supabase להתראות חכמות...')

  // Try Management API first
  try {
    const result = await runSQL()
    console.log('Management API status:', result.status)
    if (result.status === 200 || result.status === 201) {
      console.log('✅ טבלאות נוצרו בהצלחה!')
      return
    }
    console.log('Response:', result.body.slice(0, 200))
  } catch (e) {
    console.log('Management API error:', e.message)
  }

  // Try via Supabase client RPC
  try {
    const result = await tryViaClient()
    if (!result.error) {
      console.log('✅ טבלאות נוצרו דרך RPC!')
      return
    }
    console.log('RPC error:', result.error.message)
  } catch (e) {
    console.log('RPC error:', e.message)
  }

  console.log('\n⚠️  לא הצלחתי ליצור טבלאות אוטומטית.')
  console.log('פתח: https://supabase.com/dashboard/project/tiyaxhovletymvsgqvgh/sql/new')
  console.log('והרץ את הקובץ: supabase-notifications-migration.sql')
}

main().catch(console.error)
