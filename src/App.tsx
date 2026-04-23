import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate 
} from 'react-router-dom';
import { Layout } from './components/Layout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import MovementsPage from './pages/MovementsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import NewProjectPage from './pages/NewProjectPage';
import StoragePage from './pages/StoragePage';
import NewStoragePage from './pages/NewStoragePage';
import AlertsPage from './pages/AlertsPage';
import AuditsPage from './pages/AuditsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import UsersPage from './pages/UsersPage';
import NewUserPage from './pages/NewUserPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import NewMovementPage from './pages/NewMovementPage';
import NewItemPage from './pages/NewItemPage';
import ItemDetailPage from './pages/ItemDetailPage';
import { CurrentUserProvider } from './context/CurrentUserContext';

export default function App() {
  return (
    <CurrentUserProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/new" element={<NewItemPage />} />
          <Route path="/inventory/:id" element={<ItemDetailPage />} />
          <Route path="/inventory/new-movement" element={<NewMovementPage />} />
          <Route path="/movements" element={<MovementsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/storage" element={<StoragePage />} />
          <Route path="/storage/new" element={<NewStoragePage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/audits" element={<AuditsPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/new" element={<NewUserPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
    </CurrentUserProvider>
  );
}
