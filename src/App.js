import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import MainDashboard from './components/MainDashboard';
import PrivateRoute from './components/PrivateRoute';

//
import Singlechat from './components/Singlechat';
import UserProfile from "./components/UserProfile";
import GroupChat from './components/GroupChat/GroupChat';
import './App.css';

// Loading component for better UX during auth state loading
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontSize: '1.2rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
        <p>Loading ZapChats...</p>
      </div>
    </div>
  );
}

// App routes component
function AppRoutes() {
  const { currentUser } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route 
        path="/dashboard" 
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/main" 
        element={
          <PrivateRoute>
            <MainDashboard />
          </PrivateRoute>
        } 
      />
      <Route path="/Singlechat" element={<Singlechat />} />
      <Route path="/groupchat" element={<PrivateRoute><GroupChat /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
      <Route path="/" element={currentUser ? <Navigate to="/main" /> : <Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <React.Suspense fallback={<LoadingScreen />}>
            <AppRoutes />
          </React.Suspense>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;