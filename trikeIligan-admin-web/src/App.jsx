import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Login from './Login'
import DashboardLayout from './components/DashboardLayout'
import Verification from './pages/Verification'
import Monitoring from './pages/Monitoring'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'
import './App.css'

function App() {
  // Persist authentication across browser reloads via localStorage adminToken
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('adminToken'))
  })
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogin = () => {
    setIsAuthenticated(true)
    const destination = location.state?.from?.pathname || '/dashboard'
    navigate(destination, { replace: true })
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    setIsAuthenticated(false)
    navigate('/login', { replace: true })
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} 
      />
      
      {/* Dashboard Layout wrapper for protected routes */}
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <DashboardLayout onLogout={handleLogout} /> : <Navigate to="/login" replace state={{ from: location }} />} 
      >
        <Route index element={<Navigate to="monitoring" replace />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="verification" element={<Verification />} />
        <Route path="settings" element={<Settings />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>

      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
      />

      {/* Catch-all for unknown routes */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
      />
    </Routes>
  )
}

export default App
