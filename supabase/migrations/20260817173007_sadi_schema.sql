/*
# SADI 2.0 — Smart Archive & Document Intelligence: core schema

## Purpose
Creates the tables for an intelligent document archiving app: user profiles (with
roles), people (named parties documents refer to), categories (seeded), and
documents (the archive itself with classification, retention, expiry, and
content hashing). Also creates a storage bucket for uploaded files.

## New Tables

### profiles
- `id` (uuid, PK, references auth.users) — one row per auth user
- `username` (text, unique, not null) — display login name
- `full_name` (text) — optional display name
- `phone` (text), `bio` (text), `department` (text)
- `role` (text, not null, default 'user') — one of admin | archivist | employee | user
- `created_at` (timestamptz, default now())

### people
- `id` (uuid, PK)
- `name` (text, unique, not null)
- `created_at` (timestamptz)
- `created_by` (uuid, references profiles, default auth.uid())

### categories
- `id` (uuid, PK)
- `name` (text, unique, not null)
- `created_at` (timestamptz)
Seeded with 7 categories: Legal Documents, Financial Records, Personal Documents,
Contracts, Correspondence, Reports, Other.

### documents
- `id` (uuid, PK)
- `file_name` (text, not null)
- `file_path` (text) — storage object path when type='file'
- `content_text` (text) — text content (manual docs) or extracted text
- `type` (text, not null) — 'file' | 'text'
- `person_id` (uuid, references people, nullable)
- `category_id` (uuid, references categories, nullable)
- `uploaded_by` (uuid, references profiles, default auth.uid())
- `content_hash` (text) — SHA-256 of content for duplicate detection
- `classification` (text) — Non-Confidential | Confidential | Top Confidential | Highly Confidential
- `doc_type` (text)
- `document_date` (date)
- `keywords` (text[])
- `entities` (jsonb)
- `notes` (text)
- `document_number` (text)
- `status` (text, default 'active')
- `retention_years` (int, default 5)
- `expiry_date` (date)
- `created_at` (timestamptz, default now())

## Security (RLS)
- profiles: authenticated users can read all profiles (needed for user mgmt & display);
  each user can update only their own profile. Only admin can insert/update others
  via a SECURITY DEFINER function (defined in a later migration if needed); here we
  allow self-insert on signup and self-update.
- people: authenticated can read all; authenticated can insert (creator-scoped);
  owner can delete their own people rows.
- categories: authenticated can read; inserts blocked (managed via migration/seed).
- documents: authenticated can read all; authenticated can insert/update/delete
  their own documents (uploaded_by = auth.uid()).

## Storage
- Creates a public bucket `documents` for file uploads.

## Notes
1. Owner columns default to auth.uid() so inserts that omit the owner succeed.
2. Policies are dropped before (re)creation so this migration is idempotent.
3. Categories are seeded with ON CONFLICT DO NOTHING.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  phone text,
  bio text,
  department text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- people
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_select_authenticated" ON people;
CREATE POLICY "people_select_authenticated" ON people FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "people_insert_authenticated" ON people;
CREATE POLICY "people_insert_authenticated" ON people FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "people_delete_owner" ON people;
CREATE POLICY "people_delete_owner" ON people FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_authenticated" ON categories;
CREATE POLICY "categories_select_authenticated" ON categories FOR SELECT
  TO authenticated USING (true);

-- documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text,
  content_text text,
  type text NOT NULL DEFAULT 'text',
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  content_hash text,
  classification text DEFAULT 'Non-Confidential',
  doc_type text,
  document_date date,
  keywords text[] DEFAULT '{}',
  entities jsonb DEFAULT '{}'::jsonb,
  notes text,
  document_number text,
  status text DEFAULT 'active',
  retention_years int DEFAULT 5,
  expiry_date date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select_authenticated" ON documents;
CREATE POLICY "documents_select_authenticated" ON documents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "documents_insert_owner" ON documents;
CREATE POLICY "documents_insert_owner" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "documents_update_owner" ON documents;
CREATE POLICY "documents_update_owner" ON documents FOR UPDATE
  TO authenticated USING (auth.uid() = uploaded_by) WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "documents_delete_owner" ON documents;
CREATE POLICY "documents_delete_owner" ON documents FOR DELETE
  TO authenticated USING (auth.uid() = uploaded_by);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_person_id ON documents(person_id);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_documents_classification ON documents(classification);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Seed categories
INSERT INTO categories (name) VALUES
  ('Legal Documents'),
  ('Financial Records'),
  ('Personal Documents'),
  ('Contracts'),
  ('Correspondence'),
  ('Reports'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

-- Storage bucket for document files
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_bucket_read" ON storage.objects;
CREATE POLICY "documents_bucket_read" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_insert" ON storage.objects;
CREATE POLICY "documents_bucket_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_update" ON storage.objects;
CREATE POLICY "documents_bucket_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_delete" ON storage.objects;
CREATE POLICY "documents_bucket_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'documents');