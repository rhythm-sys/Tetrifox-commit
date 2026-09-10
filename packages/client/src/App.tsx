import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { RoutePage } from './pages/RoutePage';
import { BatchPage } from './pages/BatchPage';
import { HistoryPage } from './pages/HistoryPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RoutePage />} />
        <Route path="/batch" element={<BatchPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Layout>
  );
}
