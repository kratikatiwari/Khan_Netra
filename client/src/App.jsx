import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Layout from './components/layout/Layout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import Dashboard from './pages/dashboard/Dashboard';
import Mines from './pages/mines/Mines';
import MineDetail from './pages/mines/MineDetail';
import Violations from './pages/violations/Violations';
import Incidents from './pages/incidents/Incidents';
import Environment from './pages/environment/Environment';
import Inspections from './pages/inspections/Inspections';
import Documents from './pages/documents/Documents';
import Compliance from './pages/compliance/Compliance';
import Regulations from './pages/compliance/Regulations';
import Analytics from './pages/analytics/Analytics';
import AIChat from './pages/ai/AIChat';
import RiskPrediction from './pages/ai/RiskPrediction';
import SafetyVision from './pages/vision/SafetyVision';
import Contractors from './pages/contractors/Contractors';
import FieldReports from './pages/fieldreports/FieldReports';
import Deadlines from './pages/deadlines/Deadlines';
import RiskDashboard from './pages/risk/RiskDashboard';
import OCRExtract from './pages/ocr/OCRExtract';
import GISMap from './pages/gis/GISMap';
import Notifications from './pages/notifications/Notifications';
import DisasterAlerts from './pages/disaster/DisasterAlerts';
import AuditTrail from './pages/audit/AuditTrail';
import Reports from './pages/reports/Reports';
import Users from './pages/users/Users';
import Profile from './pages/Profile';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  return (
    <Routes>
      <Route path="/login"        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register"     element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/"                    element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard"           element={<Dashboard />} />
        <Route path="/mines"               element={<Mines />} />
        <Route path="/mines/:id"           element={<MineDetail />} />
        <Route path="/violations"          element={<Violations />} />
        <Route path="/incidents"           element={<Incidents />} />
        <Route path="/environment"         element={<Environment />} />
        <Route path="/inspections"         element={<Inspections />} />
        <Route path="/documents"           element={<Documents />} />
        <Route path="/compliance"          element={<Compliance />} />
        <Route path="/compliance/regulations" element={<Regulations />} />
        <Route path="/analytics"           element={<Analytics />} />
        <Route path="/ai/chat"             element={<AIChat />} />
        <Route path="/ai/risk"             element={<RiskPrediction />} />
        <Route path="/vision"              element={<SafetyVision />} />
        <Route path="/contractors"         element={<Contractors />} />
        <Route path="/field-reports"       element={<FieldReports />} />
        <Route path="/deadlines"           element={<Deadlines />} />
        <Route path="/risk-dashboard"      element={<RiskDashboard />} />
        <Route path="/ocr"                 element={<OCRExtract />} />
        <Route path="/gis"                 element={<GISMap />} />
        <Route path="/notifications"       element={<Notifications />} />
        <Route path="/disaster"            element={<DisasterAlerts />} />
        <Route path="/audit"               element={<ProtectedRoute roles={['admin','government_officer','inspector']}><AuditTrail /></ProtectedRoute>} />
        <Route path="/reports"             element={<Reports />} />
        <Route path="/users"               element={<ProtectedRoute roles={['admin','government_officer']}><Users /></ProtectedRoute>} />
        <Route path="/profile"             element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
