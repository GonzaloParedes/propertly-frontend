import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreationWizard from "@/components/dashboard/CreationWizard";
import { ApiError, AuthExpiredError } from "@/lib/api";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { create: vi.fn(), list: vi.fn() },
    properties: { list: vi.fn(), create: vi.fn() },
    contracts: { list: vi.fn(), create: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockCreate = vi.mocked(AlquiaBackendClient.tenants.create);
const mockPropiedades = vi.mocked(AlquiaBackendClient.properties.list);
const mockCrearPropiedad = vi.mocked(AlquiaBackendClient.properties.create);
const mockInquilinos = vi.mocked(AlquiaBackendClient.tenants.list);
const mockContratos = vi.mocked(AlquiaBackendClient.contracts.list);
const mockCrearContrato = vi.mocked(AlquiaBackendClient.contracts.create);

const MITRE = {
  id: 10, street: "Mitre", number: "78", city: "San Isidro", province: "Buenos Aires",
  category: "COMMERCIAL_PREMISES" as const, coveredArea: 52,
};
const COLON = {
  id: 11, street: "Colón", number: "2255", floorUnit: "4.º D", city: "Vicente López",
  province: "Buenos Aires", category: "APARTMENT" as const, coveredArea: 58,
};
const DIEGO = {
  id: 20, firstName: "Diego", lastName: "Ferrari", taxId: "20301154829",
  email: "diego@ejemplo.com", phoneNumber: "+5491144552210",
};

// 27-24891055-6 tiene dígito verificador válido; el asistente no deja avanzar
// con uno inventado, así que los tests necesitan uno real.
const CUIT_VALIDO = "27248910556";

let onComplete: ReturnType<typeof vi.fn>;
let onClose: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  onComplete = vi.fn();
  onClose = vi.fn();
  mockPropiedades.mockResolvedValue([MITRE, COLON]);
  mockInquilinos.mockResolvedValue([DIEGO]);
  mockContratos.mockResolvedValue([]);
});

function renderWizard() {
  render(<CreationWizard kind="tenant" onClose={onClose} onComplete={onComplete} />);
}

async function fillAndSave({
  nombre = "Jorge",
  apellido = "Paletta",
  cuit = CUIT_VALIDO,
  correo = "jorge@ejemplo.com",
  telefono = "1144552210",
} = {}) {
  if (nombre) await userEvent.type(screen.getByLabelText("Nombre"), nombre);
  if (apellido) await userEvent.type(screen.getByLabelText("Apellido"), apellido);
  if (cuit) await userEvent.type(screen.getByLabelText("CUIT o CUIL"), cuit);
  if (correo) await userEvent.type(screen.getByLabelText("Correo electrónico"), correo);
  if (telefono) await userEvent.type(screen.getByLabelText("Teléfono"), telefono);
  await userEvent.click(screen.getByRole("button", { name: "Guardar inquilino" }));
}

// --- Guardado exitoso ---

describe("guardado exitoso", () => {
  it("llama a tenants.create con los datos cargados", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO,
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210",
    });
    renderWizard();
    await fillAndSave();

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        firstName: "Jorge",
        lastName: "Paletta",
        taxId: CUIT_VALIDO,
        email: "jorge@ejemplo.com",
        phoneNumber: "1144552210",
      })
    );
  });

  it("manda el CUIT sin guiones aunque en pantalla se vea formateado", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO,
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210",
    });
    renderWizard();
    await userEvent.type(screen.getByLabelText("CUIT o CUIL"), CUIT_VALIDO);
    expect(screen.getByLabelText("CUIT o CUIL")).toHaveValue("27-24891055-6");
    await fillAndSave({ cuit: "" });

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ taxId: "27248910556" })
      )
    );
  });

  it("avisa que terminó recién cuando el backend respondió", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO,
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210",
    });
    renderWizard();
    await fillAndSave();

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });
});

// --- Mientras guarda ---

describe("mientras guarda", () => {
  it("muestra «Guardando…» y no deja volver a enviar", async () => {
    mockCreate.mockReturnValueOnce(new Promise(() => {}));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("no deja salir del asistente ni volver atrás", async () => {
    mockCreate.mockReturnValueOnce(new Promise(() => {}));
    renderWizard();
    await fillAndSave();

    await screen.findByRole("button", { name: "Guardando…" });
    expect(screen.getByRole("button", { name: "Salir del asistente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Atrás" })).toBeDisabled();
  });
});

// --- Errores ---

describe("errores al guardar", () => {
  it("avisa cuando el CUIT ya está cargado", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(400, "Tax ID already registered"));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese CUIT ya figura en otro inquilino suyo."
    );
  });

  it("muestra un mensaje de validación para otros 400", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(400, "Validation failed"));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("Verifique los datos ingresados");
  });

  it("muestra un mensaje genérico ante un error de red", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Network error"));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar el inquilino");
  });

  it("avisa si la sesión expiró", async () => {
    mockCreate.mockRejectedValueOnce(new AuthExpiredError());
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("Su sesión expiró");
  });

  it("no da por terminado el alta si falló", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(500, "Boom"));
    renderWizard();
    await fillAndSave();

    await screen.findByRole("alert");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("deja reintentar después del error", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(500, "Boom"));
    renderWizard();
    await fillAndSave();

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Guardar inquilino" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Salir del asistente" })).not.toBeDisabled();
  });
});

