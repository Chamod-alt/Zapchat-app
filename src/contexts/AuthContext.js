import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
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

      return user;
    } catch (error) {
      throw error;
    }
  };

  // Logout user
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    register,
    login,
    logout,
    checkUsernameExists
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}