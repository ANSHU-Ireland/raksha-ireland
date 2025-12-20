-- Fix users table ID column to auto-generate UUIDs
-- Execute this in Supabase SQL Editor with service role permissions

-- First, check if the users table exists and what its structure is
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- If id column doesn't have a default, set it to auto-generate UUIDs
ALTER TABLE public.users 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the change
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'users' 
AND column_name = 'id';

-- Also ensure the table has proper indexes
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

SELECT '✅ Users table ID column fixed successfully!' as message;
