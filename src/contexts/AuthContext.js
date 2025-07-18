import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { ref, set, get, child } from 'firebase/database';
import { auth, database } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set Firebase persistence to LOCAL (survives browser restarts)
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Error setting persistence:', error);
    });
  }, []);

  // Cache user data in localStorage
  const cacheUserData = (userData) => {
    try {
      localStorage.setItem('zapchats_user_cache', JSON.stringify({
        uid: userData.uid,
        email: userData.email,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error caching user data:', error);
    }
  };

  // Get cached user data
  const getCachedUserData = () => {
    try {
      const cached = localStorage.getItem('zapchats_user_cache');
      if (cached) {
        const userData = JSON.parse(cached);
        // Check if cache is less than 7 days old
        const isValid = (Date.now() - userData.timestamp) < (7 * 24 * 60 * 60 * 1000);
        return isValid ? userData : null;
      }
    } catch (error) {
      console.error('Error reading cached user data:', error);
    }
    return null;
  };

  // Clear cached user data
  const clearCachedUserData = () => {
    try {
      localStorage.removeItem('zapchats_user_cache');
    } catch (error) {
      console.error('Error clearing cached user data:', error);
    }
  };

  // Check if username exists in database
  const checkUsernameExists = async (username) => {
    try {
      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, `usernames/${username}`));
      return snapshot.exists();
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  };

  // Register new user
  const register = async (email, username, password, pin) => {
    try {
      // Check if username already exists
      const usernameExists = await checkUsernameExists(username);
      if (usernameExists) {
        throw new Error('Username already exists');
      }

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data to Realtime Database
      await set(ref(database, `users/${user.uid}`), {
        email: email,
        username: username,
        pin: pin,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });

      // Reserve username
      await set(ref(database, `usernames/${username}`), user.uid);

      return user;
    } catch (error) {
      throw error;
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login
      await set(ref(database, `users/${user.uid}/lastLogin`), new Date().toISOString());

      // Cache user data
      cacheUserData(user);

      return user;
    } catch (error) {
      throw error;
    }
  };

  // Logout user
  const logout = () => {
    // Clear cached data on logout
    clearCachedUserData();
    return signOut(auth);
  };

  useEffect(() => {
    // Check for cached user data on app start
    const cachedUser = getCachedUserData();
    if (cachedUser && !currentUser) {
      // Set a temporary user state while Firebase auth loads
      setCurrentUser({ uid: cachedUser.uid, email: cachedUser.email, fromCache: true });
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Cache the authenticated user
        cacheUserData(user);
        setCurrentUser(user);
      } else {
        // Clear cache if no authenticated user
        clearCachedUserData();
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    register,
    login,
    logout,
    checkUsernameExists,
    getCachedUserData,
    clearCachedUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}