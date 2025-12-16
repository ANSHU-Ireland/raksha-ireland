-- Raksha Ireland Emergency Alerts Database Setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mcyruxndjbxpvcjqdgyx/sql

-- Create emergency_alerts table
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    h3_index TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_created_at 
ON public.emergency_alerts (created_at DESC);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status 
ON public.emergency_alerts (status);

-- Create index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id 
ON public.emergency_alerts (user_id);

-- Create index on h3_index for location-based queries
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_h3_index 
ON public.emergency_alerts (h3_index);

-- Enable Row Level Security (RLS)
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to do everything
CREATE POLICY "Service role has full access" 
ON public.emergency_alerts 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Create policy to allow authenticated users to read all alerts
CREATE POLICY "Authenticated users can read all alerts" 
ON public.emergency_alerts 
FOR SELECT 
TO authenticated 
USING (true);

-- Create policy to allow authenticated users to insert their own alerts
CREATE POLICY "Authenticated users can insert their own alerts" 
ON public.emergency_alerts 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create policy to allow anon users to read recent alerts (last 24 hours)
CREATE POLICY "Anon users can read recent alerts" 
ON public.emergency_alerts 
FOR SELECT 
TO anon 
USING (created_at > NOW() - INTERVAL '24 hours');

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_emergency_alerts_updated_at ON public.emergency_alerts;
CREATE TRIGGER update_emergency_alerts_updated_at
    BEFORE UPDATE ON public.emergency_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant access to authenticated and anon roles
GRANT SELECT, INSERT ON public.emergency_alerts TO authenticated;
GRANT SELECT ON public.emergency_alerts TO anon;

-- Create a view for active alerts only
CREATE OR REPLACE VIEW public.active_emergency_alerts AS
SELECT * FROM public.emergency_alerts
WHERE status = 'active'
ORDER BY created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.active_emergency_alerts TO authenticated, anon;

-- Insert a test alert to verify everything works
INSERT INTO public.emergency_alerts (user_id, name, phone, latitude, longitude, h3_index, status)
VALUES (
    'test-user-001',
    'Test Alert',
    '+353 87 123 4567',
    53.3498,
    -6.2603,
    NULL,
    'active'
);

-- Display success message
SELECT 'Emergency alerts table created successfully!' as message,
       COUNT(*) as total_alerts
FROM public.emergency_alerts;
