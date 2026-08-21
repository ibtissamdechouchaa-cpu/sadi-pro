import { useEffect, useState, useCallback } from 'react';
import { UserCog, Plus, Trash2, Pencil, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { roleColor, ROLES } from '@/lib/types';
import type { Profile, Role } from '@/lib/types';
import { toast } from 'sonner';

export function UsersPage() {
  const { profile: me } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error(t('error'));
    } else {
      setUsers((data as Profile[]) ?? []);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (id: string) => {
    if (id === me?.id) {
      toast.error(t('userError'));
      return;
    }
    if (!confirm(t('deleteUser'))) return;
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: id });
    if (error) {
      toast.error(t('userError'));
    } else {
      toast.success(t('userDeleted'));
      loadUsers();
    }
  };

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('usersTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} {t('users').toLowerCase()}</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={18} />
          {t('addUser')}
        </Button>
      </div>

      <Card>
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchDocuments')}
            className="input-base pl-10"
          />
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner className="text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title={t('noUsers')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left font-medium">{t('username')}</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">{t('fullName')}</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{t('department')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('role')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                          {u.username[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">{u.full_name ?? '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">{u.department ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={roleColor(u.role)}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(u); setShowForm(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition"
                        >
                          <Pencil size={16} />
                        </button>
                        {u.id !== me?.id && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showForm && (
        <UserForm
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadUsers(); }}
        />
      )}
    </div>
  );
}

function UserForm({ editing, onClose, onSaved }: { editing: Profile | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    username: editing?.username ?? '',
    email: '',
    password: '',
    role: (editing?.role ?? 'user') as Role,
    full_name: editing?.full_name ?? '',
    phone: editing?.phone ?? '',
    department: editing?.department ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.rpc('admin_update_user', {
          p_user_id: editing.id,
          p_username: form.username,
          p_role: form.role,
          p_full_name: form.full_name || null,
          p_phone: form.phone || null,
          p_department: form.department || null,
        });
        if (error) throw error;
        toast.success(t('userUpdated'));
      } else {
        const { error } = await supabase.rpc('admin_create_user', {
          p_username: form.username,
          p_email: form.email,
          p_password: form.password,
          p_role: form.role,
          p_full_name: form.full_name || null,
          p_phone: form.phone || null,
          p_department: form.department || null,
        });
        if (error) throw error;
        toast.success(t('userCreated'));
      }
      onSaved();
    } catch {
      toast.error(t('userError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={editing ? t('editUser') : t('addUser')} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('username')} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label={t('fullName')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          {!editing && (
            <>
              <Input type="email" label={t('email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input type="password" label={t('password')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </>
          )}
          <Input label={t('phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('department')} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <Select label={t('role')} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !form.username || (!editing && (!form.email || !form.password))}>
            {saving ? <Spinner /> : editing ? t('update') : t('create')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
