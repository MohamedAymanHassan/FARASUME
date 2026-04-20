import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, loginWithGoogle, logoutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

type SubscriptionTier = 'free' | 'premium';

interface User {
  id: string;
  name: string;
  email: string;
  tier: SubscriptionTier;
  scenariosRun: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  upgradeToPremium: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot for real-time updates (like name changes in settings)
        unsubscribeUserDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({
              id: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || 'User',
              email: data.email || firebaseUser.email || '',
              tier: data.tier || 'free',
              scenariosRun: 0
            });
          } else {
            // Create user if missing
            setDoc(userRef, {
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              tier: 'free',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          setLoading(false);
        });
      } else {
        if (unsubscribeUserDoc) unsubscribeUserDoc();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  const login = async () => {
    await loginWithGoogle();
  };

  const logout = async () => {
    await logoutUser();
  };

  const upgradeToPremium = async () => {
    if (user) {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        tier: 'premium',
        updatedAt: serverTimestamp()
      });
    }
  };

  const deleteAccount = async () => {
    if (user) {
      const userRef = doc(db, 'users', user.id);
      await deleteDoc(userRef);
      await logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, upgradeToPremium, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
