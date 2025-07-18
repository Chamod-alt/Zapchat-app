import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  FaComments, 
  FaUsers, 
  FaUserCircle, 
  FaSignOutAlt, 
  FaBars, 
  FaTimes,
  FaMoon,
  FaSun
} from 'react-icons/fa';
import Singlechat from './Singlechat';
import GroupChat from './GroupChat/GroupChat';
import UserProfile from './UserProfile';
import './MainDashboard.css';

export default function MainDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'single':
        return <Singlechat />;
      case 'group':
        return <GroupChat />;
      case 'profile':
        return <UserProfile onClose={() => setActiveTab('single')} />;
      default:
        return <Singlechat />;
    }
  };

  return (
    <div className={`main-dashboard ${darkMode ? 'dark' : ''}`}>
      <aside className={`main-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2>ZapChats</h2>
          <button onClick={toggleSidebar} className="toggle-btn">
            {sidebarCollapsed ? <FaBars /> : <FaTimes />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'single' ? 'active' : ''}`}
            onClick={() => setActiveTab('single')}
          >
            <FaComments />
            {!sidebarCollapsed && <span>Single Chat</span>}
            }
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'group' ? 'active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            <FaUsers />
            {!sidebarCollapsed && <span>Group Chat</span>}
            }
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FaUserCircle />
            {!sidebarCollapsed && <span>Profile</span>}
            }
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={toggleDarkMode} className="footer-btn">
            {darkMode ? <FaSun /> : <FaMoon />}
            {!sidebarCollapsed && <span>{darkMode ? 'Light' : 'Dark'}</span>}
            }
          </button>
          
          <button onClick={handleLogout} className="footer-btn logout">
            <FaSignOutAlt />
            {!sidebarCollapsed && <span>Logout</span>}
            }
          </button>
        </div>
      </aside>

      <main className="main-content">
        {renderContent()}
      </main>

      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}