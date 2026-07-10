"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export interface AuthUser {
  email: string;
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
    // /auth/me responde el email en texto plano, no un objeto JSON.
    apiGet<string>("/auth/me", { retry: false })
      .then((email) => {
        if (authRequestId.current === id) setUser({ email });
      })
      .catch(() => {
        if (authRequestId.current === id) setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const id = ++authRequestId.current;
    await apiPost("/auth/login", { email, password }, { retry: false });
    const me = await apiGet<string>("/auth/me");
    if (authRequestId.current === id) setUser({ email: me });
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
