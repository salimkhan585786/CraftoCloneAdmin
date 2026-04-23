import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import TemplateEditor from './pages/TemplateEditor';
import Users from './pages/Users';
import Languages from './pages/Languages';
import SubscriptionPlans from './pages/SubscriptionPlans';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { authService } from './services/authService';

const ProtectedLayout = () => {
  const isAdmin = authService.isAuthenticated();

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/languages" element={<Languages />} />
          <Route path="/subscriptions" element={<SubscriptionPlans />} />
          <Route path="/editor" element={<TemplateEditor />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
