import { useEffect, useState, useCallback } from 'react';
import { PenLine, Check, X, Clock, FileText, Send, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import type { SignatureRow, DocumentRow, Profile } from '@/lib/types';
import { classificationColor } from '@/lib/types';
import { toast } from 'sonner';

type SigTab = 'pending' | 'sent' | 'signed' | 'rejected';

export function SignaturesPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [tab, setTab] = useState<SigTab>('pending');
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [rejecting, setRejecting] = useState<SignatureRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sigRes, docRes, userRes] = await Promise.all([
      supabase.from('signatures').select('*, document:documents(*), signer:profiles(*)').order('requested_at', { ascending: false }),
      supabase.from('documents').select('id, file_name, classification').limit(100),
      supabase.from('profiles').select('*').limit(50),
    ]);
    setSignatures((sigRes.data as SignatureRow[]) ?? []);
    setDocs((docRes.data as DocumentRow[]) ?? []);
    setUsers((userRes.data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const pending = signatures.filter((s) => s.status === 'pending' && s.signer_id === profile?.id);
  const sent = signatures.filter((s) => s.status === 'pending' && s.signer_id !== profile?.id);
  const signed = signatures.filter((s) => s.status === 'approved');
  const rejected = signatures.filter((s) => s.status === 'rejected');

  const current = tab === 'pending' ? pending : tab === 'sent' ? sent : tab === 'signed' ? signed : rejected;

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('signatures').update({ status: 'approved', signed_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(t('error')); return; }
    toast.success(t('signatureApproved'));
    loadData();
  };

  const handleReject = async (id: string, reason: string) => {
    const { error } = await supabase.from('signatures').update({ status: 'rejected', signed_at: new Date().toISOString(), notes: reason }).eq('id', id);
    if (error) { toast.error(t('error')); return; }
    toast.success(t('signatureRejected'));
    setRejecting(null);
    loadData();
  };

  const tabs: { key: SigTab; label: string; count: number; icon: typeof Clock }[] = [
    { key: 'pending', label: t('pendingSignatures'), count: pending.length, icon: Clock },
    { key: 'sent', label: t('sentForSignature'), count: sent.length, icon: Send },
    { key: 'signed', label: t('signedDocuments'), count: signed.length, icon: Check },
    { key: 'rejected', label: t('rejectedSignatures'), count: rejected.length, icon: AlertCircle },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('signaturesTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('signaturesDesc')}</p>
        </div>
        <Button onClick={() => setShowSend(true)}><PenLine size={18} /> {t('sendForSignature')}</Button>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/50 overflow-x-auto">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === tb.key ? 'bg-white dark:bg-gray-700 text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <tb.icon size={16} />
            {tb.label}
            <Badge className={tab === tb.key ? 'bg-accent/10 text-accent' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}>{tb.count}</Badge>
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="text-accent" /></div>
        ) : current.length === 0 ? (
          <EmptyState title={tab === 'pending' ? t('noPendingSignatures') : tab === 'sent' ? t('noSentSignatures') : tab === 'signed' ? t('noSignedDocs') : t('noRejectedSignatures')} />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {current.map((sig) => (
              <div key={sig.id} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 rounded-xl bg-accent/10 text-accent shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {sig.document?.file_name ?? t('docForSignature')}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">{sig.signer_name}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{new Date(sig.requested_at).toLocaleDateString()}</span>
                      {sig.document?.classification && (
                        <Badge className={classificationColor(sig.document.classification)}>{sig.document.classification}</Badge>
                      )}
                    </div>
                    {sig.notes && sig.status === 'rejected' && (
                      <p className="text-xs text-red-500 mt-1">{sig.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={sig.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : sig.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'}>
                    {sig.status === 'approved' ? t('sigApproved') : sig.status === 'rejected' ? t('sigRejected') : t('sigPending')}
                  </Badge>
                  {sig.status === 'pending' && tab === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(sig.id)} className="p-2 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition" title={t('approveSignature')}>
                        <Check size={18} />
                      </button>
                      <button onClick={() => setRejecting(sig)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition" title={t('rejectSignature')}>
                        <X size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showSend && (
        <SendSignatureModal docs={docs} users={users} onClose={() => setShowSend(false)} onSent={loadData} />
      )}

      {rejecting && (
        <RejectModal sig={rejecting} onClose={() => setRejecting(null)} onReject={(reason) => handleReject(rejecting.id, reason)} />
      )}
    </div>
  );
}

function SendSignatureModal({ docs, users, onClose, onSent }: { docs: DocumentRow[]; users: Profile[]; onClose: () => void; onSent: () => void }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [docId, setDocId] = useState('');
  const [signerId, setSignerId] = useState('');
  const [signerName, setSignerName] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!docId || !signerName.trim()) return;
    setSending(true);
    const { error } = await supabase.from('signatures').insert({
      document_id: docId,
      signer_id: signerId || null,
      signer_name: signerName,
      status: 'pending',
    });
    setSending(false);
    if (error) { toast.error(t('error')); return; }
    toast.success(t('signatureRequested'));
    onClose();
    onSent();
  };

  return (
    <Modal open onClose={onClose} title={t('sendForSignature')} size="md">
      <div className="space-y-4">
        <Select label={t('docForSignature')} value={docId} onChange={(e) => setDocId(e.target.value)}>
          <option value="">—</option>
          {docs.map((d) => <option key={d.id} value={d.id}>{d.file_name}</option>)}
        </Select>
        <Select label={t('selectSigner')} value={signerId} onChange={(e) => {
          setSignerId(e.target.value);
          const u = users.find((u) => u.id === e.target.value);
          if (u) setSignerName(u.full_name ?? u.username);
        }}>
          <option value="">—</option>
          {users.filter((u) => u.id !== profile?.id).map((u) => <option key={u.id} value={u.id}>{u.full_name ?? u.username}</option>)}
        </Select>
        <Input label={t('signerName')} value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder={t('signerName')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSend} disabled={sending || !docId || !signerName.trim()}>
            {sending ? <Spinner /> : <><Send size={16} /> {t('send')}</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RejectModal({ sig, onClose, onReject }: { sig: SignatureRow; onClose: () => void; onReject: (reason: string) => void }) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');

  return (
    <Modal open onClose={onClose} title={t('rejectSignature')} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{sig.signer_name}</p>
        <Textarea label={t('rejectReason')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('rejectReasonPlaceholder')} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="danger" onClick={() => onReject(reason)} disabled={!reason.trim()}>
            <X size={16} /> {t('rejectSignature')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
