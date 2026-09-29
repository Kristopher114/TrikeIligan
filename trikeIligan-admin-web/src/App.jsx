import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './Login'
import DashboardLayout from './components/DashboardLayout'
import Verification from './pages/Verification'
import Monitoring from './pages/Monitoring'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()

  const handleLogin = () => {
    setIsAuthenticated(true)
    navigate('/dashboard')
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={<Login onLogin={handleLogin} />} 
      />
      
      {/* Dashboard Layout wrapper for protected routes */}
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />} 
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
    </Routes>
  )
}

export default App
