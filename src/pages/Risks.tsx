import { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Clock, FileWarning, ShieldAlert, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { riskColor, classificationColor } from '@/lib/types';
import type { DocumentRow } from '@/lib/types';

interface RiskItem {
  doc: DocumentRow;
  type: 'missing' | 'expiring' | 'sensitive' | 'review';
  text: string;
}

export function RisksPage() {
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

  const risks = useMemo<RiskItem[]>(() => {
    const now = new Date();
    const items: RiskItem[] = [];
    for (const d of docs) {
      if (!d.file_name || !d.classification || !d.document_date) {
        items.push({ doc: d, type: 'missing', text: t('docMissingInfo').replace('{name}', d.file_name) });
      }
      if (d.expiry_date) {
        const days = Math.floor((new Date(d.expiry_date).getTime() - now.getTime()) / 86400000);
        if (days >= 0 && days <= 60) {
          items.push({ doc: d, type: 'expiring', text: t('docExpiringSoon').replace('{name}', d.file_name).replace('{days}', String(days)) });
        }
      }
      if (d.classification === 'Highly Confidential' || d.classification === 'Top Confidential') {
        items.push({ doc: d, type: 'sensitive', text: t('docSensitive').replace('{name}', d.file_name) });
      }
      if (d.review_date) {
        const days = Math.floor((new Date(d.review_date).getTime() - now.getTime()) / 86400000);
        if (days >= 0 && days <= 30) {
          items.push({ doc: d, type: 'review', text: t('docMissingInfo').replace('{name}', d.file_name) });
        }
      }
    }
    return items;
  }, [docs, t]);

  const stats = useMemo(() => ({
    total: risks.length,
    missing: risks.filter((r) => r.type === 'missing').length,
    expiring: risks.filter((r) => r.type === 'expiring').length,
    sensitive: risks.filter((r) => r.type === 'sensitive').length,
    review: risks.filter((r) => r.type === 'review').length,
  }), [risks]);

  if (loading) return <div className="py-20 flex justify-center"><Spinner className="text-accent" /></div>;

  const statCards = [
    { label: t('missingInfo'), value: stats.missing, icon: FileWarning, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t('expiringSoon'), value: stats.expiring, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: t('sensitiveData'), value: stats.sensitive, icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: t('needsReview'), value: stats.review, icon: AlertTriangle, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('risksTitle')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('risksDesc')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <s.icon size={24} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            {t('risksTitle')}
          </CardTitle>
        </CardHeader>
        {risks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <CheckCircle size={48} className="text-emerald-500" />
            <EmptyState title={t('noRisks')} />
          </div>
        ) : (
          <div className="space-y-2">
            {risks.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <div className="flex items-center gap-3 min-w-0">
                  {r.type === 'missing' ? <FileWarning size={18} className="text-amber-500 shrink-0" /> :
                   r.type === 'expiring' ? <Clock size={18} className="text-orange-500 shrink-0" /> :
                   r.type === 'sensitive' ? <ShieldAlert size={18} className="text-red-500 shrink-0" /> :
                   <AlertTriangle size={18} className="text-violet-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.doc.file_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.text}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge className={riskColor(r.doc.risk_level)}>{r.doc.risk_level ?? t('riskNone')}</Badge>
                  <Badge className={classificationColor(r.doc.classification)}>{r.doc.classification ?? '—'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
