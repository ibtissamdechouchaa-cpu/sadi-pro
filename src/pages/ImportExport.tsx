import { useEffect, useState, useCallback } from 'react';
import { Download, Upload, FileJson, FileSpreadsheet, FileCode, Plug, CheckCircle, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AuditLogRow, DocumentRow } from '@/lib/types';
import { toast } from 'sonner';

export function ImportExportPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_log')
      .select('*, user:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(50);
    setAuditLogs((data as AuditLogRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAudit(); }, [loadAudit]);

  const logAudit = async (action: string, details: Record<string, unknown>) => {
    await supabase.from('audit_log').insert({
      user_id: profile?.id,
      action,
      entity_type: 'document',
      details,
    });
  };

  const exportData = async (format: 'json' | 'csv' | 'xml') => {
    const { data } = await supabase
      .from('documents')
      .select('*, person:people(name), category:categories(name)')
      .order('created_at', { ascending: false })
      .limit(1000);

    const docs = (data as DocumentRow[]) ?? [];
    let content = '';
    let mime = '';

    if (format === 'json') {
      content = JSON.stringify(docs, null, 2);
      mime = 'application/json';
    } else if (format === 'csv') {
      const headers = ['file_name', 'document_number', 'classification', 'authority', 'department', 'doc_type', 'document_date', 'expiry_date', 'retention_years', 'status', 'created_at'];
      const rows = docs.map((d) => headers.map((h) => `"${String((d as unknown as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`).join(','));
      content = [headers.join(','), ...rows].join('\n');
      mime = 'text/csv';
    } else {
      const items = docs.map((d) => `  <document>\n    <name>${d.file_name}</name>\n    <number>${d.document_number ?? ''}</number>\n    <classification>${d.classification ?? ''}</classification>\n    <authority>${d.authority ?? ''}</authority>\n    <department>${d.department ?? ''}</department>\n  </document>`).join('\n');
      content = `<?xml version="1.0" encoding="UTF-8"?>\n<documents>\n${items}\n</documents>`;
      mime = 'application/xml';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sadi-export-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);

    await logAudit('export', { format, count: docs.length });
    toast.success(t('exportSuccess'));
    loadAudit();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const items = JSON.parse(text) as Record<string, unknown>[];
      let count = 0;
      for (const item of items) {
        const { error } = await supabase.from('documents').insert({
          file_name: String(item.file_name ?? 'Imported'),
          type: 'text',
          uploaded_by: profile?.id,
          classification: String(item.classification ?? 'Non-Confidential'),
          authority: item.authority ? String(item.authority) : null,
          department: item.department ? String(item.department) : null,
          doc_type: item.doc_type ? String(item.doc_type) : null,
          document_number: item.document_number ? String(item.document_number) : null,
          document_date: item.document_date ? String(item.document_date) : null,
          notes: item.notes ? String(item.notes) : null,
        });
        if (!error) count++;
      }
      await logAudit('import', { file: file.name, count });
      toast.success(`${t('importSuccess')} (${count})`);
      loadAudit();
    } catch {
      toast.error(t('importError'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const exportFormats = [
    { format: 'json' as const, icon: FileJson, label: t('exportJSON'), color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { format: 'csv' as const, icon: FileSpreadsheet, label: t('exportCSV'), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { format: 'xml' as const, icon: FileCode, label: t('exportXML'), color: 'text-sky-500', bg: 'bg-sky-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('importExportTitle')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('importExportDesc')}</p>
      </div>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download size={18} className="text-accent" />
            {t('exportData')}
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {exportFormats.map((f) => (
            <button key={f.format} onClick={() => exportData(f.format)} className="group">
              <Card className="flex items-center gap-3 hover:border-accent/40 transition cursor-pointer h-full">
                <div className={`p-3 rounded-xl ${f.bg} group-hover:scale-110 transition`}>
                  <f.icon size={24} className={f.color} />
                </div>
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{f.label}</span>
              </Card>
            </button>
          ))}
        </div>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={18} className="text-accent" />
            {t('importData')}
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-accent hover:bg-accent/5 transition">
            {importing ? <Spinner className="text-accent" /> : <FileJson size={32} className="text-gray-400" />}
            <span className="text-sm text-gray-500">{t('importJSON')}</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </Card>

      {/* API Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug size={18} className="text-accent" />
            {t('apiIntegration')}
          </CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('apiDesc')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label={t('apiEndpoint')} placeholder="https://api.external-system.com/v1" readOnly />
          <Input label={t('apiKey')} placeholder="••••••••••••••••" readOnly />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Button variant="ghost" size="sm">{t('testConnection')}</Button>
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckCircle size={14} className="inline mr-1" /> {t('connectionOk')}
          </Badge>
        </div>
        <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
          <History size={12} /> {t('auditTrail')}
        </p>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={18} className="text-accent" />
            {t('auditLogTitle')}
          </CardTitle>
        </CardHeader>
        {loading ? (
          <div className="py-8 flex justify-center"><Spinner className="text-accent" /></div>
        ) : auditLogs.length === 0 ? (
          <EmptyState title={t('noAuditEntries')} />
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge className="bg-accent/10 text-accent">{log.action}</Badge>
                  <div className="min-w-0">
                    <p className="text-gray-600 dark:text-gray-400 truncate">
                      {log.entity_type ?? '—'} · {log.user?.username ?? '—'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
