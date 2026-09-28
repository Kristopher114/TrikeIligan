import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './Login'
import './App.css'

import Dashboard from './dashboard.jsx'

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
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
      />
    </Routes>
  )
}

export default App
