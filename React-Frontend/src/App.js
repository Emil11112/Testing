import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Komponenter
import Navbar from './components/Navbar';
import Home from './components/Home';
import Profile from './components/Profile';
import Login from './components/Login';
import Register from './components/Register';
import Discovery from './components/Discovery';
import EditProfile from './components/EditProfile';
import NotFound from './components/NotFound';

// Konfiguration för API-anrop
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kontrollera autentiseringsstatus när appen laddas
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/auth-status');
        if (response.data.logged_in) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Skyddad rutt-komponent
  const ProtectedRoute = ({ children }) => {
    if (loading) return <div>Loading...</div>;
    
    if (!user) {
      return <Navigate to="/login" />;
    }
    
    return children;
  };

  // Funktion för att hantera utloggning
  const handleLogout = async () => {
    try {
      await axios.get('/logout');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <Router>
      <div className="app">
        <Navbar user={user} onLogout={handleLogout} />
        
        <main className="content">
          <Routes>
            {/* Landningssida/Hemsida */}
            <Route path="/" element={
              user ? <Home user={user} /> : <Navigate to="/login" />
            } />
            
            {/* Autentiseringsrutter */}
            <Route path="/login" element={
              user ? <Navigate to="/" /> : <Login setUser={setUser} />
            } />
            <Route path="/register" element={
              user ? <Navigate to="/" /> : <Register setUser={setUser} />
            } />
            
            {/* Användarrutter */}
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/edit-profile" element={
              <ProtectedRoute>
                <EditProfile user={user} setUser={setUser} />
              </ProtectedRoute>
            } />
            
            {/* Discovery-rutt */}
            <Route path="/discovery" element={<Discovery />} />
            
            {/* 404-sida */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;