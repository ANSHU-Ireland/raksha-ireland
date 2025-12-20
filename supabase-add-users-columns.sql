-- Add missing columns to users table to support backend features
-- Execute this in Supabase SQL Editor (Project > SQL) with service role permissions

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS temp_password_hash TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS logged_in_device_id TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMPTZ;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Optional: store ID document path in storage if needed
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS id_document_path TEXT;

-- Indexes for frequent lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
