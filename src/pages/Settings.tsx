import { useState } from 'react';
import { Settings as SettingsIcon, Building2, FileText, Shield, Mail, PenLine, Sparkles, Database, Bell, Palette, Save } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { useTheme } from '@/lib/theme-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from 'sonner';
import type { Lang } from '@/lib/i18n';
import { CLASSIFICATIONS } from '@/lib/types';
import type { Classification } from '@/lib/types';

type SettingsSection = 'general' | 'organization' | 'fileTypes' | 'classification' | 'retention' | 'email' | 'signature' | 'ai' | 'backup' | 'notifications';

export function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const [section, setSection] = useState<SettingsSection>('general');
  const [saving, setSaving] = useState(false);

  const [orgSettings, setOrgSettings] = useState({ name: '', address: '' });
  const [fileSettings, setFileSettings] = useState({ types: 'pdf,doc,docx,xls,xlsx,jpg,png', maxSize: '50' });
  const [classSettings, setClassSettings] = useState({ default: 'Non-Confidential' as Classification });
  const [retentionSettings, setRetentionSettings] = useState({ defaultYears: '5' });
  const [emailSettings, setEmailSettings] = useState({ server: '', port: '587', user: '', password: '' });
  const [sigSettings, setSigSettings] = useState({ enabled: true, requireApproval: true });
  const [aiSettings, setAiSettings] = useState({ enabled: true, model: 'gpt-4', temperature: '0.3', enableOCR: true });
  const [backupSettings, setBackupSettings] = useState({ frequency: 'weekly', lastBackup: '—' });
  const [notifSettings, setNotifSettings] = useState({ enabled: true, emailAlerts: true, expiryAlerts: true });

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success(t('settingsSaved'));
    }, 600);
  };

  const sections: { key: SettingsSection; label: string; icon: typeof Building2 }[] = [
    { key: 'general', label: t('generalSettings'), icon: SettingsIcon },
    { key: 'organization', label: t('organizationSettings'), icon: Building2 },
    { key: 'fileTypes', label: t('fileTypesSettings'), icon: FileText },
    { key: 'classification', label: t('classificationRules'), icon: Shield },
    { key: 'retention', label: t('retentionSettings'), icon: Database },
    { key: 'email', label: t('emailSettings'), icon: Mail },
    { key: 'signature', label: t('signatureSettings'), icon: PenLine },
    { key: 'ai', label: t('aiSettings'), icon: Sparkles },
    { key: 'backup', label: t('backupSettings'), icon: Database },
    { key: 'notifications', label: t('notificationSettings'), icon: Bell },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settingsTitle')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settingsDesc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
        {/* Section nav */}
        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          {sections.map((s) => (
            <button key={s.key} onClick={() => setSection(s.key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${section === s.key ? 'bg-accent/10 text-accent' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <s.icon size={16} /> {s.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {sections.find((s) => s.key === section)?.icon && (() => {
                const Icon = sections.find((s) => s.key === section)!.icon;
                return <Icon size={18} className="text-accent" />;
              })()}
              {sections.find((s) => s.key === section)?.label}
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            {section === 'general' && (
              <>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">{t('language')}</p>
                  <div className="flex gap-2">
                    {(['en', 'ar', 'fr'] as Lang[]).map((l) => (
                      <button key={l} onClick={() => setLang(l)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium uppercase transition ${lang === l ? 'bg-accent text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">{t('appearance')}</p>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={toggle}>
                      {theme === 'dark' ? t('lightMode') : t('darkMode')}
                    </Button>
                    <span className="text-sm text-gray-500">{theme === 'dark' ? '🌙' : '☀️'}</span>
                  </div>
                </div>
              </>
            )}

            {section === 'organization' && (
              <>
                <Input label={t('orgName')} value={orgSettings.name} onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })} placeholder="SADI" />
                <Textarea label={t('orgAddress')} value={orgSettings.address} onChange={(e) => setOrgSettings({ ...orgSettings, address: e.target.value })} />
              </>
            )}

            {section === 'fileTypes' && (
              <>
                <Input label={t('allowedFileTypes')} value={fileSettings.types} onChange={(e) => setFileSettings({ ...fileSettings, types: e.target.value })} />
                <Input type="number" label={t('maxFileSize')} value={fileSettings.maxSize} onChange={(e) => setFileSettings({ ...fileSettings, maxSize: e.target.value })} />
              </>
            )}

            {section === 'classification' && (
              <Select label={t('defaultClassification')} value={classSettings.default} onChange={(e) => setClassSettings({ ...classSettings, default: e.target.value as Classification })}>
                {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            )}

            {section === 'retention' && (
              <Input type="number" label={t('defaultRetention')} value={retentionSettings.defaultYears} onChange={(e) => setRetentionSettings({ ...retentionSettings, defaultYears: e.target.value })} />
            )}

            {section === 'email' && (
              <>
                <Input label={t('smtpServer')} value={emailSettings.server} onChange={(e) => setEmailSettings({ ...emailSettings, server: e.target.value })} placeholder="smtp.example.com" />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" label={t('smtpPort')} value={emailSettings.port} onChange={(e) => setEmailSettings({ ...emailSettings, port: e.target.value })} />
                  <Input label={t('smtpUser')} value={emailSettings.user} onChange={(e) => setEmailSettings({ ...emailSettings, user: e.target.value })} />
                </div>
                <Input type="password" label={t('smtpPassword')} value={emailSettings.password} onChange={(e) => setEmailSettings({ ...emailSettings, password: e.target.value })} />
              </>
            )}

            {section === 'signature' && (
              <>
                <Toggle label={t('electronicSignature')} value={sigSettings.enabled} onChange={(v) => setSigSettings({ ...sigSettings, enabled: v })} />
                <Toggle label={t('approvalRequired')} value={sigSettings.requireApproval} onChange={(v) => setSigSettings({ ...sigSettings, requireApproval: v })} />
              </>
            )}

            {section === 'ai' && (
              <>
                <Toggle label={t('enableAI')} value={aiSettings.enabled} onChange={(v) => setAiSettings({ ...aiSettings, enabled: v })} />
                <Toggle label={t('enableOCR')} value={aiSettings.enableOCR} onChange={(v) => setAiSettings({ ...aiSettings, enableOCR: v })} />
                <Input label={t('aiModel')} value={aiSettings.model} onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })} />
                <Input type="number" label={t('aiTemperature')} value={aiSettings.temperature} onChange={(e) => setAiSettings({ ...aiSettings, temperature: e.target.value })} />
              </>
            )}

            {section === 'backup' && (
              <>
                <Select label={t('backupFrequency')} value={backupSettings.frequency} onChange={(e) => setBackupSettings({ ...backupSettings, frequency: e.target.value })}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </Select>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">{t('lastBackup')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{backupSettings.lastBackup}</p>
                </div>
              </>
            )}

            {section === 'notifications' && (
              <>
                <Toggle label={t('enableNotifications')} value={notifSettings.enabled} onChange={(v) => setNotifSettings({ ...notifSettings, enabled: v })} />
                <Toggle label={t('emailSent')} value={notifSettings.emailAlerts} onChange={(v) => setNotifSettings({ ...notifSettings, emailAlerts: v })} />
                <Toggle label={t('expiringSoon')} value={notifSettings.expiryAlerts} onChange={(v) => setNotifSettings({ ...notifSettings, expiryAlerts: v })} />
              </>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Spinner /> : <><Save size={16} /> {t('saveChanges')}</>}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition ${value ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
