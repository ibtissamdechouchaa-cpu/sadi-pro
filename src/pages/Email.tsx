import { useEffect, useState, useCallback } from 'react';
import { Mail, Send, Inbox, Archive, Paperclip, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import type { EmailLogRow, DocumentRow } from '@/lib/types';
import { classificationColor } from '@/lib/types';
import { toast } from 'sonner';

type EmailTab = 'inbox' | 'sent';

export function EmailPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [tab, setTab] = useState<EmailTab>('inbox');
  const [emails, setEmails] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selected, setSelected] = useState<EmailLogRow | null>(null);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('email_log')
      .select('*, document:documents(*)')
      .order('sent_at', { ascending: false })
      .limit(100);
    setEmails((data as EmailLogRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  const inboxEmails = emails.filter((e) => e.recipient && e.recipient !== profile?.username);
  const sentEmails = emails.filter((e) => e.sender === profile?.username || (!e.sender && tab === 'sent'));
  const current = tab === 'inbox' ? inboxEmails : sentEmails;

  const handleArchive = async (email: EmailLogRow) => {
    if (!email.document_id) {
      const { data } = await supabase.from('documents').insert({
        file_name: email.subject ?? 'Archived email',
        type: 'text',
        content_text: email.body ?? '',
        uploaded_by: profile?.id,
        authority: email.sender ?? null,
        status: 'archived',
        lifecycle_stage: 'archived',
      }).select('id').maybeSingle();
      if (data) {
        await supabase.from('email_log').update({ document_id: data.id }).eq('id', email.id);
        toast.success(t('emailArchived'));
        loadEmails();
      }
    }
  };

  const tabs = [
    { key: 'inbox' as const, label: t('inbox'), icon: Inbox, count: inboxEmails.length },
    { key: 'sent' as const, label: t('sent'), icon: Send, count: sentEmails.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('emailTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('emailDesc')}</p>
        </div>
        <Button onClick={() => setShowCompose(true)}><Mail size={18} /> {t('composeEmail')}</Button>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/50">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${tab === tb.key ? 'bg-white dark:bg-gray-700 text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <tb.icon size={16} /> {tb.label}
            <Badge className={tab === tb.key ? 'bg-accent/10 text-accent' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}>{tb.count}</Badge>
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="text-accent" /></div>
        ) : current.length === 0 ? (
          <EmptyState title={t('emailEmpty')} description={t('emailEmptyDesc')} />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {current.map((email) => (
              <div key={email.id} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer"
                onClick={() => setSelected(email)}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {email.subject ?? '(no subject)'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">
                        {tab === 'inbox' ? `${t('emailSender')}: ${email.sender ?? '—'}` : `${t('emailRecipient')}: ${email.recipient ?? '—'}`}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{new Date(email.sent_at).toLocaleDateString()}</span>
                      {email.document_id && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                          <Paperclip size={10} className="inline mr-1" />{t('attachments')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <Badge className={email.status === 'sent' ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}>
                    {email.status === 'sent' ? t('emailSent') : t('emailReceived')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onSent={loadEmails} />}

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={selected.subject ?? '(no subject)'} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">{t('emailSender')}</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{selected.sender ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('emailRecipient')}</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{selected.recipient ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('emailSentAt')}</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(selected.sent_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('emailStatus')}</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{selected.status}</p>
              </div>
            </div>
            {selected.body && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('message')}</p>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selected.body}
                </div>
              </div>
            )}
            {selected.document && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <FileText size={18} className="text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{selected.document.file_name}</p>
                  {selected.document.classification && (
                    <Badge className={classificationColor(selected.document.classification)}>{selected.document.classification}</Badge>
                  )}
                </div>
              </div>
            )}
            {!selected.document_id && tab === 'inbox' && (
              <Button variant="ghost" onClick={() => handleArchive(selected)}>
                <Archive size={16} /> {t('archiveEmail')}
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [docId, setDocId] = useState('');
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from('documents').select('id, file_name, classification').limit(50).then(({ data }) => {
      setDocs((data as DocumentRow[]) ?? []);
    });
  }, []);

  const handleSend = async () => {
    if (!recipient.trim() || !subject.trim()) return;
    setSending(true);
    const { error } = await supabase.from('email_log').insert({
      sender: profile?.username,
      recipient: recipient.trim(),
      subject: subject.trim(),
      body: body || null,
      document_id: docId || null,
      sent_at: new Date().toISOString(),
      status: 'sent',
    });
    setSending(false);
    if (error) { toast.error(t('error')); return; }
    toast.success(t('emailSentSuccess'));
    onClose();
    onSent();
  };

  return (
    <Modal open onClose={onClose} title={t('composeEmail')} size="md">
      <div className="space-y-4">
        <Input label={t('recipient')} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={t('recipient')} />
        <Input label={t('emailSubject')} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('emailSubject')} />
        <Textarea label={t('message')} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('message')} />
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{t('attachments')}</p>
          <select value={docId} onChange={(e) => setDocId(e.target.value)} className="input-base text-sm w-full">
            <option value="">—</option>
            {docs.map((d) => <option key={d.id} value={d.id}>{d.file_name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSend} disabled={sending || !recipient.trim() || !subject.trim()}>
            {sending ? <Spinner /> : <><Send size={16} /> {t('sendEmailBtn')}</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
