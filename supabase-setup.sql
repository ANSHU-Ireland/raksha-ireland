-- ============================================================
-- Raksha Ireland - Complete Database Setup
-- Project: vobpumyuutgybakbyavd
-- Run this ONCE in Supabase SQL Editor for a fresh project
-- https://supabase.com/dashboard/project/vobpumyuutgybakbyavd/sql
-- ============================================================

-- ============================================================
-- SHARED TRIGGER FUNCTION (auto-update updated_at)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: users
-- Stores registered app users (managed by backend + mobile)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    full_name       TEXT,
    phone_number    TEXT,
    -- status lifecycle: pending → activated | deactivated
    -- 'active' / 'approved' used by direct mobile inserts
    -- 'rejected' set by admin /reject-user endpoint
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'approved', 'activated', 'deactivated', 'rejected')),
    role            TEXT NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user', 'admin', 'responder')),
    -- Auth fields (backend managed)
    temp_password_hash    TEXT,
    logged_in_device_id   TEXT,
    last_login_at         TIMESTAMPTZ,
    last_logout_at        TIMESTAMPTZ,
    approved_at           TIMESTAMPTZ,
    activated_at          TIMESTAMPTZ,
    -- Profile fields
    profile_image         TEXT,          -- storage path or full URL
    id_document_path      TEXT,          -- uploaded ID doc path
    -- Extra flags
    verification_status   TEXT DEFAULT 'unverified',
    location_enabled      BOOLEAN DEFAULT true,
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes on users
CREATE INDEX IF NOT EXISTS idx_users_email  ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users (status);

-- Trigger: keep updated_at current
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Service role: unrestricted
CREATE POLICY "users_service_role_all"
ON public.users FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Anon: can insert (mobile creates a user row on first SOS)
CREATE POLICY "users_anon_insert"
ON public.users FOR INSERT TO anon
WITH CHECK (true);

-- Anon: can read by email or id (needed for user lookups)
CREATE POLICY "users_anon_select"
ON public.users FOR SELECT TO anon
USING (true);

-- Authenticated: full self-service
CREATE POLICY "users_authenticated_all"
ON public.users FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;


-- ============================================================
-- TABLE: emergency_alerts
-- Stores SOS events sent from the mobile app
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,                      -- FK → users.id (soft, not enforced to allow text ids)
    -- Caller identity (denormalised for speed)
    name            TEXT,
    phone           TEXT,
    -- Location
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    h3_index        TEXT,                      -- geospatial cell index
    radius_meters   INTEGER DEFAULT 3000,       -- broadcast radius
    -- Content
    message         TEXT,
    -- Lifecycle
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'resolved', 'cancelled')),
    responder_count INTEGER DEFAULT 0,
    resolved_at     TIMESTAMPTZ,
    notes           TEXT,
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes on emergency_alerts
CREATE INDEX IF NOT EXISTS idx_ea_created_at ON public.emergency_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ea_status     ON public.emergency_alerts (status);
CREATE INDEX IF NOT EXISTS idx_ea_user_id    ON public.emergency_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_ea_h3_index   ON public.emergency_alerts (h3_index);

-- Trigger: keep updated_at current
DROP TRIGGER IF EXISTS update_emergency_alerts_updated_at ON public.emergency_alerts;
CREATE TRIGGER update_emergency_alerts_updated_at
    BEFORE UPDATE ON public.emergency_alerts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS on emergency_alerts
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Service role: unrestricted
CREATE POLICY "ea_service_role_all"
ON public.emergency_alerts FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Anon: INSERT (mobile uses anon key to create alerts)
CREATE POLICY "ea_anon_insert"
ON public.emergency_alerts FOR INSERT TO anon
WITH CHECK (true);

-- Anon: SELECT (mobile reads alerts)
CREATE POLICY "ea_anon_select"
ON public.emergency_alerts FOR SELECT TO anon
USING (true);

-- Anon: UPDATE (mobile resolves its own alert)
CREATE POLICY "ea_anon_update"
ON public.emergency_alerts FOR UPDATE TO anon
USING (true) WITH CHECK (true);

-- Authenticated: full access
CREATE POLICY "ea_authenticated_all"
ON public.emergency_alerts FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.emergency_alerts TO anon;
GRANT ALL ON public.emergency_alerts TO authenticated;


-- ============================================================
-- VIEW: active_emergency_alerts
-- ============================================================
CREATE OR REPLACE VIEW public.active_emergency_alerts AS
SELECT * FROM public.emergency_alerts
WHERE status = 'active'
ORDER BY created_at DESC;

GRANT SELECT ON public.active_emergency_alerts TO authenticated, anon;


-- ============================================================
-- STORAGE BUCKET: profile-images
-- Public bucket for user avatars / profile photos
-- (Run this block separately if you get a permission error —
--  Supabase sometimes requires storage setup via the Dashboard)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    true,
    5242880,   -- 5 MB per file
    ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read profile images
CREATE POLICY "profile_images_public_read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'profile-images');

-- Authenticated users can upload their own avatar
CREATE POLICY "profile_images_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-images');

-- Authenticated users can update/delete their own avatar
CREATE POLICY "profile_images_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-images');

CREATE POLICY "profile_images_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-images');


-- ============================================================
-- VERIFY
-- ============================================================
SELECT
    t.table_name,
    COUNT(c.column_name) AS columns
FROM information_schema.tables t
JOIN information_schema.columns c
    ON c.table_name = t.table_name AND c.table_schema = 'public'
WHERE t.table_schema = 'public'
  AND t.table_name IN ('users', 'emergency_alerts')
GROUP BY t.table_name
ORDER BY t.table_name;

SELECT '✅ Raksha Ireland database setup complete!' AS status;