// --- Validación previa ---

describe("validación previa", () => {
  it("no habilita guardar hasta que los cinco campos son válidos", async () => {
    renderWizard();
    const guardar = screen.getByRole("button", { name: "Guardar inquilino" });
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Nombre"), "Jorge");
    await userEvent.type(screen.getByLabelText("Apellido"), "Paletta");
    await userEvent.type(screen.getByLabelText("CUIT o CUIL"), CUIT_VALIDO);
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "jorge@ejemplo.com");
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Teléfono"), "1144552210");
    expect(guardar).not.toBeDisabled();
  });

  it("no llega al backend con un CUIT de dígito verificador inválido", async () => {
    renderWizard();
    await fillAndSave({ cuit: "27248910557" });

    expect(mockCreate).not.toHaveBeenCalled();
  });

  // Hasta el 28/09/2026 el normalizador del backend guardaba esto mal
  // (+54901144552210, con el 0 adentro), y se cortaba acá. Ya está arreglado
  // —verificado en vivo: ahora guarda +549...2210, sin el 0— así que el 0 se
  // manda en dígitos como cualquier otro. Ver src/lib/telefono.ts.
  it("acepta el 0 de la característica: el backend ya lo saca bien", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO,
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210",
    });
    renderWizard();
    await fillAndSave({ telefono: "01144552210" });

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: "01144552210" })
      )
    );
  });

  it("manda el teléfono en dígitos aunque se escriba con guiones y espacios", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO,
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210",
    });
    renderWizard();
    await fillAndSave({ telefono: "11 4455-2210" });

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: "1144552210" })
      )
    );
  });
});

// --- contador de plazo del contrato ---

