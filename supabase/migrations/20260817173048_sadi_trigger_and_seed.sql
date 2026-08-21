/*
# SADI 2.0 — Auto-create profile on signup + admin seeding

## Purpose
1. Trigger: when a new auth.users row is created (sign-up), automatically create
   a matching public.profiles row with role='user' and username from metadata.
2. Seed an admin user so the app is usable on first run: username `admin`,
   password `admin123`, role `admin`.

## Notes
1. Idempotent: admin seed guarded by NOT EXISTS checks.
2. Trigger dropped then recreated.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed admin user (idempotent) — only if not already present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@sadi.local') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@sadi.local',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('username', 'admin', 'full_name', 'Administrator')
    );
  END IF;
END $$;

-- Seed admin profile (idempotent)
INSERT INTO public.profiles (id, username, role, full_name)
SELECT id, 'admin', 'admin', 'Administrator'
FROM auth.users
WHERE email = 'admin@sadi.local'
AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = 'admin');