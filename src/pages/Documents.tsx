import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Eye,
  Download,
  Trash2,
  Pencil,
  Upload as UploadIcon,
  X,
  Clock,
  Link2,
  Languages,
  PenLine,
  GitBranch,
  Sparkles,
  Plus,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { classificationColor, CLASSIFICATIONS, roleColor, lifecycleColor, riskColor, LIFECYCLE_STAGES } from '@/lib/types';
import type { DocumentRow, Category, Person, Classification, Role, SignatureRow, DocumentRelationRow, LifecycleStage } from '@/lib/types';
import { toast } from 'sonner';

const roleCan = (role: Role | null | undefined, action: 'edit' | 'delete' | 'upload') => {
  if (!role) return false;
  if (action === 'upload') return ['admin', 'archivist', 'employee'].includes(role);
  if (action === 'edit') return ['admin', 'archivist'].includes(role);
  if (action === 'delete') return ['admin', 'archivist'].includes(role);
  return false;
};

export function DocumentsPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPerson, setFilterPerson] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewDoc, setViewDoc] = useState<DocumentRow | null>(null);
  const [editDoc, setEditDoc] = useState<DocumentRow | null>(null);
  const pageSize = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('documents')
      .select('*, person:people(*), category:categories(*), uploader:profiles(*)')
      .order('created_at', { ascending: false });

    if (filterType !== 'all') query = query.eq('type', filterType);
    if (filterCategory !== 'all') query = query.eq('category_id', filterCategory);
    if (filterPerson !== 'all') query = query.eq('person_id', filterPerson);
    if (search.trim()) {
      query = query.or(`file_name.ilike.%${search.trim()}%,content_text.ilike.%${search.trim}%`);
    }

    const [docsRes, catRes, pplRes] = await Promise.all([
      query,
      supabase.from('categories').select('*').order('name'),
      supabase.from('people').select('*').order('name'),
    ]);
    setDocs((docsRes.data as DocumentRow[]) ?? []);
    setCategories((catRes.data as Category[]) ?? []);
    setPeople((pplRes.data as Person[]) ?? []);
    setLoading(false);
  }, [filterType, filterCategory, filterPerson, search]);

  useEffect(() => {
    const debounce = setTimeout(loadData, 250);
    return () => clearTimeout(debounce);
  }, [loadData]);

  const totalPages = Math.ceil(docs.length / pageSize);
  const pagedDocs = docs.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === pagedDocs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pagedDocs.map((d) => d.id)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    const doc = docs.find((d) => d.id === id);
    if (doc?.file_path) {
      await supabase.storage.from('documents').remove([doc.file_path]);
    }
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) {
      toast.error(t('deleteError'));
    } else {
      toast.success(t('deleteSuccess'));
      loadData();
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(t('confirmDeleteBatch'))) return;
    const ids = Array.from(selected);
    const batchDocs = docs.filter((d) => ids.includes(d.id));
    const paths = batchDocs.map((d) => d.file_path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from('documents').remove(paths);
    const { error } = await supabase.from('documents').delete().in('id', ids);
    if (error) {
      toast.error(t('deleteError'));
    } else {
      toast.success(t('deleteSuccess'));
      setSelected(new Set());
      loadData();
    }
  };

  const handleDownload = async (doc: DocumentRow) => {
    if (!doc.file_path) return;
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60);
    if (error || !data) {
      toast.error(t('error'));
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const filterChips = [
    { key: 'all', label: t('all') },
    { key: 'file', label: t('file') },
    { key: 'text', label: t('text') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('documents')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{docs.length} {t('documents').toLowerCase()}</p>
        </div>
        {roleCan(profile?.role, 'upload') && (
          <Link to="/upload">
            <Button>
              <UploadIcon size={18} />
              {t('uploadDocument')}
            </Button>
          </Link>
        )}
      </div>

      {/* Search + filters */}
      <Card>
        <div className="space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('searchDocuments')}
              className="input-base pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => { setFilterType(chip.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filterType === chip.key
                    ? 'bg-accent text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {chip.label}
              </button>
            ))}
            <div className="flex-1" />
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              className="input-base w-auto py-1.5 text-xs"
            >
              <option value="all">{t('category')}: {t('all')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={filterPerson}
              onChange={(e) => { setFilterPerson(e.target.value); setPage(1); }}
              className="input-base w-auto py-1.5 text-xs"
            >
              <option value="all">{t('person')}: {t('all')}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selected.size > 0 && roleCan(profile?.role, 'delete') && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 animate-fade-in">
              <span className="text-sm text-red-600 dark:text-red-400">{selected.size} selected</span>
              <Button variant="danger" size="sm" onClick={handleBatchDelete}>
                <Trash2 size={14} />
                {t('batchDelete')}
              </Button>
              <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner className="text-accent" />
          </div>
        ) : pagedDocs.length === 0 ? (
          <EmptyState
            title={t('noDocuments')}
            description={t('noDocumentsDesc')}
            action={roleCan(profile?.role, 'upload') ? <Link to="/upload"><Button><UploadIcon size={16} />{t('uploadDocument')}</Button></Link> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === pagedDocs.length && pagedDocs.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded accent-[#6C5CE7]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">{t('documents')}</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{t('category')}</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{t('person')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('classification')}</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">{t('uploadedBy')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                        className="rounded accent-[#6C5CE7]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
                          <FileText size={16} className="text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{doc.file_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {doc.type === 'file' ? doc.file_path?.split('.').pop()?.toUpperCase() : 'TXT'} · {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">{doc.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600 dark:text-gray-400">{doc.person?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={classificationColor(doc.classification)}>
                        {doc.classification ?? 'Non-Confidential'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge className={roleColor(doc.uploader?.role)}>{doc.uploader?.username ?? '—'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewDoc(doc)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent hover:bg-accent/10 transition"
                          title={t('view')}
                        >
                          <Eye size={16} />
                        </button>
                        {doc.file_path && (
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 transition"
                            title={t('download')}
                          >
                            <Download size={16} />
                          </button>
                        )}
                        {roleCan(profile?.role, 'edit') && (
                          <button
                            onClick={() => setEditDoc(doc)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition"
                            title={t('edit')}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {roleCan(profile?.role, 'delete') && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition"
                            title={t('delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                {t('back')}
              </Button>
              <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                {t('next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* View modal */}
      <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc?.file_name} size="lg">
        {viewDoc && <DocumentDetail doc={viewDoc} />}
      </Modal>

      {/* Edit modal */}
      {editDoc && (
        <EditModal
          doc={editDoc}
          categories={categories}
          people={people}
          onClose={() => setEditDoc(null)}
          onSaved={() => { setEditDoc(null); loadData(); }}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

function EditModal({
  doc,
  categories,
  people,
  onClose,
  onSaved,
}: {
  doc: DocumentRow;
  categories: Category[];
  people: Person[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    file_name: doc.file_name,
    classification: doc.classification ?? 'Non-Confidential',
    category_id: doc.category_id ?? '',
    person_id: doc.person_id ?? '',
    doc_type: doc.doc_type ?? '',
    document_date: doc.document_date ?? '',
    keywords: (doc.keywords ?? []).join(', '),
    notes: doc.notes ?? '',
    document_number: doc.document_number ?? '',
    retention_years: doc.retention_years ?? 5,
    authority: doc.authority ?? '',
    department: doc.department ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('documents')
      .update({
        file_name: form.file_name,
        classification: form.classification as Classification,
        category_id: form.category_id || null,
        person_id: form.person_id || null,
        doc_type: form.doc_type || null,
        document_date: form.document_date || null,
        keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        notes: form.notes || null,
        document_number: form.document_number || null,
        retention_years: Number(form.retention_years),
        authority: form.authority || null,
        department: form.department || null,
        expiry_date: form.document_date
          ? new Date(new Date(form.document_date).getFullYear() + Number(form.retention_years), new Date(form.document_date).getMonth(), new Date(form.document_date).getDate()).toISOString().slice(0, 10)
          : null,
      })
      .eq('id', doc.id);
    setSaving(false);
    if (error) {
      toast.error(t('saveError'));
    } else {
      toast.success(t('saveSuccess'));
      onSaved();
    }
  };

  return (
    <Modal open onClose={onClose} title={t('edit')} size="lg">
      <div className="space-y-4">
        <Input label={t('documentName')} value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label={t('classification')} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value as Classification })}>
            {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label={t('category')} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">—</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label={t('person')} value={form.person_id} onChange={(e) => setForm({ ...form, person_id: e.target.value })}>
            <option value="">—</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label={t('docType')} value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} />
          <Input type="date" label={t('documentDate')} value={form.document_date} onChange={(e) => setForm({ ...form, document_date: e.target.value })} />
          <Input label={t('documentNumber')} value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
          <Input label={t('authority')} value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} />
          <Input label={t('docDepartment')} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <Input type="number" min={1} max={10} label={t('retentionPeriod')} value={form.retention_years} onChange={(e) => setForm({ ...form, retention_years: Number(e.target.value) })} />
        </div>
        <Input label={t('keywords')} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
        <Textarea label={t('notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner /> : t('saveChanges')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type DetailTab = 'info' | 'relationships' | 'translation' | 'signatures' | 'lifecycle';

function DocumentDetail({ doc }: { doc: DocumentRow }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [tab, setTab] = useState<DetailTab>('info');
  const [relations, setRelations] = useState<DocumentRelationRow[]>([]);
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [allDocs, setAllDocs] = useState<DocumentRow[]>([]);
  const [linkTarget, setLinkTarget] = useState('');
  const [linkType, setLinkType] = useState('reference');
  const [signerName, setSignerName] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('document_relations').select('*, target_doc:documents!target_doc_id(*), source_doc:documents!source_doc_id(*)').or(`source_doc_id.eq.${doc.id},target_doc_id.eq.${doc.id}`),
      supabase.from('signatures').select('*, signer:profiles(*)').eq('document_id', doc.id),
      supabase.from('documents').select('id, file_name').limit(100),
    ]).then(([relRes, sigRes, docsRes]) => {
      setRelations((relRes.data as DocumentRelationRow[]) ?? []);
      setSignatures((sigRes.data as SignatureRow[]) ?? []);
      setAllDocs((docsRes.data as DocumentRow[]) ?? []);
    });
  }, [doc.id]);

  const addRelation = async () => {
    if (!linkTarget) return;
    const { data } = await supabase.from('document_relations').insert({ source_doc_id: doc.id, target_doc_id: linkTarget, relation_type: linkType }).select('*, target_doc:documents!target_doc_id(*)').maybeSingle();
    if (data) { setRelations([...relations, data as DocumentRelationRow]); toast.success(t('saveSuccess')); setLinkTarget(''); }
  };

  const removeRelation = async (id: string) => {
    await supabase.from('document_relations').delete().eq('id', id);
    setRelations(relations.filter((r) => r.id !== id));
  };

  const requestSignature = async () => {
    if (!signerName.trim()) return;
    const { data } = await supabase.from('signatures').insert({ document_id: doc.id, signer_id: profile?.id, signer_name: signerName, status: 'pending' }).select('*, signer:profiles(*)').maybeSingle();
    if (data) { setSignatures([...signatures, data as SignatureRow]); toast.success(t('signatureRequested')); setSignerName(''); }
  };

  const updateSignature = async (id: string, status: 'approved' | 'rejected') => {
    await supabase.from('signatures').update({ status, signed_at: new Date().toISOString() }).eq('id', id);
    setSignatures(signatures.map((s) => s.id === id ? { ...s, status, signed_at: new Date().toISOString() } : s));
    toast.success(status === 'approved' ? t('signatureApproved') : t('signatureRejected'));
  };

  const generateAI = async (action: 'summary' | 'translate' | 'keywords') => {
    setGenerating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sadi-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action, documentId: doc.id, text: doc.content_text ?? doc.file_name }),
      });
      if (!response.ok) throw new Error('AI failed');
      const data = await response.json();
      if (action === 'summary') {
        const updates: Record<string, string> = { summary_short: data.summary ?? data.text ?? '' };
        await supabase.from('documents').update(updates).eq('id', doc.id);
        toast.success(t('summaryGenerated'));
      } else if (action === 'translate') {
        toast.success(t('translationGenerated'));
      } else {
        toast.success(t('keyPointsExtracted'));
      }
    } catch {
      toast.error(t('aiNotConfiguredDesc'));
    } finally {
      setGenerating(false);
    }
  };

  const tabs: { key: DetailTab; label: string; icon: typeof Link2 }[] = [
    { key: 'info', label: t('view'), icon: FileText },
    { key: 'relationships', label: t('relationships'), icon: Link2 },
    { key: 'translation', label: t('translation'), icon: Languages },
    { key: 'signatures', label: t('signatures'), icon: PenLine },
    { key: 'lifecycle', label: t('lifecycle'), icon: GitBranch },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/50 overflow-x-auto">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${tab === tb.key ? 'bg-white dark:bg-gray-700 text-accent shadow-sm' : 'text-gray-500'}`}>
            <tb.icon size={14} /> {tb.label}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {tab === 'info' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label={t('classification')} value={doc.classification ?? '—'} />
            <Field label={t('category')} value={doc.category?.name ?? '—'} />
            <Field label={t('person')} value={doc.person?.name ?? '—'} />
            <Field label={t('type')} value={doc.type} />
            <Field label={t('documentNumber')} value={doc.document_number ?? '—'} />
            <Field label={t('documentDate')} value={doc.document_date ?? '—'} />
            <Field label={t('authority')} value={doc.authority ?? '—'} />
            <Field label={t('docDepartment')} value={doc.department ?? '—'} />
            <Field label={t('retentionPeriod')} value={`${doc.retention_years ?? 5} yrs`} />
            <Field label={t('expiryDate')} value={doc.expiry_date ?? '—'} />
            <Field label={t('uploadedBy')} value={doc.uploader?.username ?? '—'} />
            <Field label={t('status')} value={doc.status ?? '—'} />
          </div>
          {doc.keywords && doc.keywords.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{t('keywords')}</p>
              <div className="flex flex-wrap gap-1">
                {doc.keywords.map((k, i) => <Badge key={i} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{k}</Badge>)}
              </div>
            </div>
          )}
          {doc.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{t('notes')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{doc.notes}</p>
            </div>
          )}
          {doc.content_text && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{t('textContent')}</p>
              <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{doc.content_text}</div>
            </div>
          )}
        </div>
      )}

      {/* Relationships tab */}
      {tab === 'relationships' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex gap-2">
            <select value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)} className="input-base flex-1 text-sm">
              <option value="">{t('selectDocumentToLink')}</option>
              {allDocs.filter((d) => d.id !== doc.id).map((d) => <option key={d.id} value={d.id}>{d.file_name}</option>)}
            </select>
            <select value={linkType} onChange={(e) => setLinkType(e.target.value)} className="input-base w-auto text-sm">
              <option value="reference">{t('relationReference')}</option>
              <option value="request">{t('relationRequest')}</option>
              <option value="response">{t('relationResponse')}</option>
              <option value="attachment">{t('relationAttachment')}</option>
            </select>
            <Button size="sm" onClick={addRelation} disabled={!linkTarget}><Plus size={16} /></Button>
          </div>
          {relations.length === 0 ? (
            <EmptyState title={t('noRelations')} />
          ) : (
            <div className="space-y-2">
              {relations.map((r) => {
                const linked = r.source_doc_id === doc.id ? r.target_doc : r.source_doc;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 size={16} className="text-accent shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{linked?.file_name ?? '—'}</p>
                        <Badge className="bg-accent/10 text-accent">{r.relation_type}</Badge>
                      </div>
                    </div>
                    <button onClick={() => removeRelation(r.id)} className="text-gray-400 hover:text-red-500 shrink-0"><X size={16} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Translation & Summary tab */}
      {tab === 'translation' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => generateAI('summary')} disabled={generating}>
              {generating ? <Spinner /> : <><Sparkles size={14} /> {t('generateSummary')}</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => generateAI('translate')} disabled={generating}>
              <Languages size={14} /> {t('generateTranslation')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => generateAI('keywords')} disabled={generating}>
              <Sparkles size={14} /> {t('extractKeyPoints')}
            </Button>
          </div>
          {doc.summary_short && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{t('summaryShort')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">{doc.summary_short}</p>
            </div>
          )}
          {doc.translation_ar && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{t('arabic')} {t('translation')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50" dir="rtl">{doc.translation_ar}</p>
            </div>
          )}
          {doc.translation_fr && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{t('french')} {t('translation')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">{doc.translation_fr}</p>
            </div>
          )}
          {doc.key_points && doc.key_points.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{t('keyPoints')}</p>
              <ul className="space-y-1">
                {doc.key_points.map((kp, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> {kp}</li>)}
              </ul>
            </div>
          )}
          {!doc.summary_short && !doc.translation_ar && !doc.key_points && (
            <EmptyState title={t('noDocuments')} description={t('generateSummary')} />
          )}
        </div>
      )}

      {/* Signatures tab */}
      {tab === 'signatures' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex gap-2">
            <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder={t('signerName')} className="input-base flex-1 text-sm" />
            <Button size="sm" onClick={requestSignature} disabled={!signerName.trim()}><PenLine size={16} /> {t('requestSignature')}</Button>
          </div>
          {signatures.length === 0 ? (
            <EmptyState title={t('noSignatures')} />
          ) : (
            <div className="space-y-2">
              {signatures.map((sig) => (
                <div key={sig.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <PenLine size={16} className="text-accent shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sig.signer_name}</p>
                      <p className="text-xs text-gray-500">{new Date(sig.requested_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={sig.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : sig.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'}>
                      {sig.status === 'approved' ? t('sigApproved') : sig.status === 'rejected' ? t('sigRejected') : t('sigPending')}
                    </Badge>
                    {sig.status === 'pending' && (
                      <>
                        <button onClick={() => updateSignature(sig.id, 'approved')} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition"><Check size={16} /></button>
                        <button onClick={() => updateSignature(sig.id, 'rejected')} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition"><X size={16} /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lifecycle tab */}
      {tab === 'lifecycle' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Badge className={lifecycleColor(doc.lifecycle_stage)}>{doc.lifecycle_stage ?? 'created'}</Badge>
            {doc.risk_level && <Badge className={riskColor(doc.risk_level)}>{doc.risk_level}</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label={t('creationDate')} value={new Date(doc.created_at).toLocaleDateString()} />
            <Field label={t('archiveDate')} value={doc.last_accessed_at ? new Date(doc.last_accessed_at).toLocaleDateString() : '—'} />
            <Field label={t('lastUsed')} value={doc.last_accessed_at ? new Date(doc.last_accessed_at).toLocaleDateString() : '—'} />
            <Field label={t('reviewDate')} value={doc.review_date ?? '—'} />
            <Field label={t('retentionPeriod')} value={`${doc.retention_years ?? 5} yrs`} />
            <Field label={t('retentionEnd')} value={doc.expiry_date ?? '—'} />
          </div>
          {/* Timeline */}
          <div className="space-y-3">
            {['created', 'processed', 'classified', 'archived', 'used', 'reviewed', 'expired', 'final'].map((stage, i) => {
              const isDone = doc.lifecycle_stage && LIFECYCLE_STAGES.indexOf(doc.lifecycle_stage as LifecycleStage) >= i;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                    {isDone ? <Check size={14} /> : i + 1}
                  </div>
                  <span className={`text-sm ${isDone ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>{t(`lifecycle${stage.charAt(0).toUpperCase() + stage.slice(1)}` as never)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">{t('noAutoDelete')}</p>
        </div>
      )}
    </div>
  );
}
