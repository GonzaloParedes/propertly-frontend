import { render, screen } from "@testing-library/react";
import DashboardLayout from "@/app/dashboard/layout";

const mockReplace = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("cargando sesión", () => {
  it("no redirige mientras isLoading es true", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    render(<DashboardLayout>contenido</DashboardLayout>);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("no muestra el contenido protegido mientras isLoading es true", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    render(<DashboardLayout>contenido</DashboardLayout>);
    expect(screen.queryByText("contenido")).not.toBeInTheDocument();
  });
});

describe("sin sesión", () => {
  it("redirige a /login cuando termina de cargar sin usuario", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<DashboardLayout>contenido</DashboardLayout>);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("no muestra el contenido protegido", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<DashboardLayout>contenido</DashboardLayout>);
    expect(screen.queryByText("contenido")).not.toBeInTheDocument();
  });
});

describe("con sesión", () => {
  it("no redirige", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", email: "a@a.com", firstName: "Ana", lastName: "Pérez" },
      isLoading: false,
    });
    render(<DashboardLayout>contenido</DashboardLayout>);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("muestra el contenido protegido", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", email: "a@a.com", firstName: "Ana", lastName: "Pérez" },
      isLoading: false,
    });
    render(<DashboardLayout>contenido</DashboardLayout>);
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });
});
