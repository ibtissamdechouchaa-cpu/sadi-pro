import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import type { Person, DocumentRow } from '@/lib/types';
import { toast } from 'sonner';

export function PeoplePage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [people, setPeople] = useState<(Person & { doc_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('people')
      .select('*, documents(count)')
      .order('name');
    if (error) {
      toast.error(t('error'));
      setLoading(false);
      return;
    }
    const enriched = (data ?? []).map((p: Person & { documents?: { count: number }[] }) => ({
      ...p,
      doc_count: p.documents?.[0]?.count ?? 0,
    }));
    setPeople(enriched);
    setLoading(false);
  }, [t]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('people').insert({ name: newName.trim(), created_by: profile?.id });
    setAdding(false);
    if (error) {
      toast.error(error.code === '23505' ? t('addPersonError') : t('addPersonError'));
    } else {
      toast.success(t('addPersonSuccess'));
      setNewName('');
      setShowAdd(false);
      loadPeople();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deletePerson'))) return;
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) {
      toast.error(t('error'));
    } else {
      toast.success(t('addPersonSuccess'));
      loadPeople();
    }
  };

  const filtered = people.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('peopleTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{people.length} {t('people').toLowerCase()}</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={18} />
          {t('addPerson')}
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
          <EmptyState
            title={t('noPeople')}
            description={t('noPeopleDesc')}
            action={<Button onClick={() => setShowAdd(true)}><Plus size={16} /> {t('addPerson')}</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-700 text-white flex items-center justify-center font-bold shrink-0">
                    {person.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{person.name}</p>
                    <Badge className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {person.doc_count ?? 0} {t('documents').toLowerCase()}
                    </Badge>
                  </div>
                </div>
                {person.created_by === profile?.id && (
                  <button
                    onClick={() => handleDelete(person.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('addPerson')} size="sm">
        <div className="space-y-4">
          <Input
            label={t('personName')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('personName')}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>{t('cancel')}</Button>
            <Button onClick={handleAdd} disabled={adding || !newName.trim()}>
              {adding ? <Spinner /> : t('create')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
