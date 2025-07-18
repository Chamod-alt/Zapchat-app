import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Loading component for private routes
function PrivateRouteLoading() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f8f9fa'
    }}>
      <div className="loading-spinner"></div>
    </div>
  );
}

export default function PrivateRoute({ children }) {
  const { currentUser, getCachedUserData } = useAuth();
  
  // Check for cached user data if no current user
  if (!currentUser) {
    const cachedUser = getCachedUserData();
    if (cachedUser) {
      // Show loading while Firebase auth catches up
      return <PrivateRouteLoading />;
    }
    return <Navigate to="/login" />;
  }
  
  return children;
}