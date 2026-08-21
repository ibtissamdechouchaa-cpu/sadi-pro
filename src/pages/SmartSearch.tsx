import { useEffect, useState, useCallback } from 'react';
import { Search, Sparkles, FileText, Filter, X, Calendar, Tag, Building2, Lock, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Input';
import type { DocumentRow } from '@/lib/types';
import { classificationColor, CLASSIFICATIONS } from '@/lib/types';

export function SmartSearchPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    authority: '',
    classification: '',
    year: '',
    status: '',
  });
  const [authorities, setAuthorities] = useState<string[]>([]);
  const [docTypes, setDocTypes] = useState<string[]>([]);

  useEffect(() => {
    supabase.from('documents').select('authority, doc_type').then(({ data }) => {
      const authSet = new Set<string>();
      const typeSet = new Set<string>();
      (data ?? []).forEach((d: { authority: string | null; doc_type: string | null }) => {
        if (d.authority) authSet.add(d.authority);
        if (d.doc_type) typeSet.add(d.doc_type);
      });
      setAuthorities(Array.from(authSet));
      setDocTypes(Array.from(typeSet));
    });
  }, []);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    let q = supabase
      .from('documents')
      .select('*, person:people(*), category:categories(*), uploader:profiles(*)')
      .limit(50);

    if (query.trim()) {
      q = q.or(`file_name.ilike.%${query}%,content_text.ilike.%${query}%,notes.ilike.%${query}%,document_number.ilike.%${query}%,keywords.cs.{${query}}`);
    }
    if (filters.type) q = q.eq('doc_type', filters.type);
    if (filters.authority) q = q.eq('authority', filters.authority);
    if (filters.classification) q = q.eq('classification', filters.classification);
    if (filters.year) q = q.gte('document_date', `${filters.year}-01-01`).lte('document_date', `${filters.year}-12-31`);
    if (filters.status) q = q.eq('status', filters.status);

    const { data } = await q.order('created_at', { ascending: false });
    setResults((data as DocumentRow[]) ?? []);
    setLoading(false);
  }, [query, filters]);

  const clearFilters = () => {
    setFilters({ type: '', authority: '', classification: '', year: '', status: '' });
    setQuery('');
  };

  const hasFilters = query || filters.type || filters.authority || filters.classification || filters.year || filters.status;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('smartSearchTitle')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('smartSearchDesc')}</p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('smartSearchPlaceholder')}
                className="input-base w-full pl-10 text-sm"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Spinner /> : <><Search size={18} /> {t('searchButton')}</>}
            </Button>
            <Button variant="ghost" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={18} />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 animate-fade-in">
              <Select label={t('filterByType')} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                <option value="">—</option>
                {docTypes.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
              </Select>
              <Select label={t('filterByAuthority')} value={filters.authority} onChange={(e) => setFilters({ ...filters, authority: e.target.value })}>
                <option value="">—</option>
                {authorities.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
              <Select label={t('filterByClassification')} value={filters.classification} onChange={(e) => setFilters({ ...filters, classification: e.target.value })}>
                <option value="">—</option>
                {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Input type="number" label={t('filterByYear')} value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} placeholder="2025" />
              <Select label={t('filterByStatus')} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">—</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="expired">Expired</option>
              </Select>
              {hasFilters && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}><X size={14} /> {t('clearFilters')}</Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setQuery('confidential'); handleSearch(); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-accent/10 hover:text-accent transition">
              <Lock size={12} className="inline mr-1" />Confidential
            </button>
            <button onClick={() => { setQuery('2025'); handleSearch(); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-accent/10 hover:text-accent transition">
              <Calendar size={12} className="inline mr-1" />2025
            </button>
            <button onClick={() => { setQuery('HR'); handleSearch(); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-accent/10 hover:text-accent transition">
              <Building2 size={12} className="inline mr-1" />HR
            </button>
            <button onClick={() => { setQuery('decision'); handleSearch(); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-accent/10 hover:text-accent transition">
              <Tag size={12} className="inline mr-1" />Decisions
            </button>
          </div>

          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Sparkles size={12} /> {t('searchHint')}
          </p>
        </div>
      </Card>

      {searched && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><FileText size={18} className="text-accent" /> {t('searchResults')}</span>
              {results.length > 0 && <Badge className="bg-accent/10 text-accent">{t('resultsCount').replace('{count}', String(results.length))}</Badge>}
            </CardTitle>
          </CardHeader>
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="text-accent" /></div>
          ) : results.length === 0 ? (
            <EmptyState title={t('noSearchResults')} />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {results.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0">
                      <FileText size={18} className="text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {doc.document_number && <span className="text-xs text-gray-500"><Hash size={10} className="inline" /> {doc.document_number}</span>}
                        {doc.authority && <span className="text-xs text-gray-500">{doc.authority}</span>}
                        {doc.document_date && <span className="text-xs text-gray-500">{new Date(doc.document_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.classification && <Badge className={classificationColor(doc.classification)}>{doc.classification}</Badge>}
                    {doc.status && <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-500">{doc.status}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
