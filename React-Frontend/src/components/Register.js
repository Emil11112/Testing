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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Skapa en FormData-instans för att skicka både filuppladdning och textdata
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('confirm_password', confirmPassword);
      
      if (favoriteGenre) {
        formData.append('favorite_genre', favoriteGenre);
      }
      
      if (profilePicture) {
        formData.append('profile_picture', profilePicture);
      }
      
      // Gör API-anrop till backend
      const response = await axios.post('/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        // Uppdatera användarinformation i förälder-komponenten
        const userResponse = await axios.get('/auth-status');
        if (userResponse.data.logged_in) {
          setUser(userResponse.data.user);
          navigate('/');
        } else {
          // Om användaren inte automatiskt loggas in efter registrering
          // skicka till login-sidan
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
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