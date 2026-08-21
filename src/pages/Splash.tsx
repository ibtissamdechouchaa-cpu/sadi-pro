import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { supabase } from '@/lib/supabase';

export function SplashPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { t } = useI18n();
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'err'>('checking');

  useEffect(() => {
    const check = async () => {
      try {
        const { error } = await supabase.from('categories').select('id').limit(1);
        setDbStatus(error ? 'err' : 'ok');
      } catch {
        setDbStatus('err');
      }
    };
    check();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        navigate(session ? '/dashboard' : '/login', { replace: true });
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [loading, session, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F1117] text-white">
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl bg-accent/30 blur-2xl animate-pulse" />
        <img src="/images/image copy 3.png" alt="SADI PRO" className="relative w-20 h-20 rounded-3xl object-cover shadow-2xl animate-scale-in" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight animate-fade-in">{t('appName')}</h1>
      <p className="mt-1 text-sm text-gray-400 animate-fade-in">{t('appTagline')}</p>

      <div className="mt-8 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          {dbStatus === 'checking' && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
          {dbStatus === 'ok' && <CheckCircle2 size={16} className="text-emerald-400" />}
          {dbStatus === 'err' && <XCircle size={16} className="text-red-400" />}
          <span className="text-gray-400">Database</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-gray-400">Auth</span>
        </div>
      </div>
    </div>
  );
}
