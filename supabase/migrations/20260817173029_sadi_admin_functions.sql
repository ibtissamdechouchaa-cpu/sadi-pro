/*
# SADI 2.0 — Admin user management functions

## Purpose
Provides SECURITY DEFINER functions so an admin can:
1. Create a new auth user + profile with a chosen role (admin-only).
2. Update a user's profile fields including role (admin-only).
3. Delete a user (admin-only).

These run with elevated privileges because the anon/authenticated role cannot
otherwise insert into auth.users or set the `role` column on profiles. Access is
gated by an admin check inside each function, so only admins can invoke them.

## Security
- SECURITY DEFINER functions with a fixed, safe search_path.
- Each function verifies the caller is an admin before acting.
- The functions are executable by `authenticated` only; the internal admin check
  enforces authorization.

## Notes
1. Uses pgcrypto for gen_random_uuid (already available via pgcrypto extension).
2. Replaces functions if they already exist (idempotent via CREATE OR REPLACE).
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Admin creates a new user with a role
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_username text,
  p_email text,
  p_password text,
  p_role text DEFAULT 'user',
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;
  IF p_role NOT IN ('admin','archivist','employee','user') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  -- Create auth user
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
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('username', p_username, 'full_name', p_full_name)
  )
  RETURNING id INTO new_user_id;

  -- Create profile
  INSERT INTO public.profiles (id, username, role, full_name, phone, department)
  VALUES (new_user_id, p_username, p_role, p_full_name, p_phone, p_department);

  RETURN new_user_id;
END;
$$;

-- Admin updates a user's profile (including role)
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id uuid,
  p_username text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_bio text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update users';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('admin','archivist','employee','user') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE public.profiles SET
    username = COALESCE(p_username, username),
    role = COALESCE(p_role, role),
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    department = COALESCE(p_department, department),
    bio = COALESCE(p_bio, bio)
  WHERE id = p_user_id;

  IF p_email IS NOT NULL THEN
    UPDATE auth.users SET email = p_email, updated_at = now() WHERE id = p_user_id;
  END IF;
END;
$$;

-- The admin_update_user function referenced p_email which wasn't a param; recreate correctly
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id uuid,
  p_username text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update users';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('admin','archivist','employee','user') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE public.profiles SET
    username = COALESCE(p_username, username),
    role = COALESCE(p_role, role),
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    department = COALESCE(p_department, department),
    bio = COALESCE(p_bio, bio)
  WHERE id = p_user_id;

  IF p_email IS NOT NULL THEN
    UPDATE auth.users SET email = p_email, updated_at = now() WHERE id = p_user_id;
  END IF;
END;
$$;

-- Admin deletes a user
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text,text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid,text,text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;