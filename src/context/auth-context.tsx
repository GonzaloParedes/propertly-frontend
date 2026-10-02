"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { AlquiaBackendClient, type UserResponse } from "@/lib/backend-client";

/**
 * La sesión guarda el usuario entero, no sólo el correo. Son dos razones:
 * el nombre y el apellido son datos de pantalla —el saludo de Inicio, la
 * tarjeta Cuenta de Configuración— y salen de la misma llamada que ya hacía
 * falta para saber si hay sesión; y `/auth/me`, que devolvíamos antes, es el
 * único endpoint de la API que responde texto plano y está anotado para
 * borrarse en el CODE_REVIEW del backend por redundante con `/users/me`.
 */
export type AuthUser = UserResponse;

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Adopta un usuario recién guardado sin volver a pedirlo. Configuración lo usa
   * al editar los datos: el nombre alimenta el saludo de Inicio y la barra
   * lateral, así que sin esto el propietario cambia su nombre y sigue viendo el
   * anterior hasta recargar la página.
   */
  actualizarUsuario: (usuario: AuthUser) => void;
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
    AlquiaBackendClient.users
      .getMe({ retry: false })
      .then((me) => {
        if (authRequestId.current === id) setUser(me);
      })
      .catch(() => {
        if (authRequestId.current === id) setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const id = ++authRequestId.current;
    await AlquiaBackendClient.auth.login({ email, password });
    const me = await AlquiaBackendClient.users.getMe();
    if (authRequestId.current === id) setUser(me);
  }, []);

  const logout = useCallback(async () => {
    authRequestId.current++;
    try {
      await AlquiaBackendClient.auth.logout();
    } catch (err) {
      // Un 401 es que la sesión ya había vencido: lo que se quería cerrar ya
      // está cerrado. Sin esto el error sube hasta el botón —que lo llama con
      // `void`— y queda como rechazo sin atrapar.
      if (!(err instanceof ApiError && err.status === 401)) throw err;
    } finally {
      setUser(null);
    }
  }, []);

  const actualizarUsuario = useCallback((usuario: AuthUser) => {
    authRequestId.current++;
    setUser(usuario);
  }, []);

  const contextValue = useMemo(
    () => ({ user, isLoading, login, logout, actualizarUsuario }),
    [user, isLoading, login, logout, actualizarUsuario]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
