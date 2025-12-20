-- Fix users table status constraint to allow pending, activated, deactivated
-- Execute this in Supabase SQL Editor with service role permissions

-- Drop the existing constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_status_check;

-- Add new constraint with correct values
ALTER TABLE public.users 
ADD CONSTRAINT users_status_check 
CHECK (status IN ('pending', 'activated', 'deactivated'));

-- Set default status to pending for new users
ALTER TABLE public.users 
ALTER COLUMN status SET DEFAULT 'pending';

-- Verify the constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname = 'users_status_check';

SELECT '✅ Users status constraint fixed! Allowed values: pending, activated, deactivated' as message;
