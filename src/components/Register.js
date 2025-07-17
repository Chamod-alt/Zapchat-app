import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    pin: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  const { register, checkUsernameExists } = useAuth();
  const navigate = useNavigate();

  // Real-time username validation
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length >= 3) {
        setUsernameChecking(true);
        try {
          const exists = await checkUsernameExists(formData.username);
          setUsernameAvailable(!exists);
        } catch (error) {
          console.error('Error checking username:', error);
        }
        setUsernameChecking(false);
      } else {
        setUsernameAvailable(null);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username, checkUsernameExists]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (usernameAvailable === false) {
      newErrors.username = 'Username is already taken';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.pin) {
      newErrors.pin = 'PIN is required';
    } else if (!/^\d{4,6}$/.test(formData.pin)) {
      newErrors.pin = 'PIN must be 4-6 digits';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await register(formData.email, formData.username, formData.password, formData.pin);
      navigate('/dashboard');
    } catch (error) {
      setErrors({ submit: error.message });
    }

    setLoading(false);
  };

  const getUsernameStatus = () => {
    if (!formData.username || formData.username.length < 3) return null;
    if (usernameChecking) return <span className="status checking">Checking...</span>;
    if (usernameAvailable === true) return <span className="status available">✓ Available</span>;
    if (usernameAvailable === false) return <span className="status taken">✗ Taken</span>;
    return null;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>ZapChats</h1>
          <h2>Create Account</h2>
          <p>Join the conversation</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="Enter your email"
              required
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
            
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="username-input-container">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={errors.username ? 'error' : ''}
                placeholder="Choose a username"
                required
              />
              {getUsernameStatus()}
            </div>
            {errors.username && <span className="error-message">{errors.username}</span>}
            
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              placeholder="Create a password"
              required
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
            
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="Confirm your password"
              required
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            
          </div>

          <div className="form-group">
            <label htmlFor="pin">Security PIN</label>
            <input
              type="password"
              id="pin"
              name="pin"
              value={formData.pin}
              onChange={handleChange}
              className={errors.pin ? 'error' : ''}
              placeholder="4-6 digit PIN"
              maxLength="6"
              required
            />
            {errors.pin && <span className="error-message">{errors.pin}</span>}
            
          </div>

          {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}
          

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading || usernameChecking || usernameAvailable === false}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}