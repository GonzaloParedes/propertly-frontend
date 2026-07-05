"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Descarta resultados de una verificación de sesión que quedó pendiente
  // si mientras tanto login()/logout() ya resolvieron un estado más nuevo.
  const authRequestId = useRef(0);

  useEffect(() => {
    const id = ++authRequestId.current;
    // retry:false a propósito: para un visitante anónimo este 401 es esperado,
    // no queremos gastar un /auth/refresh en cada carga de página sin sesión.
    apiGet<AuthUser>("/auth/me", { retry: false })
      .then((u) => {
        if (authRequestId.current === id) setUser(u);
      })
      .catch(() => {
        if (authRequestId.current === id) setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const id = ++authRequestId.current;
    await apiPost("/auth/login", { email, password }, { retry: false });
    const me = await apiGet<AuthUser>("/auth/me");
    if (authRequestId.current === id) setUser(me);
  }

  async function logout() {
    authRequestId.current++;
    try {
      await apiPost("/auth/logout", undefined, { retry: false });
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
