-- ================================================================
-- כלכלת בית — מיגרציה: טבלאות התראות חכמות
-- הרץ בדשבורד Supabase → SQL Editor → New Query → הדבק והרץ
-- ================================================================

-- טבלת תור WhatsApp / Push
CREATE TABLE IF NOT EXISTS public.pending_notifications (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid         REFERENCES public.households(id) ON DELETE CASCADE,
  type         text         NOT NULL,   -- 'budget_alert' | 'recurring_reminder' | 'weekly_summary'
  message      text         NOT NULL,
  sent_at      timestamptz,             -- מתמלא אחרי שהבוט שולח
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

-- טבלת FCM tokens לפוש נוטיפיקיישן
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

SELECT 'Done! pending_notifications + fcm_tokens created.' AS result;
