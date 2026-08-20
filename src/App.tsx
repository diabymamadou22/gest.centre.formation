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

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/" element={<Layout />}>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
