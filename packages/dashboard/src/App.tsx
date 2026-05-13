import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Overview } from './pages/Overview';
import { Sessions } from './pages/Sessions';
import { SessionDetail } from './pages/SessionDetail';
import { CostAnalysis } from './pages/CostAnalysis';
import { RiskFindings } from './pages/RiskFindings';
import { Quality } from './pages/Quality';
import { Knowledge } from './pages/Knowledge';
import { AuditExport } from './pages/AuditExport';
import { Settings } from './pages/Settings';

export default function App() {
  return (
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
      </Route>
    </Routes>
  );
}
