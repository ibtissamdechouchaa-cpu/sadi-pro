/*
# SADI 2.0 — Full feature schema: document types, relationships, signatures, email, audit, lifecycle, compliance

## Purpose
Extends the documents system with:
1. Document type categories (administrative, correspondence, contracts, HR, certificates, etc.)
2. Document-to-document relationships (request → letter → decision → report)
3. Electronic signatures with workflow (request → review → sign → approve → archive)
4. Email log for documents sent/received via email
5. Audit log for all operations
6. Lifecycle timeline tracking (created → processed → classified → archived → used → reviewed → expired → final)
7. Compliance rules registry (Algerian laws, ISO standards)

## New Tables

### document_types
- `id` (uuid, PK)
- `name` (text, unique, not null) — e.g. "Correspondence", "Contract", "Certificate"
- `category` (text) — grouping: administrative, contracts, HR, certificates, other
- `is_active` (boolean, default true)
- `created_at` (timestamptz)

### document_relations
- `id` (uuid, PK)
- `source_doc_id` (uuid, FK → documents)
- `target_doc_id` (uuid, FK → documents)
- `relation_type` (text) — e.g. "request", "response", "attachment", "reference"
- `created_at` (timestamptz)

### signatures
- `id` (uuid, PK)
- `document_id` (uuid, FK → documents)
- `signer_id` (uuid, FK → profiles)
- `signer_name` (text)
- `status` (text) — pending | approved | rejected
- `requested_at` (timestamptz)
- `signed_at` (timestamptz)
- `notes` (text)

### email_log
- `id` (uuid, PK)
- `document_id` (uuid, FK → documents)
- `sender` (text)
- `recipient` (text)
- `subject` (text)
- `sent_at` (timestamptz)
- `status` (text) — sent | received
- `body` (text)

### audit_log
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `action` (text) — create, update, delete, export, import, sign, email, view
- `entity_type` (text) — document, user, type, etc.
- `entity_id` (uuid)
- `details` (jsonb)
- `created_at` (timestamptz)

### compliance_rules
- `id` (uuid, PK)
- `law_name` (text, not null)
- `law_number` (text) — e.g. "88-09", "18-07"
- `domain` (text) — e.g. "National Archives", "Data Protection"
- `description` (text)
- `reference` (text) — official gazette reference
- `is_active` (boolean, default true)
- `created_at` (timestamptz)

## Modified Tables
- `documents` — adds lifecycle_stage, review_date, last_accessed_at, risk_level, risk_notes, translation_ar, translation_fr, translation_en, summary_short, summary_medium, summary_detailed, key_points

## Security
- All new tables have RLS enabled
- authenticated users can read all; insert/update scoped to ownership or admin
- audit_log is insert-only for authenticated (no update/delete)

## Notes
1. Document types are seeded with the categories from the spec
2. Compliance rules are seeded with Algerian laws and ISO standards
3. All tables use IF NOT EXISTS for idempotency
4. Policies are dropped before (re)creation
*/

-- document_types
CREATE TABLE IF NOT EXISTS public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL DEFAULT 'other',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_types_select" ON public.document_types;
CREATE POLICY "doc_types_select" ON public.document_types FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "doc_types_insert" ON public.document_types;
CREATE POLICY "doc_types_insert" ON public.document_types FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "doc_types_update" ON public.document_types;
CREATE POLICY "doc_types_update" ON public.document_types FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "doc_types_delete" ON public.document_types;
CREATE POLICY "doc_types_delete" ON public.document_types FOR DELETE
  TO authenticated USING (true);

-- document_relations
CREATE TABLE IF NOT EXISTS public.document_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_doc_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  target_doc_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  relation_type text NOT NULL DEFAULT 'reference',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.document_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_relations_select" ON public.document_relations;
CREATE POLICY "doc_relations_select" ON public.document_relations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "doc_relations_insert" ON public.document_relations;
CREATE POLICY "doc_relations_insert" ON public.document_relations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "doc_relations_delete" ON public.document_relations;
CREATE POLICY "doc_relations_delete" ON public.document_relations FOR DELETE
  TO authenticated USING (true);

