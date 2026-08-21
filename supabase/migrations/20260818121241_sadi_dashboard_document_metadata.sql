/*
# SADI 2.0 — Dashboard metadata and request analytics

1. New columns on `documents`
- `authority` (text) — organization or authority responsible for the document.
- `department` (text) — department associated with the document.
- `request_count` (integer) — number of times the document has been requested, defaulting to zero.

2. Modified tables
- Extends `documents` without removing or changing existing data.

3. Security
- Existing `documents` RLS policies continue to govern access to the new columns.

4. Important notes
- The dashboard uses these fields for authority, department, and most-requested analytics.
- Existing documents receive safe empty/default values and remain fully usable.
*/

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS authority text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS request_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_documents_authority ON public.documents(authority);
CREATE INDEX IF NOT EXISTS idx_documents_department ON public.documents(department);
CREATE INDEX IF NOT EXISTS idx_documents_request_count ON public.documents(request_count DESC);