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
    
    // Validate input
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Make login request with explicit content type
      const response = await axios.post('/login', 
        {
          username,
          password
        }, 
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Check for successful login
      if (response.data.success) {
        // Fetch user authentication status
        const userResponse = await axios.get('/auth-status');
        
        if (userResponse.data.logged_in) {
          // Update user state and navigate to home
          setUser(userResponse.data.user);
          navigate('/');
        } else {
          // Fallback error if login seems successful but no user data
          setError('Authentication failed. Please try again.');
        }
      } else {
        // Handle server-side login failure
        setError(response.data.error || 'Login failed');
      }
    } catch (error) {
      // Handle network or unexpected errors
      console.error('Login error:', error.response?.data || error.message);
      
      // Set user-friendly error message
      if (error.response) {
        // Server responded with an error
        setError(error.response.data.error || 'Login failed. Please try again.');
      } else if (error.request) {
        // Request made but no response received
        setError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      // Always set loading to false
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