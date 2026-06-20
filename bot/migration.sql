-- Migration: ensure transactions table supports WhatsApp bot imports
-- Run this once in Supabase SQL Editor

-- The transactions table likely already exists.
-- This adds the external_id unique constraint if missing.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_external_id_key
  ON transactions (external_id)
  WHERE external_id IS NOT NULL;

-- If you need to create the table from scratch:
-- CREATE TABLE IF NOT EXISTS transactions (
--   id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   household_id  UUID NOT NULL,
--   family_id     UUID,
--   date          DATE NOT NULL,
--   description   TEXT NOT NULL,
--   amount        NUMERIC(12,2) NOT NULL,
--   type          TEXT NOT NULL CHECK (type IN ('income','expense')),
--   category_id   TEXT DEFAULT 'other',
--   member        TEXT DEFAULT 'family',
--   external_id   TEXT UNIQUE,
--   created_at    TIMESTAMPTZ DEFAULT now()
-- );
--
-- CREATE INDEX ON transactions (household_id, date DESC);
