import { useState } from 'react';
import { User, Lock, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { roleColor } from '@/lib/types';
import { toast } from 'sonner';

export function ProfilePage() {
  const { profile, refreshProfile, session } = useAuth();
  const { t } = useI18n();
  const [form, setForm] = useState({
    username: profile?.username ?? '',
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    bio: profile?.bio ?? '',
    department: profile?.department ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: form.username,
        full_name: form.full_name || null,
        phone: form.phone || null,
        bio: form.bio || null,
        department: form.department || null,
      })
      .eq('id', profile?.id);
    setSaving(false);
    if (error) {
      toast.error(t('error'));
    } else {
      toast.success(t('profileUpdated'));
      refreshProfile();
    }
  };

  const handleChangePw = async () => {
    if (newPassword.length < 6) return;
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) {
      toast.error(t('passwordError'));
    } else {
      toast.success(t('passwordChanged'));
      setNewPassword('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('profileTitle')}</h1>
      </div>

      {/* Profile header */}
      <Card className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-700 text-white flex items-center justify-center text-2xl font-bold">
          {(profile?.username ?? '?')[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{profile?.full_name || profile?.username}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
          <Badge className={`mt-1 ${roleColor(profile?.role)}`}>{profile?.role}</Badge>
        </div>
      </Card>

      {/* Edit profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User size={18} /> {t('profileTitle')}</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('username')} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input label={t('fullName')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input label={t('phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label={t('department')} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <Textarea label={t('bio')} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner /> : <><Save size={16} /> {t('updateProfile')}</>}
            </Button>
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock size={18} /> {t('changePassword')}</CardTitle>
        </CardHeader>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              type="password"
              label={t('newPassword')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <Button onClick={handleChangePw} disabled={changingPw || newPassword.length < 6}>
            {changingPw ? <Spinner /> : t('update')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
