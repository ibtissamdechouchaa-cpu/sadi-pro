import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Upload,
  MessageSquare,
  Users,
  ScanText,
  Repeat,
  UserCog,
  ChevronLeft,
  ChevronRight,
  LogOut,
  AlertTriangle,
  BarChart3,
  Scale,
  ArrowLeftRight,
  PenLine,
  Mail,
  Search,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { useTheme } from '@/lib/theme-context';
import { roleColor } from '@/lib/types';
import { Moon, Sun, Languages } from 'lucide-react';
import type { Lang } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  labelKey: TranslationKey;
  adminOnly?: boolean;
}

// Ordered per SADI PRO workflow: users → dashboard → documents → upload →
// import/export → conversion → OCR/AI → classification → compliance →
// risks → signatures → email → audit → search → reports → settings
const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { to: '/documents', icon: FileText, labelKey: 'documents' },
  { to: '/upload', icon: Upload, labelKey: 'upload' },
  { to: '/import-export', icon: ArrowLeftRight, labelKey: 'importExport' },
  { to: '/conversion', icon: Repeat, labelKey: 'conversion' },
  { to: '/ocr', icon: ScanText, labelKey: 'ocr' },
  { to: '/chat', icon: MessageSquare, labelKey: 'aiChat' },
  { to: '/compliance', icon: Scale, labelKey: 'compliance' },
  { to: '/risks', icon: AlertTriangle, labelKey: 'risks' },
  { to: '/signatures', icon: PenLine, labelKey: 'signatures' },
  { to: '/email', icon: Mail, labelKey: 'emailLog' },
  { to: '/smart-search', icon: Search, labelKey: 'smartSearch' },
  { to: '/reports', icon: BarChart3, labelKey: 'reports' },
  { to: '/settings', icon: Settings, labelKey: 'settings' },
  { to: '/people', icon: Users, labelKey: 'people' },
  { to: '/users', icon: UserCog, labelKey: 'users', adminOnly: true },
];

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter((item) => !item.adminOnly || profile?.role === 'admin');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside
      className={`flex flex-col h-screen sticky top-0 glass border-r border-gray-200/60 dark:border-gray-700/50 transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0 overflow-hidden">
        <img src="/images/image copy 3.png" alt="SADI PRO" className="w-9 h-9 rounded-xl object-cover shrink-0" />
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{t('appName')}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{t('appTagline')}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition group ${
                isActive
                  ? 'bg-accent/10 text-accent dark:text-accent-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`
            }
            title={collapsed ? t(item.labelKey) : undefined}
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span className="animate-fade-in">{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="px-2 py-3 space-y-1 border-t border-gray-200/60 dark:border-gray-700/50">
        <LangSwitcher collapsed={collapsed} />
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title={collapsed ? (theme === 'dark' ? t('lightMode') : t('darkMode')) : undefined}
        >
          {theme === 'dark' ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
          {!collapsed && <span className="animate-fade-in">{theme === 'dark' ? t('lightMode') : t('darkMode')}</span>}
        </button>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive
                ? 'bg-accent/10 text-accent'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`
          }
          title={collapsed ? profile?.username : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {(profile?.username ?? '?')[0].toUpperCase()}
          </div>
          {!collapsed && (
            <div className="animate-fade-in min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{profile?.username}</p>
              <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${roleColor(profile?.role)}`}>
                {profile?.role}
              </span>
            </div>
          )}
        </NavLink>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition"
          title={collapsed ? t('logout') : undefined}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="animate-fade-in">{t('logout')}</span>}
        </button>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && <span className="animate-fade-in text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function LangSwitcher({ collapsed }: { collapsed: boolean }) {
  const { lang, setLang } = useI18n();
  const langs: Lang[] = ['en', 'ar', 'fr'];
  if (collapsed) {
    return (
      <div className="flex justify-center px-1 py-1">
        <Languages size={20} className="text-gray-400" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800/50 animate-fade-in">
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`flex-1 px-2 py-1 rounded-lg text-xs font-medium uppercase transition ${
            lang === l
              ? 'bg-white dark:bg-gray-700 text-accent shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