describe("asistente de contrato", () => {
  function renderContrato() {
    render(<CreationWizard kind="contract" onClose={onClose} onComplete={onComplete} />);
  }

  const seguir = () => userEvent.click(screen.getByRole("button", { name: /Seguir/ }));

  /** Deja el asistente en el paso `hasta`, cargando lo que cada paso exige. */
  async function avanzarHasta(hasta: number, { porcentaje = "12" } = {}) {
    renderContrato();
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    if (hasta === 1) return;
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    if (hasta === 2) return;
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "620000");
    if (hasta === 3) return;
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    if (hasta === 4) return;
    await seguir();
    if (porcentaje) await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), porcentaje);
    if (hasta === 5) return;
    await seguir();
  }

  // --- las listas ---

  it("no ofrece una propiedad que ya tiene un contrato vigente", async () => {
    mockContratos.mockResolvedValue([
      { id: 1, property: COLON, tenant: DIEGO, status: "ACTIVE" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fixture parcial: sólo se leen property.id y status.
    ] as any);
    renderContrato();

    expect(await screen.findByRole("radio", { name: /Mitre 78/ })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Colón 2255/ })).not.toBeInTheDocument();
  });

  it("avisa si no pudo cargar las listas, en vez de mostrar una pantalla vacía", async () => {
    mockPropiedades.mockRejectedValue(new ApiError(500, "Boom"));
    renderContrato();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar sus datos");
  });

  // --- lo que cada paso exige ---

  it("no deja pasar del primer paso sin elegir una propiedad", async () => {
    renderContrato();
    await screen.findByRole("radio", { name: /Mitre 78/ });
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();
  });

  it("no acepta una fecha de inicio anterior a diciembre de 2022", async () => {
    await avanzarHasta(4);
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2020-01-01" } });

    expect(screen.getByRole("alert")).toHaveTextContent("antes de diciembre de 2022");
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();
  });

  it("suma y resta el plazo de a un mes, no de a seis", async () => {
    await avanzarHasta(4);
    expect(screen.getByText("36")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sumar meses" }));
    expect(screen.getByText("37")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Restar meses" }));
    await userEvent.click(screen.getByRole("button", { name: "Restar meses" }));
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  it("no baja de un mes", async () => {
    await avanzarHasta(4);
    await userEvent.click(screen.getByRole("button", { name: "12 meses" }));
    const restar = screen.getByRole("button", { name: "Restar meses" });
    for (let i = 0; i < 15; i++) await userEvent.click(restar);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // La fecha de fin que muestra el asistente tiene que ser la que el backend va
  // a guardar: startDate + termMonths, sin restarle un día.
  it("muestra la misma fecha de fin que va a calcular el backend", async () => {
    await avanzarHasta(4);
    expect(screen.getByText("Termina el 1/9/2029.")).toBeInTheDocument();
  });

  // --- el guardado ---

  it("crea el contrato por porcentaje con incrementValue y sin nombre de índice", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await avanzarHasta(6);
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() =>
      expect(mockCrearContrato).toHaveBeenCalledWith({
        propertyId: 10,
        tenantId: 20,
        initialRentAmount: 620000,
        startDate: "2026-09-01",
        termMonths: 36,
        dueDay: 1,
        incrementFrequencyMonths: 6,
        incrementMethod: "FIXED_PERCENTAGE",
        incrementValue: 12,
      })
    );
    expect(onComplete).toHaveBeenCalled();
  });

  // El backend rechaza que vengan los dos campos: INDEX exige incrementIndexName
  // y prohíbe incrementValue.
  it("crea el contrato por ICL con el nombre del índice y sin incrementValue", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await avanzarHasta(5, { porcentaje: "" });
    await userEvent.click(screen.getByRole("radio", { name: /Según el ICL/ }));
    await seguir();
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
    const body = mockCrearContrato.mock.calls[0][0];
    expect(body.incrementMethod).toBe("INDEX");
    expect(body.incrementIndexName).toBe("ICL");
    expect(body).not.toHaveProperty("incrementValue");
  });

  it("traduce el 400 de la propiedad ya alquilada", async () => {
    mockCrearContrato.mockRejectedValueOnce(
      new ApiError(400, "Property already has an active contract")
    );
    await avanzarHasta(6);
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ya tiene un contrato vigente");
    expect(onComplete).not.toHaveBeenCalled();
  });
});

// --- paso opcional de características de la propiedad ---

describe("asistente de propiedad · características", () => {
  async function irAlPasoDeCaracteristicas() {
    render(<CreationWizard kind="property" onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Departamento/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
  }

  it("arranca sin valores puestos por defecto", async () => {
    await irAlPasoDeCaracteristicas();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Restar dormitorios" })).toBeDisabled();
    expect(screen.getByLabelText(/Superficie cubierta/)).toHaveValue("");
  });

  it("el primer + deja el contador en 1", async () => {
    await irAlPasoDeCaracteristicas();
    await userEvent.click(screen.getByRole("button", { name: "Sumar dormitorios" }));
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restar dormitorios" })).toBeEnabled();
  });

  it("se puede saltear y el resumen queda sin cargar", async () => {
    await irAlPasoDeCaracteristicas();
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));
    expect(screen.getByText("Sin cargar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar propiedad" })).toBeInTheDocument();
  });

  it("lista solo lo que se cargó", async () => {
    await irAlPasoDeCaracteristicas();
    await userEvent.click(screen.getByRole("button", { name: "Sumar baños" }));
    await userEvent.type(screen.getByLabelText(/Superficie cubierta/), "68");
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    expect(screen.getByText("1 baño · 68 m²")).toBeInTheDocument();
  });
});

// --- el tipo, que el backend exige, y el guardado ---

