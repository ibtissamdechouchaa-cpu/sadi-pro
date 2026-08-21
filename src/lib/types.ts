export type Role = 'admin' | 'archivist' | 'employee' | 'user';

export type Classification =
  | 'Non-Confidential'
  | 'Confidential'
  | 'Top Confidential'
  | 'Highly Confidential';

export type DocType = 'file' | 'text';

export type LifecycleStage =
  | 'created'
  | 'processed'
  | 'classified'
  | 'archived'
  | 'used'
  | 'reviewed'
  | 'expired'
  | 'final';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  department: string | null;
  role: Role;
  created_at: string;
}

export interface Person {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface DocumentTypeRow {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface DocumentRelationRow {
  id: string;
  source_doc_id: string;
  target_doc_id: string;
  relation_type: string;
  created_at: string;
  target_doc?: DocumentRow | null;
  source_doc?: DocumentRow | null;
}

export interface SignatureRow {
  id: string;
  document_id: string;
  signer_id: string | null;
  signer_name: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  signed_at: string | null;
  notes: string | null;
  signer?: Profile | null;
}

export interface EmailLogRow {
  id: string;
  document_id: string | null;
  sender: string | null;
  recipient: string | null;
  subject: string | null;
  sent_at: string;
  status: string;
  body: string | null;
  document?: DocumentRow | null;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user?: Profile | null;
}

export interface ComplianceRuleRow {
  id: string;
  law_name: string;
  law_number: string | null;
  domain: string | null;
  description: string | null;
  reference: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  file_name: string;
  file_path: string | null;
  content_text: string | null;
  type: DocType;
  person_id: string | null;
  category_id: string | null;
  uploaded_by: string | null;
  content_hash: string | null;
  classification: Classification | null;
  doc_type: string | null;
  document_date: string | null;
  keywords: string[] | null;
  entities: Record<string, unknown> | null;
  notes: string | null;
  document_number: string | null;
  status: string | null;
  retention_years: number | null;
  expiry_date: string | null;
  authority: string | null;
  department: string | null;
  request_count: number | null;
  lifecycle_stage: string | null;
  review_date: string | null;
  last_accessed_at: string | null;
  risk_level: string | null;
  risk_notes: string | null;
  translation_ar: string | null;
  translation_fr: string | null;
  translation_en: string | null;
  summary_short: string | null;
  summary_medium: string | null;
  summary_detailed: string | null;
  key_points: string[] | null;
  created_at: string;
  person?: Person | null;
  category?: Category | null;
  uploader?: Profile | null;
}

export const CLASSIFICATIONS: Classification[] = [
  'Non-Confidential',
  'Confidential',
  'Top Confidential',
  'Highly Confidential',
];

export const ROLES: Role[] = ['admin', 'archivist', 'employee', 'user'];

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  'created', 'processed', 'classified', 'archived', 'used', 'reviewed', 'expired', 'final',
];

export const RISK_LEVELS: RiskLevel[] = ['none', 'low', 'medium', 'high', 'critical'];

export const DOC_TYPE_CATEGORIES = [
  { key: 'administrative', label: 'Administrative' },
  { key: 'certificates', label: 'Certificates & Evidence' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'hr', label: 'Human Resources' },
  { key: 'other', label: 'Other' },
] as const;

export function classificationColor(c: Classification | string | null | undefined): string {
  switch (c) {
    case 'Non-Confidential':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
    case 'Confidential':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
    case 'Top Confidential':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400';
    case 'Highly Confidential':
      return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }
}

export function riskColor(r: string | null | undefined): string {
  switch (r) {
    case 'critical':
      return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400';
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400';
    case 'medium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
    case 'low':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400';
    default:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
  }
}

export function lifecycleColor(stage: string | null | undefined): string {
  switch (stage) {
    case 'created':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400';
    case 'processed':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400';
    case 'classified':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400';
    case 'archived':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
    case 'used':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400';
    case 'reviewed':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
    case 'expired':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400';
    case 'final':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }
}

export function roleColor(r: Role | string | null | undefined): string {
  switch (r) {
    case 'admin':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400';
    case 'archivist':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400';
    case 'employee':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }
}
