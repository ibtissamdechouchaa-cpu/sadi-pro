import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Scale, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ComplianceRuleRow } from '@/lib/types';
import { toast } from 'sonner';

export function CompliancePage() {
  const { t } = useI18n();
  const [rules, setRules] = useState<ComplianceRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ComplianceRuleRow | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('compliance_rules').select('*').order('domain, law_name');
    setRules((data as ComplianceRuleRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete'))) return;
    await supabase.from('compliance_rules').delete().eq('id', id);
    toast.success(t('ruleUpdated'));
    load();
  };

  const algerian = rules.filter((r) => r.law_number && r.law_number.match(/^\d+-\d+$/));
  const international = rules.filter((r) => !r.law_number || !r.law_number.match(/^\d+-\d+$/));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('complianceTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('complianceDesc')}</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus size={18} /> {t('addRule')}
        </Button>
      </div>

      {/* Compliance status banner */}
      <Card className="border-l-4 border-l-emerald-500">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} className="text-emerald-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{t('complianceStatus')}: {t('compliant')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('auditTrail')}</p>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="py-20 flex justify-center"><Spinner className="text-accent" /></div>
      ) : (
        <div className="space-y-6">
          {/* Algerian Laws */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Scale size={16} /> {t('algerianLaws')}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {algerian.map((rule) => (
                <RuleCard key={rule.id} rule={rule} t={t} onEdit={() => { setEditing(rule); setShowModal(true); }} onDelete={() => handleDelete(rule.id)} />
              ))}
            </div>
          </div>

          {/* International Standards */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Globe size={16} /> {t('internationalStandards')}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {international.map((rule) => (
                <RuleCard key={rule.id} rule={rule} t={t} onEdit={() => { setEditing(rule); setShowModal(true); }} onDelete={() => handleDelete(rule.id)} />
              ))}
            </div>
          </div>

          {rules.length === 0 && <EmptyState title={t('noRules')} />}
        </div>
      )}

      {showModal && (
        <RuleModal rule={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}

function RuleCard({ rule, t, onEdit, onDelete }: { rule: ComplianceRuleRow; t: (k: never) => string; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-accent/10 text-accent shrink-0">
            {rule.law_number?.match(/^\d/) ? <Scale size={18} /> : <Globe size={18} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-gray-900 dark:text-gray-100">{rule.law_name}</p>
              {rule.law_number && <Badge className="bg-accent/10 text-accent">{rule.law_number}</Badge>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rule.domain}</p>
            {rule.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{rule.description}</p>}
            {rule.reference && <p className="text-xs text-gray-400 mt-1">{rule.reference}</p>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition">
            <Pencil size={16} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function RuleModal({ rule, onClose, onSaved }: { rule: ComplianceRuleRow | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    law_name: rule?.law_name ?? '',
    law_number: rule?.law_number ?? '',
    domain: rule?.domain ?? '',
    description: rule?.description ?? '',
    reference: rule?.reference ?? '',
    is_active: rule?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    if (rule) {
      const { error } = await supabase.from('compliance_rules').update(form).eq('id', rule.id);
      if (error) toast.error(t('saveError')); else { toast.success(t('ruleUpdated')); onSaved(); }
    } else {
      const { error } = await supabase.from('compliance_rules').insert(form);
      if (error) toast.error(t('saveError')); else { toast.success(t('ruleCreated')); onSaved(); }
    }
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={rule ? t('editRule') : t('addRule')} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('lawName')} value={form.law_name} onChange={(e) => setForm({ ...form, law_name: e.target.value })} />
          <Input label={t('lawNumber')} value={form.law_number} onChange={(e) => setForm({ ...form, law_number: e.target.value })} />
          <Input label={t('domain')} value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
          <Input label={t('reference')} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </div>
        <Textarea label={t('complianceNotes')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded accent-[#6C5CE7]" />
          {t('typeActive')}
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !form.law_name.trim()}>
            {saving ? <Spinner /> : t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
