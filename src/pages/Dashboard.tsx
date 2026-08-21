import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  FileText,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Upload,
  MessageSquare,
  FolderOpen,
  TrendingUp,
  Lock,
  AlertTriangle,
  Clock,
  Flame,
  Bell,
  Sparkles,
  Building2,
  Briefcase,
  FileType,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { roleColor, classificationColor } from '@/lib/types';
import type { DocumentRow, Category } from '@/lib/types';

const PIE_COLORS = ['#6C5CE7', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6', '#8B5CF6'];

export function DashboardPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('documents')
        .select('*, person:people(*), category:categories(*), uploader:profiles(*)')
        .order('created_at', { ascending: false })
        .limit(200);
      setDocs((data as DocumentRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0, week = 0, month = 0;
    let confidential = 0, highRisk = 0, nearingExpiry = 0;

    for (const d of docs) {
      const created = new Date(d.created_at);
      if (created >= todayStart) today++;
      if (created >= weekStart) week++;
      if (created >= monthStart) month++;

      if (d.classification === 'Confidential' || d.classification === 'Top Confidential' || d.classification === 'Highly Confidential') {
        confidential++;
      }
      if (d.classification === 'Top Confidential' || d.classification === 'Highly Confidential') {
        highRisk++;
      }
      if (d.expiry_date) {
        const daysLeft = Math.floor((new Date(d.expiry_date).getTime() - now.getTime()) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 30) nearingExpiry++;
      }
    }
    return { total: docs.length, today, week, month, confidential, highRisk, nearingExpiry };
  }, [docs]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of docs) {
      const name = d.category?.name ?? 'Uncategorized';
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [docs]);

  const byClassification = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of docs) {
      const c = d.classification ?? 'Non-Confidential';
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [docs]);

  const byAuthority = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of docs) {
      const name = d.authority || 'Unassigned';
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [docs]);

  const byDepartment = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of docs) {
      const name = d.department || 'Unassigned';
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [docs]);

  const byDocType = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of docs) {
      const name = d.doc_type || d.type || 'Other';
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [docs]);

  const uploadsOverTime = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of docs) {
      const day = new Date(d.created_at).toISOString().slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return Array.from(map, ([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [docs]);

  const mostRequested = useMemo(() => {
    return [...docs]
      .sort((a, b) => (b.request_count ?? 0) - (a.request_count ?? 0))
      .slice(0, 5);
  }, [docs]);

  const recentDocs = docs.slice(0, 6);

  const alerts = useMemo(() => {
    const now = new Date();
    const items: { id: string; text: string; type: 'expiry' | 'highRisk' | 'confidential' }[] = [];
    for (const d of docs) {
      if (d.expiry_date) {
        const daysLeft = Math.floor((new Date(d.expiry_date).getTime() - now.getTime()) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 30) {
          items.push({ id: d.id, text: t('alertExpiry').replace('{name}', d.file_name).replace('{days}', String(daysLeft)), type: 'expiry' });
        }
      }
      if (d.classification === 'Highly Confidential' || d.classification === 'Top Confidential') {
        items.push({ id: d.id + '-hr', text: t('alertHighRisk').replace('{name}', d.file_name), type: 'highRisk' });
      }
      if (d.classification === 'Confidential') {
        items.push({ id: d.id + '-c', text: t('alertConfidential').replace('{name}', d.file_name), type: 'confidential' });
      }
    }
    return items.slice(0, 8);
  }, [docs, t]);

  const predictions = useMemo(() => {
    const items: string[] = [];
    if (stats.nearingExpiry > 0) items.push(t('predictionExpiry'));
    const hrCount = byDepartment.find((d) => d.name.toLowerCase().includes('hr') || d.name.toLowerCase().includes('موارد'))?.value ?? 0;
    if (hrCount > 0) items.push(t('predictionHR'));
    const legalCount = byCategory.find((c) => c.name.toLowerCase().includes('legal'))?.value ?? 0;
    if (legalCount > 0) items.push(t('predictionLegal'));
    return items.length > 0 ? items : [t('predictionHR'), t('predictionExpiry')];
  }, [stats, byDepartment, byCategory, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="text-accent" />
      </div>
    );
  }

  const statCards = [
    { label: t('totalDocuments'), value: stats.total, icon: FileText, color: 'text-accent', bg: 'bg-accent/10' },
    { label: t('addedToday'), value: stats.today, icon: CalendarDays, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t('thisWeek'), value: stats.week, icon: CalendarRange, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { label: t('thisMonth'), value: stats.month, icon: CalendarClock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t('confidentialDocs'), value: stats.confidential, icon: Lock, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: t('highRiskDocs'), value: stats.highRisk, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: t('nearingExpiry'), value: stats.nearingExpiry, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: t('mostRequested'), value: mostRequested[0]?.request_count ?? 0, icon: Flame, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-accent-700 p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <img src="/images/image copy 3.png" alt="SADI PRO" className="absolute right-6 bottom-0 w-24 h-24 rounded-2xl object-cover shadow-lg opacity-80 hidden sm:block" />
        <div className="relative">
          <h1 className="text-2xl lg:text-3xl font-bold">
            {t('welcome')}, {profile?.full_name || profile?.username}
          </h1>
          <p className="mt-1 text-white/80 text-sm">{t('appTagline')}</p>
          <Badge className={`mt-3 ${roleColor(profile?.role)} bg-white/90`}>{profile?.role}</Badge>
        </div>
      </div>

      {/* Stat cards */}
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

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/upload" className="group">
          <Card className="flex items-center gap-3 hover:border-accent/40 transition cursor-pointer h-full">
            <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:scale-110 transition">
              <Upload size={22} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('uploadDocument')}</p>
            </div>
          </Card>
        </Link>
        <Link to="/documents" className="group">
          <Card className="flex items-center gap-3 hover:border-accent/40 transition cursor-pointer h-full">
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-110 transition">
              <FolderOpen size={22} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('viewDocuments')}</p>
            </div>
          </Card>
        </Link>
        <Link to="/chat" className="group">
          <Card className="flex items-center gap-3 hover:border-accent/40 transition cursor-pointer h-full">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition">
              <MessageSquare size={22} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('askAI')}</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Smart predictions */}
      <Card className="border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            {t('smartPredictions')}
          </CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {predictions.map((p, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-accent/5 text-sm text-gray-700 dark:text-gray-300">
              <Sparkles size={16} className="text-accent shrink-0 mt-0.5" />
              <span>{p}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell size={18} className="text-amber-500" />
            {t('recentAlerts')}
          </CardTitle>
        </CardHeader>
        {alerts.length === 0 ? (
          <EmptyState title={t('noAlerts')} />
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
                a.type === 'expiry' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' :
                a.type === 'highRisk' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
              }`}>
                {a.type === 'expiry' ? <Clock size={16} className="shrink-0 mt-0.5" /> :
                 a.type === 'highRisk' ? <AlertTriangle size={16} className="shrink-0 mt-0.5" /> :
                 <Lock size={16} className="shrink-0 mt-0.5" />}
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Most requested */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame size={18} className="text-pink-500" />
            {t('mostRequested')}
          </CardTitle>
        </CardHeader>
        {mostRequested.length === 0 || (mostRequested[0]?.request_count ?? 0) === 0 ? (
          <EmptyState title={t('noDocuments')} />
        ) : (
          <div className="space-y-2">
            {mostRequested.filter((d) => (d.request_count ?? 0) > 0).map((doc, i) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.file_name}</p>
                    <p className="text-xs text-gray-500">{doc.request_count} {t('times')}</p>
                  </div>
                </div>
                <Badge className={classificationColor(doc.classification)}>
                  {doc.classification ?? 'Non-Confidential'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Charts: category + classification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('documentsByCategory')}</CardTitle>
          </CardHeader>
          {byCategory.length === 0 ? (
            <EmptyState title={t('noDocuments')} description={t('noDocumentsDesc')} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byCategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: 'rgba(26,29,46,0.95)', color: '#fff', fontSize: 12 }} />
                <Bar dataKey="value" fill="#6C5CE7" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('documentsByClassification')}</CardTitle>
          </CardHeader>
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
      </div>

      {/* Stats by authority, department, type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 size={16} className="text-sky-500" />
              {t('statsByAuthority')}
            </CardTitle>
          </CardHeader>
          {byAuthority.length === 0 ? (
            <EmptyState title={t('noDocuments')} />
          ) : (
            <div className="space-y-2">
              {byAuthority.map((a) => (
                <div key={a.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate">{a.name}</span>
                  <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">{a.value}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase size={16} className="text-emerald-500" />
              {t('statsByDepartment')}
            </CardTitle>
          </CardHeader>
          {byDepartment.length === 0 ? (
            <EmptyState title={t('noDocuments')} />
          ) : (
            <div className="space-y-2">
              {byDepartment.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate">{d.name}</span>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">{d.value}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileType size={16} className="text-violet-500" />
              {t('statsByType')}
            </CardTitle>
          </CardHeader>
          {byDocType.length === 0 ? (
            <EmptyState title={t('noDocuments')} />
          ) : (
            <div className="space-y-2">
              {byDocType.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate">{d.name}</span>
                  <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">{d.value}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Uploads over time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={18} className="text-accent" />
            {t('uploadsOverTime')}
          </CardTitle>
        </CardHeader>
        {uploadsOverTime.length === 0 ? (
          <EmptyState title={t('noDocuments')} />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={uploadsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: 'rgba(26,29,46,0.95)', color: '#fff', fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#6C5CE7" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Last added */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            {t('lastAdded')}
          </CardTitle>
        </CardHeader>
        {recentDocs.length === 0 ? (
          <EmptyState title={t('noRecentActivity')} />
        ) : (
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
                    <FileText size={16} className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.file_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {doc.uploader?.username ?? '—'} · {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge className={classificationColor(doc.classification)}>
                  {doc.classification ?? 'Non-Confidential'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
