import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, FileText, AlertTriangle, Clock, Sparkles, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { classificationColor } from '@/lib/types';
import type { DocumentRow } from '@/lib/types';
import { toast } from 'sonner';

const PIE_COLORS = ['#6C5CE7', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6', '#8B5CF6'];

export function ReportsPage() {
  const { t } = useI18n();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('documents')
        .select('*, person:people(*), category:categories(*), uploader:profiles(*)')
        .order('created_at', { ascending: false })
        .limit(500);
      setDocs((data as DocumentRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const byAuthority = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) { const k = d.authority || '—'; m.set(k, (m.get(k) ?? 0) + 1); }
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [docs]);

  const byDepartment = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) { const k = d.department || '—'; m.set(k, (m.get(k) ?? 0) + 1); }
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [docs]);

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) { const k = d.doc_type || d.type || '—'; m.set(k, (m.get(k) ?? 0) + 1); }
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [docs]);

  const byClassification = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) { const k = d.classification ?? 'Non-Confidential'; m.set(k, (m.get(k) ?? 0) + 1); }
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [docs]);

  const mostUsed = useMemo(() => [...docs].sort((a, b) => (b.request_count ?? 0) - (a.request_count ?? 0)).slice(0, 10), [docs]);
  const leastUsed = useMemo(() => [...docs].sort((a, b) => (a.request_count ?? 0) - (b.request_count ?? 0)).slice(0, 10), [docs]);

  const expiring = useMemo(() => {
    const now = new Date();
    return docs.filter((d) => d.expiry_date && new Date(d.expiry_date) >= now).sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime()).slice(0, 10);
  }, [docs]);

  const needsReview = useMemo(() => {
    const now = new Date();
    return docs.filter((d) => d.review_date && new Date(d.review_date) >= now).sort((a, b) => new Date(a.review_date!).getTime() - new Date(b.review_date!).getTime()).slice(0, 10);
  }, [docs]);

  const predictions = useMemo(() => {
    const items: string[] = [];
    if (expiring.length > 0) items.push(t('predictExpiring') + ` (${expiring.length})`);
    if (needsReview.length > 0) items.push(t('predictReviewSoon') + ` (${needsReview.length})`);
    if (mostUsed.length > 0 && (mostUsed[0].request_count ?? 0) > 0) items.push(t('predictMostRequested') + `: ${mostUsed[0].file_name}`);
    return items.length > 0 ? items : [t('predictExpiring'), t('predictReviewSoon')];
  }, [expiring, needsReview, mostUsed, t]);

  const handleExport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: { total: docs.length, byAuthority: byAuthority, byDepartment: byDepartment, byType: byType, byClassification: byClassification },
      mostUsed: mostUsed.map((d) => ({ name: d.file_name, requests: d.request_count })),
      leastUsed: leastUsed.map((d) => ({ name: d.file_name, requests: d.request_count })),
      expiring: expiring.map((d) => ({ name: d.file_name, expiry: d.expiry_date })),
      needsReview: needsReview.map((d) => ({ name: d.file_name, review: d.review_date })),
      predictions,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sadi-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('reportGenerated'));
  };

  if (loading) return <div className="py-20 flex justify-center"><Spinner className="text-accent" /></div>;

  const charts = [
    { title: t('docsByAuthority'), data: byAuthority },
    { title: t('docsByDepartment'), data: byDepartment },
    { title: t('docsByType'), data: byType },
    { title: t('docsByClassification'), data: byClassification },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('reportsTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('reportsDesc')}</p>
        </div>
        <Button onClick={handleExport}>
          <Download size={18} /> {t('exportReport')}
        </Button>
      </div>

      {/* Predictions */}
      <Card className="border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            {t('predictions')}
          </CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {predictions.map((p, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-accent/5 text-sm text-gray-700 dark:text-gray-300">
              <TrendingUp size={16} className="text-accent shrink-0 mt-0.5" />
              <span>{p}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <Card key={chart.title}>
            <CardHeader><CardTitle className="text-base">{chart.title}</CardTitle></CardHeader>
            {chart.data.length === 0 ? (
              <EmptyState title={t('noDocuments')} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chart.data} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: 'rgba(26,29,46,0.95)', color: '#fff', fontSize: 12 }} />
                  <Bar dataKey="value" fill="#6C5CE7" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        ))}
      </div>

      {/* Classification pie */}
      <Card>
        <CardHeader><CardTitle>{t('docsByClassification')}</CardTitle></CardHeader>
        {byClassification.length === 0 ? (
          <EmptyState title={t('noDocuments')} />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byClassification} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                {byClassification.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: 'rgba(26,29,46,0.95)', color: '#fff', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Most/Least used */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp size={16} className="text-emerald-500" />{t('mostUsed')}</CardTitle></CardHeader>
          {mostUsed.length === 0 ? <EmptyState title={t('noDocuments')} /> : (
            <div className="space-y-2">
              {mostUsed.map((d, i) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate">{i + 1}. {d.file_name}</span>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">{d.request_count ?? 0}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText size={16} className="text-gray-400" />{t('leastUsed')}</CardTitle></CardHeader>
          {leastUsed.length === 0 ? <EmptyState title={t('noDocuments')} /> : (
            <div className="space-y-2">
              {leastUsed.map((d, i) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate">{i + 1}. {d.file_name}</span>
                  <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">{d.request_count ?? 0}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Expiring & Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock size={16} className="text-orange-500" />{t('expiringDocs')}</CardTitle></CardHeader>
          {expiring.length === 0 ? <EmptyState title={t('noDocuments')} /> : (
            <div className="space-y-2">
              {expiring.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate">{d.file_name}</span>
                  <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">{d.expiry_date}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle size={16} className="text-amber-500" />{t('reviewNeededDocs')}</CardTitle></CardHeader>
          {needsReview.length === 0 ? <EmptyState title={t('noDocuments')} /> : (
            <div className="space-y-2">
              {needsReview.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate">{d.file_name}</span>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">{d.review_date}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
