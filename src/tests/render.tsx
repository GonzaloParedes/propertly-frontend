import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";

export * from "@testing-library/react";

/** `render` de RTL con el proveedor de toasts, que los componentes del panel exigen. */
export function render(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, { wrapper: ToastProvider, ...options });
}
