-- Add missing columns to emergency_alerts table for iOS compatibility with Android
-- Execute this in Supabase SQL Editor

-- Add radius_meters column (used by Android app)
ALTER TABLE emergency_alerts 
ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 3000;

-- Add name column (for user identification)
ALTER TABLE emergency_alerts 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add phone column (for contact information)
ALTER TABLE emergency_alerts 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add h3_index column (for geospatial indexing)
ALTER TABLE emergency_alerts 
ADD COLUMN IF NOT EXISTS h3_index TEXT;

-- Add index on h3_index for faster geospatial queries
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_h3_index ON emergency_alerts(h3_index);

-- Add index on radius_meters for range queries
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_radius ON emergency_alerts(radius_meters);

-- Verify the updated schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'emergency_alerts'
ORDER BY ordinal_position;
