import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Toaster } from 'sonner';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Courses } from './pages/Courses';
import { Payments } from './pages/Payments';
import { Registrations } from './pages/Registrations';
import { Settings } from './pages/Settings';
import { Teachers } from './pages/Teachers';
import { Attendance } from './pages/Attendance';
import { Grades } from './pages/Grades';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="courses" element={<Courses />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="grades" element={<Grades />} />
            <Route path="registrations" element={<Registrations />} />
            <Route path="payments" element={<Payments />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
