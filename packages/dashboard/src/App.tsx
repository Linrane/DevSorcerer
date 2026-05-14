import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Overview } from './pages/Overview';
import { Sessions } from './pages/Sessions';
import { SessionDetail } from './pages/SessionDetail';
import { CostAnalysis } from './pages/CostAnalysis';
import { RiskFindings } from './pages/RiskFindings';
import { Quality } from './pages/Quality';
import { Knowledge } from './pages/Knowledge';
import { AuditExport } from './pages/AuditExport';
import { Settings } from './pages/Settings';
import { useT } from './i18n';

function NotFound() {
  const { t } = useT();
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-800 mb-4">404</p>
        <p className="text-gray-500 mb-4">{t('Page not found')}</p>
        <a href="/" className="text-sm text-purple-400 hover:text-purple-300">
          {t('Back to Dashboard')}
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="sessions/:id" element={<SessionDetail />} />
          <Route path="cost" element={<CostAnalysis />} />
          <Route path="risk" element={<RiskFindings />} />
          <Route path="quality" element={<Quality />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="audit" element={<AuditExport />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
