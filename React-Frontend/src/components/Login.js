import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.post('/login', {
        username,
        password
      });
      
      if (response.data.success) {
        // Uppdatera användarinformation i förälder-komponenten
        const userResponse = await axios.get('/auth-status');
        if (userResponse.data.logged_in) {
          setUser(userResponse.data.user);
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/google-login';
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Welcome to Resonate</h2>
        <p className="login-subtitle">Sign in to continue</p>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="Enter your username"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        
        <div className="divider">
          <span>OR</span>
        </div>
        
        <button 
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span className="google-icon">G</span>
          Sign in with Google
        </button>
        
        <div className="login-footer">
          <p>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;