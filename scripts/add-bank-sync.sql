-- Run this in Supabase SQL Editor
-- Adds external_id column for bank sync deduplication

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS external_id text;

-- Unique constraint so upsert can deduplicate by external_id
CREATE UNIQUE INDEX IF NOT EXISTS transactions_external_id_key
  ON transactions (external_id)
  WHERE external_id IS NOT NULL;
