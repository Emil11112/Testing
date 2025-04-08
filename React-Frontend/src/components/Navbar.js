import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Resonate
        </Link>

        <div className="navbar-menu">
          {user ? (
            // Meny för inloggade användare
            <>
              <Link to="/" className="navbar-item">
                Home
              </Link>
              <Link to="/discovery" className="navbar-item">
                Discovery
              </Link>
              <Link to={`/profile/${user.username}`} className="navbar-item">
                Profile
              </Link>
              <button className="navbar-item" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            // Meny för ej inloggade användare
            <>
              <Link to="/login" className="navbar-item">
                Login
              </Link>
              <Link to="/register" className="navbar-item">
                Register
              </Link>
            </>
          )}
        </div>

        {user && (
          <Link to={`/profile/${user.username}`} className="navbar-profile">
            <img
              src={user.profile_picture || '/static/profile_pics/default.jpg'}
              alt="Profile"
              className="navbar-profile-pic"
            />
            <span className="navbar-username">{user.username}</span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;