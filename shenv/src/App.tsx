/**
 * Main App component with routing
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './pages/Dashboard';
import { SheetDetails } from './pages/SheetDetails';
import { GmailDashboard } from './pages/GmailDashboard';
import { GmailAuthSuccess } from './pages/GmailAuthSuccess';
import { GmailAuthError } from './pages/GmailAuthError';
import DriveDashboard from './pages/DriveDashboard';
import DriveAuthCallback from './pages/DriveAuthCallback';
import AssetsPage from './pages/AssetsPage';
import ScanQueuePage from './pages/ScanQueuePage';
import ProgressPage from './pages/ProgressPage';
import OrganizationPage from './pages/OrganizationPage';
import UserDetailPage from './pages/UserDetailPage';
import DepartmentDetailPage from './pages/DepartmentDetailPage';
import ComplianceReportPage from './pages/ComplianceReportPage';
import Signin from './pages/Signin';
import Signup from './pages/Signup';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/signin" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<Signin />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/assets" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sheets/:id"
            element={
              <ProtectedRoute>
                <SheetDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gmail/auth-success"
            element={
              <ProtectedRoute>
                <GmailAuthSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gmail/auth-error"
            element={
              <ProtectedRoute>
                <GmailAuthError />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gmail"
            element={
              <ProtectedRoute>
                <GmailDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drive"
            element={
              <ProtectedRoute>
                <DriveDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drive/auth-callback"
            element={
              <ProtectedRoute>
                <DriveAuthCallback />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <AssetsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scans/queue"
            element={
              <ProtectedRoute>
                <ScanQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <ProgressPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization"
            element={
              <ProtectedRoute>
                <OrganizationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/users/:email"
            element={
              <ProtectedRoute>
                <UserDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/departments/:department"
            element={
              <ProtectedRoute>
                <DepartmentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organization/compliance"
            element={
              <ProtectedRoute>
                <ComplianceReportPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
