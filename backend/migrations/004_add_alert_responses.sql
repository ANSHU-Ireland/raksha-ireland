-- Migration: Add alert_responses table
-- Purpose: Track which users have responded to emergency alerts

CREATE TABLE IF NOT EXISTS alert_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  message TEXT,
  eta_minutes INTEGER,
  
  -- Indexes
  UNIQUE(alert_id, responder_id), -- Prevent duplicate responses
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_alert_responses_alert_id ON alert_responses(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_responses_responder_id ON alert_responses(responder_id);

-- Add responder_count column to emergency_alerts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'emergency_alerts' AND column_name = 'responder_count'
  ) THEN
    ALTER TABLE emergency_alerts ADD COLUMN responder_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Update existing alerts to have correct responder count
UPDATE emergency_alerts ea
SET responder_count = (
  SELECT COUNT(*) 
  FROM alert_responses ar 
  WHERE ar.alert_id = ea.id
)
WHERE responder_count = 0;