describe("asistente de propiedad · tipo y guardado", () => {
  async function cargarDireccion() {
    render(<CreationWizard kind="property" onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
  }

  /** Dirección + tipo, el mínimo que el backend acepta, hasta el resumen. */
  async function irAlResumen() {
    await cargarDireccion();
    await userEvent.click(screen.getByRole("radio", { name: /Departamento/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));
  }

  it("ofrece las ocho categorías que el backend acepta", async () => {
    await cargarDireccion();
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: /Local comercial/ })).toBeInTheDocument();
    // Las cuatro que llegaron con `codex/frontend-integration-lots`: antes había
    // que ocultarlas porque el backend las rechazaba.
    expect(screen.getByRole("radio", { name: /Cochera/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Oficina/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Terreno/ })).toBeInTheDocument();
  });

  it("guarda una de las categorías nuevas", async () => {
    mockCrearPropiedad.mockResolvedValueOnce({} as never);
    await cargarDireccion();
    await userEvent.click(screen.getByRole("radio", { name: /Cochera/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    await waitFor(() => expect(mockCrearPropiedad).toHaveBeenCalled());
    expect(mockCrearPropiedad).toHaveBeenCalledWith(
      expect.objectContaining({ category: "GARAGE" })
    );
  });

  it("no deja seguir sin elegir el tipo", async () => {
    await cargarDireccion();
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: /Casa/ }));
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeEnabled();
  });

  it("nombra el tipo elegido en el resumen", async () => {
    await irAlResumen();
    expect(screen.getByText("Departamento")).toBeInTheDocument();
  });

  it("guarda la propiedad con la dirección y el tipo", async () => {
    mockCrearPropiedad.mockResolvedValueOnce({} as never);
    await irAlResumen();
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mockCrearPropiedad).toHaveBeenCalledWith({
      street: "Lavalle",
      number: "950",
      floorUnit: undefined,
      city: "CABA",
      province: "Ciudad Autónoma de Buenos Aires",
      category: "APARTMENT",
      bedrooms: undefined,
      bathrooms: undefined,
      coveredArea: undefined,
      petsAllowed: undefined,
      furnished: undefined,
    });
  });

  it("manda las características que se cargaron, y sólo esas", async () => {
    mockCrearPropiedad.mockResolvedValueOnce({} as never);
    await cargarDireccion();
    await userEvent.click(screen.getByRole("radio", { name: /Casa/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Sumar dormitorios" }));
    await userEvent.type(screen.getByLabelText(/Superficie cubierta/), "92");
    await userEvent.click(screen.getByRole("button", { name: "Acepta mascotas" }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    await waitFor(() => expect(mockCrearPropiedad).toHaveBeenCalled());
    expect(mockCrearPropiedad).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "HOUSE",
        bedrooms: 1,
        coveredArea: 92,
        petsAllowed: true,
        // No los tocó: no se mandan, en vez de afirmar que no tiene baños
        // ni que no está amoblada.
        bathrooms: undefined,
        furnished: undefined,
      })
    );
  });

  it("los extras marcados figuran en el resumen", async () => {
    await cargarDireccion();
    await userEvent.click(screen.getByRole("radio", { name: /PH/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Se alquila amueblada" }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    expect(screen.getByText("amoblada")).toBeInTheDocument();
  });

  it("el piso y el departamento viajan en su propio campo", async () => {
    mockCrearPropiedad.mockResolvedValueOnce({} as never);
    render(<CreationWizard kind="property" onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await userEvent.type(screen.getByPlaceholderText(/Piso y depto/), "3.º B");
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Departamento/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    await waitFor(() => expect(mockCrearPropiedad).toHaveBeenCalled());
    expect(mockCrearPropiedad).toHaveBeenCalledWith(
      expect.objectContaining({ number: "950", floorUnit: "3.º B" })
    );
  });

  it("explica el 400 y deja volver a intentar", async () => {
    mockCrearPropiedad.mockRejectedValueOnce(new ApiError(400, "Validation failed"));
    await irAlResumen();
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Verifique los datos ingresados e inténtelo de nuevo."
    );
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Guardar propiedad" })).toBeEnabled();
  });

  it("avisa cuando la sesión venció", async () => {
    mockCrearPropiedad.mockRejectedValueOnce(new AuthExpiredError());
    await irAlResumen();
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Su sesión expiró. Vuelva a iniciar sesión para guardar la propiedad."
    );
  });

  it("en el prototipo no llama al backend", async () => {
    render(<CreationWizard kind="property" demo onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Departamento/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    expect(mockCrearPropiedad).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });
});

// --- día de vencimiento: el backend lo amplió de 1–10 a 1–28 (263576d) ---

describe("asistente de contrato · día de vencimiento", () => {
  async function irAlPasoDelDia() {
    mockPropiedades.mockResolvedValueOnce([MITRE]);
    mockInquilinos.mockResolvedValueOnce([DIEGO]);
    mockContratos.mockResolvedValueOnce([]);
    render(<CreationWizard kind="contract" onClose={onClose} onComplete={onComplete} />);
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
  }

  it("deja elegir un día más allá del 10", async () => {
    await irAlPasoDelDia();
    const sumar = screen.getByRole("button", { name: /Sumar/ });
    for (let i = 0; i < 14; i += 1) await userEvent.click(sumar);
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("no pasa del 28: más allá no hay día en febrero", async () => {
    await irAlPasoDelDia();
    const sumar = screen.getByRole("button", { name: /Sumar/ });
    for (let i = 0; i < 40; i += 1) await userEvent.click(sumar);
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(sumar).toBeDisabled();
  });

  it("los chips siguen fijando los días habituales", async () => {
    await irAlPasoDelDia();
    await userEvent.click(screen.getByRole("button", { name: "Día 10" }));
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("guarda el día elegido", async () => {
    mockCrearContrato.mockResolvedValueOnce({} as never);
    await irAlPasoDelDia();
    await userEvent.click(screen.getByRole("button", { name: "Día 5" }));
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "400000");
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.type(screen.getByLabelText("Fecha de inicio"), "2026-09-01");
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.type(screen.getByLabelText(/Porcentaje/), "8");
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
    expect(mockCrearContrato).toHaveBeenCalledWith(expect.objectContaining({ dueDay: 5 }));
  });
});
