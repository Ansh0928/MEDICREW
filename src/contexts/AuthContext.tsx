"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { PortalUser } from "@/types/doctors-patients";

interface AuthContextType {
  user: PortalUser | null;
  login: (
    email: string,
    _password: string,
    role: "patient" | "doctor"
  ) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "medicrew_portal_user";

const DEMO_USERS = {
  patient: {
    id: "pat-001",
    email: "patient@demo.com",
    name: "John Smith",
    role: "patient" as const,
    avatar: "JS",
  },
  doctor: {
    id: "doc-001",
    email: "doctor@demo.com",
    name: "Dr. Sarah Chen",
    role: "doctor" as const,
    avatar: "SC",
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved) as PortalUser);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (
      email: string,
      _password: string,
      role: "patient" | "doctor"
    ): Promise<boolean> => {
      if (role === "patient" && email === DEMO_USERS.patient.email) {
        setUser(DEMO_USERS.patient);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USERS.patient));
        return true;
      }
      if (role === "doctor" && email === DEMO_USERS.doctor.email) {
        setUser(DEMO_USERS.doctor);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USERS.doctor));
        return true;
      }
      return false;
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