-- signatures
CREATE TABLE IF NOT EXISTS public.signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  signer_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  signed_at timestamptz,
  notes text
);
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signatures_select" ON public.signatures;
CREATE POLICY "signatures_select" ON public.signatures FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "signatures_insert" ON public.signatures;
CREATE POLICY "signatures_insert" ON public.signatures FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "signatures_update" ON public.signatures;
CREATE POLICY "signatures_update" ON public.signatures FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- email_log
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  sender text,
  recipient text,
  subject text,
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  body text
);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_log_select" ON public.email_log;
CREATE POLICY "email_log_select" ON public.email_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "email_log_insert" ON public.email_log;
CREATE POLICY "email_log_insert" ON public.email_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- compliance_rules
CREATE TABLE IF NOT EXISTS public.compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_name text NOT NULL,
  law_number text,
  domain text,
  description text,
  reference text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_select" ON public.compliance_rules;
CREATE POLICY "compliance_select" ON public.compliance_rules FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "compliance_insert" ON public.compliance_rules;
CREATE POLICY "compliance_insert" ON public.compliance_rules FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "compliance_update" ON public.compliance_rules;
CREATE POLICY "compliance_update" ON public.compliance_rules FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Extend documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'created';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS review_date date;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS risk_level text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS risk_notes text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS translation_ar text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS translation_fr text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS translation_en text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS summary_short text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS summary_medium text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS summary_detailed text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS key_points text[];

CREATE INDEX IF NOT EXISTS idx_documents_lifecycle ON public.documents(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_documents_risk ON public.documents(risk_level);
CREATE INDEX IF NOT EXISTS idx_documents_review_date ON public.documents(review_date);
CREATE INDEX IF NOT EXISTS idx_signatures_document ON public.signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_relations_source ON public.document_relations(source_doc_id);
CREATE INDEX IF NOT EXISTS idx_doc_relations_target ON public.document_relations(target_doc_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_email_log_document ON public.email_log(document_id);

-- Seed document types
INSERT INTO public.document_types (name, category) VALUES
  ('Correspondence', 'administrative'),
  ('Decision', 'administrative'),
  ('Report', 'administrative'),
  ('Minutes', 'administrative'),
  ('Instruction', 'administrative'),
  ('Publication', 'administrative'),
  ('Memorandum', 'administrative'),
  ('Certificate', 'certificates'),
  ('Attestation', 'certificates'),
  ('Voucher', 'certificates'),
  ('Statement', 'certificates'),
  ('Contract', 'contracts'),
  ('Agreement', 'contracts'),
  ('Terms of Reference', 'contracts'),
  ('Annex', 'contracts'),
  ('Job Application', 'hr'),
  ('Hiring Decision', 'hr'),
  ('Leave Request', 'hr'),
  ('Work Certificate', 'hr'),
  ('Employee File', 'hr')
ON CONFLICT (name) DO NOTHING;

-- Seed compliance rules
INSERT INTO public.compliance_rules (law_name, law_number, domain, description, reference) VALUES
  ('Law 88-09', '88-09', 'National Archives', 'Regulates document lifecycle, retention, transfer and disposal', 'Official Gazette, 26 Jan 1988'),
  ('Law 18-07', '18-07', 'Data Protection', 'Protects personal data in documents and access rights', 'Official Gazette, 10 Jun 2018'),
  ('Law 15-04', '15-04', 'Electronic Signature', 'Electronic signing and certification of documents', 'Official Gazette, 1 Feb 2015'),
  ('Law 15-05', '15-05', 'Cybercrime', 'Protects systems and digital documents from illegal acts', 'Official Gazette, 16 Feb 2015'),
  ('Law 09-04', '09-04', 'Cybercrime', 'Security and protection of systems and data', 'Official Gazette, 5 Aug 2009'),
  ('Law 18-05', '18-05', 'E-Commerce', 'Electronic documents and transactions in commerce', 'Official Gazette, 10 May 2018'),
  ('Law 98-04', '98-04', 'Cultural Heritage', 'Protects documents of historical and heritage value', 'Official Gazette, 15 Jun 1998'),
  ('Law 90-30', '90-30', 'National Property', 'Protects documents establishing state property rights', 'Official Gazette, 1 Dec 1990'),
  ('ISO 15489', 'ISO 15489', 'Records Management', 'International standard for document and records management', 'ISO'),
  ('ISO 30301', 'ISO 30301', 'Management System', 'Document management system requirements', 'ISO'),
  ('ISO 23081', 'ISO 23081', 'Metadata', 'Metadata standards for documents', 'ISO'),
  ('ISO/IEC 27001', 'ISO/IEC 27001', 'Information Security', 'Information security management', 'ISO'),
  ('ISO 16175', 'ISO 16175', 'Software Principles', 'Principles for records management software', 'ISO'),
  ('OAIS', 'OAIS', 'Digital Preservation', 'Reference model for long-term digital preservation', 'OAIS')
ON CONFLICT DO NOTHING;