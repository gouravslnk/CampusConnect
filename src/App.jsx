import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import DevelopersPage from './pages/DevelopersPage';
import ConnectionsPage from './pages/ConnectionsPage';
import ProfilePage from './pages/ProfilePage';
import ProfileViewPage from './pages/ProfileViewPage';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import CreateEventPage from './pages/CreateEventPage';
import ClubsPage from './pages/ClubsPage';
import ClubDetailPage from './pages/ClubDetailPage';
import SystemAdminDashboard from './pages/SystemAdminDashboard';
import AITeamsPage from './pages/AITeamsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import FloatingAIChatbot from './components/FloatingAIChatbot';
import { supabase } from './lib/supabase';
import { expirePastEvents } from './lib/eventUtils';

// Route guard for authenticated pages
function PrivateRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ user, children }) {
  return user?.role === 'club_admin' ? children : <Navigate to="/events" replace />;
}

function SystemAdminRoute({ user, children }) {
  return user?.role === 'admin' ? children : <Navigate to="/events" replace />;
}

function ParticipantRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? <Navigate to="/admin" replace /> : children;
}

// Layout with Navbar + Footer
function Layout({ user, onLogout, children, withFooter = true }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={onLogout} />
      <main className="flex-1">{children}</main>
      {withFooter && <Footer />}
      {user && user.role !== 'admin' && <FloatingAIChatbot />}
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Expire past events on app load (best-effort)
  useEffect(() => {
    expirePastEvents();
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center p-4"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing */}
        <Route
          path="/"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <LandingPage />
            </Layout>
          }
        />

        {/* Auth pages - no navbar/footer wrapper for cleaner look */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route
          path="/events"
          element={
            <ParticipantRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <EventsPage />
              </Layout>
            </ParticipantRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ParticipantRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <EventDetailPage />
              </Layout>
            </ParticipantRoute>
          }
        />
        <Route
          path="/developers"
          element={
            <ParticipantRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <DevelopersPage />
              </Layout>
            </ParticipantRoute>
          }
        />
        <Route
          path="/ai-teams"
          element={
            <ParticipantRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <AITeamsPage />
              </Layout>
            </ParticipantRoute>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <ParticipantRoute user={user}>
              <Layout user={user} onLogout={handleLogout} withFooter={false}>
                <AIAssistantPage />
              </Layout>
            </ParticipantRoute>
          }
        />
        <Route
          path="/connections"
          element={
            <ParticipantRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <ConnectionsPage />
              </Layout>
            </ParticipantRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <ProfilePage user={user} />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <PrivateRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <ProfileViewPage />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ParticipantRoute user={user}>
              <Layout user={user} onLogout={handleLogout} withFooter={false}>
                <ChatPage user={user} />
              </Layout>
            </ParticipantRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute user={user}>
              {user?.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : (
                <Layout user={user} onLogout={handleLogout}>
                  <DashboardPage user={user} />
                </Layout>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/create-event"
          element={
            <PrivateRoute user={user}>
              <AdminRoute user={user}>
                <Layout user={user} onLogout={handleLogout} withFooter={false}>
                  <CreateEventPage user={user} />
                </Layout>
              </AdminRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/edit-event/:id"
          element={
            <PrivateRoute user={user}>
              <AdminRoute user={user}>
                <Layout user={user} onLogout={handleLogout} withFooter={false}>
                  <CreateEventPage user={user} />
                </Layout>
              </AdminRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/clubs"
          element={
            <ParticipantRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <ClubsPage user={user} />
              </Layout>
            </ParticipantRoute>
          }
        />
        <Route
          path="/clubs/:id"
          element={
            <ParticipantRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <ClubDetailPage />
              </Layout>
            </ParticipantRoute>
          }
        />
        <Route
          path="/clubs/:id"
          element={
            <ParticipantRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <ClubDetailPage />
              </Layout>
            </ParticipantRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute user={user}>
              <SystemAdminRoute user={user}>
                <Layout user={user} onLogout={handleLogout}>
                  <SystemAdminDashboard user={user} />
                </Layout>
              </SystemAdminRoute>
            </PrivateRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="text-8xl font-black text-gray-100 mb-4">404</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h2>
                <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
                <a href="/" className="btn-primary">Go Home</a>
              </div>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
