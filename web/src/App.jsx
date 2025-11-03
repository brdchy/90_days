import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Participants from './pages/Participants'
import ParticipantDetail from './pages/ParticipantDetail'
import Reports from './pages/Reports'
import ReportDetail from './pages/ReportDetail'
import ParticipantStats from './pages/ParticipantStats'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminParticipants from './pages/admin/AdminParticipants'
import AdminSettings from './pages/admin/AdminSettings'
import AdminManageParticipant from './pages/admin/AdminManageParticipant'
import AdminManageReport from './pages/admin/AdminManageReport'
import AdminManageReportList from './pages/admin/AdminManageReportList'
import AdminDataManagement from './pages/admin/AdminDataManagement'
import Auth from './pages/Auth'
import { useAuthStore } from './stores/authStore'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Router>
      <Routes>
        {/* Авторизация через Telegram */}
        <Route path="/auth" element={<Auth />} />

        {/* Публичные маршруты */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="participants" element={<Participants />} />
          <Route path="participants/:userId" element={<ParticipantDetail />} />
          <Route path="participants/:userId/stats" element={<ParticipantStats />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:userId/:day" element={<ReportDetail />} />
        </Route>

        {/* Админские маршруты */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            isAuthenticated ? (
              <Layout admin />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="participants" element={<AdminParticipants />} />
          <Route path="participants/:userId" element={<AdminManageParticipant />} />
          <Route path="participants/new" element={<AdminManageParticipant />} />
          <Route path="reports" element={<AdminManageReportList />} />
          <Route path="reports/new" element={<AdminManageReport />} />
          <Route path="reports/:userId/:day" element={<AdminManageReport />} />
          <Route path="data" element={<AdminDataManagement />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App

