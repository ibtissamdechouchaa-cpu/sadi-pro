import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme-context';
import { I18nProvider } from '@/lib/i18n-context';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { AppLayout } from '@/components/layout/AppLayout';
import { SplashPage } from '@/pages/Splash';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { DocumentsPage } from '@/pages/Documents';
import { UploadPage } from '@/pages/Upload';
import { PeoplePage } from '@/pages/People';
import { ProfilePage } from '@/pages/Profile';
import { UsersPage } from '@/pages/Users';
import { AIChatPage } from '@/pages/AIChat';
import { OCRPage } from '@/pages/OCR';
import { ConversionPage } from '@/pages/Conversion';
import { RisksPage } from '@/pages/Risks';
import { ReportsPage } from '@/pages/Reports';
import { CompliancePage } from '@/pages/Compliance';
import { ImportExportPage } from '@/pages/ImportExport';
import { SignaturesPage } from '@/pages/Signatures';
import { EmailPage } from '@/pages/Email';
import { SmartSearchPage } from '@/pages/SmartSearch';
import { SettingsPage } from '@/pages/Settings';

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/chat" element={<AIChatPage />} />
        <Route path="/ocr" element={<OCRPage />} />
        <Route path="/conversion" element={<ConversionPage />} />
        <Route path="/risks" element={<RisksPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/import-export" element={<ImportExportPage />} />
        <Route path="/signatures" element={<SignaturesPage />} />
        <Route path="/email" element={<EmailPage />} />
        <Route path="/smart-search" element={<SmartSearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute adminOnly>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton />
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
