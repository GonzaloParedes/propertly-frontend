import { render, screen } from "@/tests/render";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";

const mockUseAuth = vi.fn();
vi.mock("@/context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

// Inicio sí llama al backend desde que su panel es real; estos tests miran el
// encabezado, así que las llamadas quedan pendientes a propósito.
vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn(() => new Promise(() => {})) },
    contracts: { list: vi.fn(() => new Promise(() => {})) },
    properties: { list: vi.fn(() => new Promise(() => {})) },
    invoices: { list: vi.fn(() => new Promise(() => {})) },
    preInvoices: { list: vi.fn(() => new Promise(() => {})) },
    users: { getReminderSettings: vi.fn(() => new Promise(() => {})), updateMe: vi.fn() },
  },
}));

const USUARIO = {
  id: 1,
  email: "ricardo@ejemplo.com",
  firstName: "Ricardo",
  lastName: "Rosas",
  taxId: "20224567899",
  phoneNumber: "+5491144552210",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: USUARIO, isLoading: false });
});

describe("Inicio", () => {
  it("saluda al propietario por su nombre", () => {
    render(<OwnerWorkspace initialView="inicio" />);
    expect(screen.getByRole("heading", { name: "Buen día, Ricardo" })).toBeInTheDocument();
  });

  it("saluda sin nombre mientras no hay sesión", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<OwnerWorkspace initialView="inicio" />);
    expect(screen.getByRole("heading", { name: "Buen día" })).toBeInTheDocument();
  });

  it("fecha la cartera en el día de hoy, no en el de la demo", () => {
    render(<OwnerWorkspace initialView="inicio" />);
    expect(screen.getByText(/Así está su cartera hoy,/)).toBeInTheDocument();
    expect(screen.queryByText(/19 de agosto de 2026/)).not.toBeInTheDocument();
  });
});

describe("Configuración", () => {
  it("muestra el nombre y el correo de la sesión", () => {
    render(<OwnerWorkspace initialView="configuracion" />);
    expect(screen.getByText("Ricardo Rosas")).toBeInTheDocument();
    expect(screen.getByText("ricardo@ejemplo.com")).toBeInTheDocument();
  });

  it("no inventa un titular cuando no hay sesión", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    render(<OwnerWorkspace initialView="configuracion" />);
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});

// El prototipo corre sin sesión: si no conservara su titular de ejemplo, la
// ruta que existe para mostrar las pantallas las mostraría a medio nombrar.
describe("prototipo", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
  });

  it("mantiene el titular y la fecha de la demo", () => {
    render(<OwnerWorkspace initialView="inicio" demo />);
    expect(screen.getByRole("heading", { name: "Buen día, Ricardo" })).toBeInTheDocument();
    expect(screen.getByText(/martes 19 de agosto de 2026/)).toBeInTheDocument();
  });

  it("nombra la cuenta en Configuración", () => {
    render(<OwnerWorkspace initialView="configuracion" demo />);
    expect(screen.getByText("Ricardo Rosas")).toBeInTheDocument();
    expect(screen.getByText("ricardo@alquia.com")).toBeInTheDocument();
  });
});
