-- Create a test user in the users table for testing alerts
-- This matches the default user_id used in the backend (f0edc01b-a531-43c8-ad3d-aeda54ae09ea)

INSERT INTO users (id, email, full_name, phone_number, status, role, created_at, updated_at)
VALUES (
  'f0edc01b-a531-43c8-ad3d-aeda54ae09ea',
  'test@raksha.ie',
  'Test User',
  '+353871234567',
  'approved',
  'user',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  status = EXCLUDED.status,
  updated_at = NOW();
