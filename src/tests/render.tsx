import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/context/theme-context";

export * from "@testing-library/react";

/** Proveedores que los componentes del panel exigen: toasts y tema. */
function PanelProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider><ThemeProvider>{children}</ThemeProvider></ToastProvider>;
}

/** `render` de RTL con los proveedores del panel. */
export function render(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, { wrapper: PanelProviders, ...options });
}
