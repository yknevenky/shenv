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
                <Navigate to="/dashboard" replace />
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
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
