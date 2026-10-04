"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

/**
 * Tema del panel. La app es clara por defecto; el propietario puede activar el
 * modo oscuro desde Configuración (ver docs/design/sistema-ui.md).
 *
 * Decisiones:
 * - El atributo va en `<html>` (no en el contenedor del panel) porque los
 *   diálogos se montan con `createPortal` a `document.body`, fuera del árbol del
 *   panel; si el tema viviera en ese contenedor los modales quedarían claros.
 * - El provider se monta sólo en el panel (dashboard y prototipo) y limpia el
 *   atributo al desmontar: por eso landing y login siguen siempre claras sin
 *   tocar su CSS.
 * - La preferencia se guarda en localStorage (sin backend). Toda lectura y
 *   escritura va envuelta en try/catch: en modo privado o con el storage
 *   bloqueado puede tirar, y el tema no debe romper el panel por eso.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "alquia:theme";

// useLayoutEffect en el servidor avisa que no hace nada; el panel se prerenderiza
// aunque sea client. En cliente queremos el layout effect para pintar el tema
// antes del primer paint y no parpadear.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function leerTemaGuardado(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(leerTemaGuardado);

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    // Al salir del panel (desmontar el provider) se vuelve al claro, que es el
    // único mundo visual de landing/login.
    return () => { delete root.dataset.theme; };
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin persistencia: el tema sigue valiendo en esta sesión.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((actual) => {
      const next = actual === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Sin persistencia: el tema sigue valiendo en esta sesión.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
