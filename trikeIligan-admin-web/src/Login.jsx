import React, { useState } from 'react';
import { FaMotorcycle } from "react-icons/fa6";
import './Login.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Map username to the seeded email
      const email = username === 'admin_iligan' ? 'admin_iligan@trikeiligan.com' : username;

      const response = await fetch('https://trikeiligan.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneOrEmail: email,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && data.user && data.user.role === 'ADMIN') {
        // Save token to localStorage for authenticated requests later
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminData', JSON.stringify(data.user));
        onLogin();
      } else if (response.ok && data.user.role !== 'ADMIN') {
        setError('Access denied. Admin privileges required.');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Network error. Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-container">
          <div className="logo-circle">
            <FaMotorcycle size={28} color="#1B6E45" />
          </div>
        </div>

        <h1 className="login-title">TrikeIligan Admin</h1>
        <p className="login-subtitle">Log in to administer the road!</p>

        {error && <p style={{ color: '#D32F2F', fontSize: '14px', marginBottom: '16px', fontWeight: '500' }}>{error}</p>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              placeholder=""
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember Me</span>
            </label>
            <a href="#" className="forgot-password">Forgot Password?</a>
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
