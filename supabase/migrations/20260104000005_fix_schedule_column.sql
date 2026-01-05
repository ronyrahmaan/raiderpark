-- Migration: Fix Schedule Column
-- The schedule column should default to an empty object {}, not an empty array []
-- Schedule structure is: { "monday": { "classes": [...] }, ... }

-- Update the default value for schedule column
ALTER TABLE users
ALTER COLUMN schedule SET DEFAULT '{}'::jsonb;

-- Fix any existing rows that have the incorrect empty array default
UPDATE users
SET schedule = '{}'::jsonb
WHERE schedule = '[]'::jsonb;

-- Add a check constraint to ensure schedule is an object, not an array
ALTER TABLE users
ADD CONSTRAINT schedule_is_object
CHECK (jsonb_typeof(schedule) = 'object' OR schedule IS NULL);

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Schedule column fixed: default changed from [] to {}';
END $$;
