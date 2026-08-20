import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface User {
  email: string | null;
  uid: string;
  displayName?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USER: User = {
  email: 'admin@kalangest.com',
  uid: 'admin_local',
  displayName: 'Administrateur'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEFAULT_USER);
  const [isAdmin, setIsAdmin] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          email: firebaseUser.email || DEFAULT_USER.email,
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || DEFAULT_USER.displayName
        });
      } else {
        setUser(DEFAULT_USER);
      }
      setIsAdmin(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    return true;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Logout error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
