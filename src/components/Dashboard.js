import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>ZapChats Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
      
      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome to ZapChats!</h2>
          <p>You are successfully logged in with: <strong>{currentUser?.email}</strong></p>
          <p>Your chat application is ready to use.</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <h3>🔒 Secure Authentication</h3>
            <p>Your account is protected with Firebase Authentication</p>
          </div>
          
          <div className="feature-card">
            <h3>💬 Real-time Chat</h3>
            <p>Chat features will be implemented here</p>
            <Link to="/Singlechat" >goto link</Link>
          </div>
          
          <div className="feature-card">
            <h3>👥 User Management</h3>
            <p>Manage your profile and settings</p>
          </div>
          
          <div className="feature-card">
            <h3>📱 Responsive Design</h3>
            <p>Works perfectly on all devices</p>
          </div>
        </div>
      </div>
    </div>
  );
}