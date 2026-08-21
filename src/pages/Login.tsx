import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from 'sonner';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(t('loginError'));
        } else {
          toast.success(t('welcome'));
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password, username, fullName);
        if (error) {
          setError(error);
        } else {
          toast.success(t('signupSuccess'));
          setMode('login');
          setUsername('');
          setFullName('');
          setPassword('');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-[#0F1117] via-[#15172a] to-[#1a1d3a]">
      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-accent/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent-700/10 blur-3xl animate-pulse" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/images/image copy 3.png" alt="SADI PRO" className="w-16 h-16 rounded-2xl object-cover shadow-xl animate-scale-in" />
          <h1 className="mt-4 text-2xl font-bold text-white">{t('appName')}</h1>
          <p className="text-sm text-gray-400">{t('appTagline')}</p>
        </div>

        <div className="glass-card p-8 animate-fade-in">
          <div className="flex gap-2 mb-6 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/50">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'login'
                  ? 'bg-white dark:bg-gray-700 text-accent shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('login')}
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'signup'
                  ? 'bg-white dark:bg-gray-700 text-accent shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('signup')}
            </button>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {mode === 'login' ? t('signInTo') : t('createAccount')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('demoCreds')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('username')}
                    className="input-base pl-10"
                  />
                </div>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('fullName')}
                    className="input-base pl-10"
                  />
                </div>
              </>
            )}
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email')}
                className="input-base pl-10"
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password')}
                className="input-base pl-10"
                minLength={6}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Spinner /> : mode === 'login' ? t('login') : t('signup')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {mode === 'login' ? t('noAccount') : t('haveAccount')}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-accent font-medium hover:underline"
            >
              {mode === 'login' ? t('signup') : t('login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
