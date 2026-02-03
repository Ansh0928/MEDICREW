import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: 'patient' | 'doctor') => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users
const DEMO_USERS = {
  patient: {
    id: 'pat-001',
    email: 'patient@demo.com',
    name: 'John Smith',
    role: 'patient' as const,
    avatar: 'JS',
  },
  doctor: {
    id: 'doc-001',
    email: 'doctor@demo.com',
    name: 'Dr. Sarah Chen',
    role: 'doctor' as const,
    avatar: 'SC',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const savedUser = localStorage.getItem('healthai_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string, role: 'patient' | 'doctor'): Promise<boolean> => {
    // Demo authentication - any password works with demo emails
    if (role === 'patient' && email === 'patient@demo.com') {
      setUser(DEMO_USERS.patient);
      localStorage.setItem('healthai_user', JSON.stringify(DEMO_USERS.patient));
      return true;
    }
    if (role === 'doctor' && email === 'doctor@demo.com') {
      setUser(DEMO_USERS.doctor);
      localStorage.setItem('healthai_user', JSON.stringify(DEMO_USERS.doctor));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('healthai_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
