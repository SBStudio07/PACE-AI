import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import OnboardingPage from '../pages/OnboardingPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import TasksPage from '../pages/TasksPage.jsx';
import PlannerPage from '../pages/PlannerPage.jsx';
import WorkloadPage from '../pages/WorkloadPage.jsx';
import RecoveryPage from '../pages/RecoveryPage.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/app" element={<MainLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="workload" element={<WorkloadPage />} />
        <Route path="recovery" element={<RecoveryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
