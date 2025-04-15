import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Register.css';

const Register = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [favoriteGenre, setFavoriteGenre] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!password.trim()) {
      setError('Password is required');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        setError('Profile picture must be less than 5MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPEG, PNG, and GIF images are allowed');
        return;
      }
      
      setProfilePicture(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('confirm_password', confirmPassword);
      
      // Add optional fields
      if (favoriteGenre) {
        formData.append('favorite_genre', favoriteGenre);
      }
      
      if (profilePicture) {
        formData.append('profile_picture', profilePicture);
      }
      
      // Send registration request
      const response = await axios.post('/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Check for successful registration
      if (response.data.success) {
        // Fetch user authentication status
        const userResponse = await axios.get('/auth-status');
        
        if (userResponse.data.logged_in) {
          // Update user state and navigate to home
          setUser(userResponse.data.user);
          navigate('/');
        } else {
          // Fallback to login page if auto-login fails
          navigate('/login');
        }
      } else {
        // Handle server-side registration failure
        setError(response.data.error || 'Registration failed');
      }
    } catch (error) {
      // Handle network or unexpected errors
      console.error('Registration error:', error.response?.data || error.message);
      
      if (error.response) {
        // Server responded with an error
        setError(error.response.data.error || 'Registration failed. Please try again.');
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

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Create Your Account</h2>
        <p className="register-subtitle">Join Resonate to share your music taste</p>
        
        {error && <div className="register-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="Choose a username"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="Enter your email"
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
              placeholder="Create a password"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Confirm your password"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="favoriteGenre">Favorite Music Genre (Optional)</label>
            <select
              id="favoriteGenre"
              value={favoriteGenre}
              onChange={(e) => setFavoriteGenre(e.target.value)}
              disabled={loading}
            >
              <option value="">Select a genre</option>
              <option value="Rock">Rock</option>
              <option value="Pop">Pop</option>
              <option value="Hip Hop">Hip Hop</option>
              <option value="Electronic">Electronic</option>
              <option value="Jazz">Jazz</option>
              <option value="Classical">Classical</option>
              <option value="Country">Country</option>
              <option value="R&B">R&B</option>
              <option value="Metal">Metal</option>
              <option value="Indie">Indie</option>
              <option value="Folk">Folk</option>
              <option value="Blues">Blues</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="profilePicture">Profile Picture (Optional)</label>
            <input
              type="file"
              id="profilePicture"
              onChange={handleFileChange}
              disabled={loading}
              accept="image/jpeg, image/png, image/gif"
            />
            <small className="file-help">Max size: 5MB. Formats: JPEG, PNG, GIF</small>
          </div>
          
          <button 
            type="submit" 
            className="register-button"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="register-footer">
          <p>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;