-- Fix emergency_alerts table ID column to auto-generate UUIDs
-- Execute this in Supabase SQL Editor if the id column doesn't have a default

-- Set default UUID generation for id column
ALTER TABLE emergency_alerts 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the change
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'emergency_alerts' 
AND column_name = 'id';
