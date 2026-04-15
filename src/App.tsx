import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { MainLayout } from './components/layout/MainLayout';
import { AuthPage } from './pages/auth/AuthPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CreateAppPage } from './pages/create/CreateAppPage';
import { AppDetailPage } from './pages/app/AppDetailPage';
import { TesterPortalPage } from './pages/tester/TesterPortalPage';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/create" element={<CreateAppPage />} />
            <Route path="/app/:id" element={<AppDetailPage />} />
          </Route>
          <Route path="/test/:id" element={<TesterPortalPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
