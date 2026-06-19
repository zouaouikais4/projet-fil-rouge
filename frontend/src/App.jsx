import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute  from './components/ProtectedRoute';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import DashboardPage   from './pages/DashboardPage';
import KanbanPage      from './pages/KanbanPage';
import InvitationsPage from './pages/InvitationsPage';
import SupervisionPage from './pages/SupervisionPage';
import ChatBubble      from './components/ChatBubble';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard"                  element={<DashboardPage />} />
            <Route path="/projects/:projectId/kanban" element={<KanbanPage />} />
            <Route path="/invitations"                element={<InvitationsPage />} />
            <Route path="/supervision"                element={<SupervisionPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        {/* Bulle de chat flottante — visible sur toutes les pages protégées */}
        <ChatBubble />
      </BrowserRouter>
    </AuthProvider>
  );
}
